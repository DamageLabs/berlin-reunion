import { and, desc, eq, gt } from "drizzle-orm";
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

	// Fetch user to get pendingEmail (decrypt)
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

	const pendingEmail = safeDecrypt(currentUser.pendingEmail);
	const pendingHmac = hmacHash(pendingEmail);

	// Rate-limit: reject if code was sent < 60s ago
	const now = new Date();
	const cooldownThreshold = new Date(now.getTime() - RESEND_COOLDOWN_MS);
	const recentCode = await db.query.emailVerificationCode.findFirst({
		where: and(
			eq(emailVerificationCode.emailHash, pendingHmac),
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

	// Delete old codes, generate new one, insert (encrypted), send
	await db
		.delete(emailVerificationCode)
		.where(eq(emailVerificationCode.emailHash, pendingHmac));

	const code = generateVerificationCode();
	await db.insert(emailVerificationCode).values({
		id: crypto.randomUUID(),
		email: encrypt(pendingEmail),
		emailHash: pendingHmac,
		codeHash: hashCode(code),
		attempts: 0,
		createdAt: now,
		expiresAt: new Date(now.getTime() + EXPIRY_MS),
	});

	await sendEmailChangeVerificationEmail({ email: pendingEmail, code });

	return NextResponse.json({ sent: true });
}
