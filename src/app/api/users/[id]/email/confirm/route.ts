import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { eq, and, or, gt, desc } from "drizzle-orm";
import { user, emailVerificationCode } from "@/db/schema";
import { hashCode, MAX_ATTEMPTS } from "@/lib/verification-code";
import { logAuditEvent } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// POST /api/users/[id]/email/confirm — Verify code + commit email change
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: targetUserId } = await params;

  if (session.user.id !== targetUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { code } = body as { code?: string };

  if (!code || typeof code !== "string" || !code.trim()) {
    return NextResponse.json(
      { error: "code is required" },
      { status: 400 },
    );
  }

  // Fetch user to get pendingEmail
  const [currentUser] = await db
    .select({
      email: user.email,
      pendingEmail: user.pendingEmail,
    })
    .from(user)
    .where(eq(user.id, targetUserId));

  if (!currentUser || !currentUser.pendingEmail) {
    return NextResponse.json(
      { error: "No pending email change" },
      { status: 409 },
    );
  }

  const pendingEmail = currentUser.pendingEmail;

  // Re-check uniqueness (race condition guard)
  const conflict = await db.query.user.findFirst({
    where: and(
      or(eq(user.email, pendingEmail), eq(user.pendingEmail, pendingEmail)),
    ),
  });

  if (conflict && conflict.id !== targetUserId) {
    return NextResponse.json(
      { error: "Email is already in use" },
      { status: 409 },
    );
  }

  // Find latest unexpired code
  const now = new Date();
  const record = await db.query.emailVerificationCode.findFirst({
    where: and(
      eq(emailVerificationCode.email, pendingEmail),
      gt(emailVerificationCode.expiresAt, now),
    ),
    orderBy: [desc(emailVerificationCode.createdAt)],
  });

  if (!record) {
    return NextResponse.json(
      { error: "No valid verification code found. Please request a new one." },
      { status: 404 },
    );
  }

  // Check max attempts
  if (record.attempts >= MAX_ATTEMPTS) {
    await db
      .delete(emailVerificationCode)
      .where(eq(emailVerificationCode.id, record.id));
    return NextResponse.json(
      { error: "Too many attempts. Please request a new code." },
      { status: 429 },
    );
  }

  // Increment attempts
  await db
    .update(emailVerificationCode)
    .set({ attempts: record.attempts + 1 })
    .where(eq(emailVerificationCode.id, record.id));

  // Compare hashes
  if (hashCode(code.trim()) !== record.codeHash) {
    const remaining = MAX_ATTEMPTS - (record.attempts + 1);
    return NextResponse.json(
      { error: "Invalid code", remainingAttempts: remaining },
      { status: 400 },
    );
  }

  // Success — commit email change
  const oldEmail = currentUser.email;
  await db
    .update(user)
    .set({
      email: pendingEmail,
      pendingEmail: null,
      emailVerified: true,
      updatedAt: new Date(),
    })
    .where(eq(user.id, targetUserId));

  // Clean up codes
  await db
    .delete(emailVerificationCode)
    .where(eq(emailVerificationCode.email, pendingEmail));

  // Audit log
  await logAuditEvent({
    action: "email.change",
    actorId: targetUserId,
    targetId: targetUserId,
    detail: { oldEmail, newEmail: pendingEmail },
  });

  return NextResponse.json({ success: true, email: pendingEmail });
}
