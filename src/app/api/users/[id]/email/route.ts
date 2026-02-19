import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { eq, and, or, gt, desc } from "drizzle-orm";
import { user, emailVerificationCode } from "@/db/schema";
import {
  generateVerificationCode,
  hashCode,
  EXPIRY_MS,
  RESEND_COOLDOWN_MS,
} from "@/lib/verification-code";
import { sendEmailChangeVerificationEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// PATCH /api/users/[id]/email — Initiate email change
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: targetUserId } = await params;

  // Own user only — no admin override
  if (session.user.id !== targetUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email: newEmail } = body as { email?: string };

  if (!newEmail || typeof newEmail !== "string" || !newEmail.trim()) {
    return NextResponse.json(
      { error: "email is required" },
      { status: 400 },
    );
  }

  const trimmedEmail = newEmail.trim().toLowerCase();

  // Fetch current user
  const [currentUser] = await db
    .select({
      email: user.email,
      pendingEmail: user.pendingEmail,
    })
    .from(user)
    .where(eq(user.id, targetUserId));

  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (currentUser.email === trimmedEmail) {
    return NextResponse.json(
      { error: "New email must be different from current email" },
      { status: 400 },
    );
  }

  // Check uniqueness: not used by another user's email or pendingEmail
  const existing = await db.query.user.findFirst({
    where: and(
      or(eq(user.email, trimmedEmail), eq(user.pendingEmail, trimmedEmail)),
    ),
  });

  if (existing && existing.id !== targetUserId) {
    return NextResponse.json(
      { error: "Email is already in use" },
      { status: 409 },
    );
  }

  // Rate-limit: reject if code for this email was sent < 60s ago
  const now = new Date();
  const cooldownThreshold = new Date(now.getTime() - RESEND_COOLDOWN_MS);
  const recentCode = await db.query.emailVerificationCode.findFirst({
    where: and(
      eq(emailVerificationCode.email, trimmedEmail),
      gt(emailVerificationCode.createdAt, cooldownThreshold),
    ),
    orderBy: [desc(emailVerificationCode.createdAt)],
  });

  if (recentCode) {
    return NextResponse.json(
      { error: "Please wait before requesting a new code" },
      { status: 429 },
    );
  }

  // Write pendingEmail
  await db
    .update(user)
    .set({ pendingEmail: trimmedEmail, updatedAt: new Date() })
    .where(eq(user.id, targetUserId));

  // Clean up old codes for both old pending and new email
  if (currentUser.pendingEmail && currentUser.pendingEmail !== trimmedEmail) {
    await db
      .delete(emailVerificationCode)
      .where(eq(emailVerificationCode.email, currentUser.pendingEmail));
  }
  await db
    .delete(emailVerificationCode)
    .where(eq(emailVerificationCode.email, trimmedEmail));

  // Generate code, insert, send
  const code = generateVerificationCode();
  await db.insert(emailVerificationCode).values({
    id: crypto.randomUUID(),
    email: trimmedEmail,
    codeHash: hashCode(code),
    attempts: 0,
    createdAt: now,
    expiresAt: new Date(now.getTime() + EXPIRY_MS),
  });

  await sendEmailChangeVerificationEmail({ email: trimmedEmail, code });

  return NextResponse.json({ sent: true });
}
