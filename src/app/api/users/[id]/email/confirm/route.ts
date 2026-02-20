import { and, desc, eq, gt, or } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailVerificationCode, user } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { encrypt, hmacHash, safeDecrypt } from "@/lib/crypto";
import { hashCode, MAX_ATTEMPTS } from "@/lib/verification-code";

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
		return NextResponse.json({ error: "code is required" }, { status: 400 });
	}

	// Fetch user to get pendingEmail (decrypt)
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

	const pendingEmail = safeDecrypt(currentUser.pendingEmail);
	const pendingHmac = hmacHash(pendingEmail);

	// Re-check uniqueness via blind indexes (race condition guard)
	const conflict = await db.query.user.findFirst({
		where: and(
			or(
				eq(user.emailHash, pendingHmac),
				eq(user.pendingEmailHash, pendingHmac),
			),
		),
	});

	if (conflict && conflict.id !== targetUserId) {
		return NextResponse.json(
			{ error: "Email is already in use" },
			{ status: 409 },
		);
	}

	// Find latest unexpired code via blind index
	const now = new Date();
	const record = await db.query.emailVerificationCode.findFirst({
		where: and(
			eq(emailVerificationCode.emailHash, pendingHmac),
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

	// Success — commit email change (encrypted + hash)
	const oldEmail = safeDecrypt(currentUser.email);
	await db
		.update(user)
		.set({
			email: encrypt(pendingEmail),
			emailHash: hmacHash(pendingEmail),
			pendingEmail: null,
			pendingEmailHash: null,
			emailVerified: true,
			updatedAt: new Date(),
		})
		.where(eq(user.id, targetUserId));

	// Clean up codes
	await db
		.delete(emailVerificationCode)
		.where(eq(emailVerificationCode.emailHash, pendingHmac));

	// Audit log
	await logAuditEvent({
		action: "email.change",
		actorId: targetUserId,
		targetId: targetUserId,
		detail: { oldEmail, newEmail: pendingEmail },
	});

	return NextResponse.json({ success: true, email: pendingEmail });
}
