import { NextRequest, NextResponse } from "next/server";
import { eq, and, gt, desc } from "drizzle-orm";
import { db } from "@/db";
import { emailVerificationCode, user } from "@/db/schema";
import { hashCode, MAX_ATTEMPTS } from "@/lib/verification-code";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, code } = body as { email?: string; code?: string };

  if (!email || !code) {
    return NextResponse.json(
      { error: "email and code are required" },
      { status: 400 },
    );
  }

  // Find most recent unexpired code for this email
  const now = new Date();
  const record = await db.query.emailVerificationCode.findFirst({
    where: and(
      eq(emailVerificationCode.email, email),
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
  if (hashCode(code) !== record.codeHash) {
    const remaining = MAX_ATTEMPTS - (record.attempts + 1);
    return NextResponse.json(
      {
        error: "Invalid code",
        remainingAttempts: remaining,
      },
      { status: 400 },
    );
  }

  // Correct code — verify the user's email
  await db
    .update(user)
    .set({ emailVerified: true })
    .where(eq(user.email, email));

  // Clean up all codes for this email
  await db
    .delete(emailVerificationCode)
    .where(eq(emailVerificationCode.email, email));

  return NextResponse.json({ verified: true });
}
