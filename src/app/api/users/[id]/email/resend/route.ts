import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { eq, and, gt, desc } from "drizzle-orm";
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

// POST /api/users/[id]/email/resend — Resend verification code for pending email
export async function POST(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: targetUserId } = await params;

  if (session.user.id !== targetUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch user to get pendingEmail
  const [currentUser] = await db
    .select({ pendingEmail: user.pendingEmail })
    .from(user)
    .where(eq(user.id, targetUserId));

  if (!currentUser || !currentUser.pendingEmail) {
    return NextResponse.json(
      { error: "No pending email change" },
      { status: 409 },
    );
  }

  const pendingEmail = currentUser.pendingEmail;

  // Rate-limit: reject if code was sent < 60s ago
  const now = new Date();
  const cooldownThreshold = new Date(now.getTime() - RESEND_COOLDOWN_MS);
  const recentCode = await db.query.emailVerificationCode.findFirst({
    where: and(
      eq(emailVerificationCode.email, pendingEmail),
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

  // Delete old codes, generate new one, insert, send
  await db
    .delete(emailVerificationCode)
    .where(eq(emailVerificationCode.email, pendingEmail));

  const code = generateVerificationCode();
  await db.insert(emailVerificationCode).values({
    id: crypto.randomUUID(),
    email: pendingEmail,
    codeHash: hashCode(code),
    attempts: 0,
    createdAt: now,
    expiresAt: new Date(now.getTime() + EXPIRY_MS),
  });

  await sendEmailChangeVerificationEmail({ email: pendingEmail, code });

  return NextResponse.json({ sent: true });
}
