import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailVerificationCode, user } from "@/db/schema";
import { encrypt, hmacHash } from "@/lib/crypto";
import { sendVerificationCodeEmail } from "@/lib/email";
import {
	EXPIRY_MS,
	generateVerificationCode,
	hashCode,
	RESEND_COOLDOWN_MS,
} from "@/lib/verification-code";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { email } = body as { email?: string };

	if (!email) {
		return NextResponse.json({ error: "email is required" }, { status: 400 });
	}

	// Verify email belongs to an unverified user (via blind index)
	// Return silent success for unknown emails to prevent enumeration
	const emailHmac = hmacHash(email);
	const existingUser = await db.query.user.findFirst({
		where: eq(user.emailHash, emailHmac),
	});

	if (!existingUser) {
		return NextResponse.json({ sent: true });
	}

	if (existingUser.emailVerified) {
		return NextResponse.json(
			{ error: "Email is already verified" },
			{ status: 400 },
		);
	}

	// Rate limit: reject if last code was created < 60s ago
	const lastCode = await db.query.emailVerificationCode.findFirst({
		where: eq(emailVerificationCode.emailHash, emailHmac),
		orderBy: [desc(emailVerificationCode.createdAt)],
	});

	if (lastCode) {
		const elapsed = Date.now() - lastCode.createdAt.getTime();
		if (elapsed < RESEND_COOLDOWN_MS) {
			const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
			return NextResponse.json(
				{ error: `Please wait ${waitSeconds}s before requesting a new code` },
				{ status: 429 },
			);
		}
	}

	// Delete all existing codes for this email
	await db
		.delete(emailVerificationCode)
		.where(eq(emailVerificationCode.emailHash, emailHmac));

	// Generate new code (encrypt email on insert)
	const code = generateVerificationCode();
	const now = new Date();
	await db.insert(emailVerificationCode).values({
		id: crypto.randomUUID(),
		email: encrypt(email),
		emailHash: emailHmac,
		codeHash: hashCode(code),
		attempts: 0,
		createdAt: now,
		expiresAt: new Date(now.getTime() + EXPIRY_MS),
	});

	await sendVerificationCodeEmail({ email, code });

	return NextResponse.json({ sent: true });
}
