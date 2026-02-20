import { and, desc, eq, gt, or } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailVerificationCode, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { encrypt, hmacHash, safeDecrypt } from "@/lib/crypto";
import { sendEmailChangeVerificationEmail } from "@/lib/email";
import {
	EXPIRY_MS,
	generateVerificationCode,
	hashCode,
	RESEND_COOLDOWN_MS,
} from "@/lib/verification-code";

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
		return NextResponse.json({ error: "email is required" }, { status: 400 });
	}

	const trimmedEmail = newEmail.trim().toLowerCase();

	// Fetch current user (decrypt email fields)
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

	const currentEmail = safeDecrypt(currentUser.email);
	const currentPending = currentUser.pendingEmail
		? safeDecrypt(currentUser.pendingEmail)
		: null;

	if (currentEmail === trimmedEmail) {
		return NextResponse.json(
			{ error: "New email must be different from current email" },
			{ status: 400 },
		);
	}

	// Check uniqueness via blind indexes
	const emailHmac = hmacHash(trimmedEmail);
	const existing = await db.query.user.findFirst({
		where: and(
			or(eq(user.emailHash, emailHmac), eq(user.pendingEmailHash, emailHmac)),
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
			eq(emailVerificationCode.emailHash, emailHmac),
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

	// Write pendingEmail (encrypted + hash)
	await db
		.update(user)
		.set({
			pendingEmail: encrypt(trimmedEmail),
			pendingEmailHash: hmacHash(trimmedEmail),
			updatedAt: new Date(),
		})
		.where(eq(user.id, targetUserId));

	// Clean up old codes for both old pending and new email
	if (currentPending && currentPending !== trimmedEmail) {
		await db
			.delete(emailVerificationCode)
			.where(eq(emailVerificationCode.emailHash, hmacHash(currentPending)));
	}
	await db
		.delete(emailVerificationCode)
		.where(eq(emailVerificationCode.emailHash, emailHmac));

	// Generate code, insert (encrypted), send
	const code = generateVerificationCode();
	await db.insert(emailVerificationCode).values({
		id: crypto.randomUUID(),
		email: encrypt(trimmedEmail),
		emailHash: emailHmac,
		codeHash: hashCode(code),
		attempts: 0,
		createdAt: now,
		expiresAt: new Date(now.getTime() + EXPIRY_MS),
	});

	await sendEmailChangeVerificationEmail({ email: trimmedEmail, code });

	return NextResponse.json({ sent: true });
}
