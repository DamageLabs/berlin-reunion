import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailVerificationCode, inviteToken, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { encrypt, hmacHash, safeDecrypt } from "@/lib/crypto";
import { sendVerificationCodeEmail } from "@/lib/email";
import {
	EXPIRY_MS,
	generateVerificationCode,
	hashCode,
} from "@/lib/verification-code";

type Params = { params: Promise<{ token: string }> };

function findInvite(token: string) {
	return db.query.inviteToken.findFirst({
		where: eq(inviteToken.tokenHash, hmacHash(token)),
	});
}

// POST /api/invites/[token]/accept — Register via invite (public)
export async function POST(request: NextRequest, { params }: Params) {
	const { token } = await params;
	const invite = await findInvite(token);

	if (!invite) {
		return NextResponse.json({ error: "Invite not found" }, { status: 404 });
	}

	if (invite.used) {
		return NextResponse.json(
			{ error: "Invite has already been used" },
			{ status: 410 },
		);
	}

	if (new Date() > invite.expiresAt) {
		return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
	}

	const body = await request.json();
	const {
		name,
		username: uname,
		password,
	} = body as {
		name?: string;
		username?: string;
		password?: string;
	};

	if (!name || !uname || !password) {
		return NextResponse.json(
			{ error: "name, username, and password are required" },
			{ status: 400 },
		);
	}

	if (!invite.email) {
		return NextResponse.json(
			{ error: "Invite has no associated email" },
			{ status: 400 },
		);
	}

	// Decrypt the invite email for use in sign-up and verification
	const plaintextEmail = safeDecrypt(invite.email);

	// Create user through better-auth pipeline (adapter encrypts email)
	let signUpResult: { user?: { id: string; email: string; name: string } } | undefined;
	try {
		signUpResult = await auth.api.signUpEmail({
			body: {
				email: plaintextEmail,
				password,
				name,
				username: uname,
			},
		});
	} catch (err: unknown) {
		const message =
			err instanceof Error ? err.message : "Failed to create account";
		return NextResponse.json({ error: message }, { status: 400 });
	}

	if (!signUpResult?.user) {
		return NextResponse.json(
			{ error: "Failed to create account" },
			{ status: 500 },
		);
	}

	// Set invited role (do NOT auto-verify email)
	await db
		.update(user)
		.set({ role: invite.role })
		.where(eq(user.id, signUpResult.user.id));

	// Generate and store verification code (encrypt email)
	const code = generateVerificationCode();
	const now = new Date();
	await db.insert(emailVerificationCode).values({
		id: crypto.randomUUID(),
		email: encrypt(plaintextEmail),
		emailHash: hmacHash(plaintextEmail),
		codeHash: hashCode(code),
		attempts: 0,
		createdAt: now,
		expiresAt: new Date(now.getTime() + EXPIRY_MS),
	});

	// Send verification code email
	await sendVerificationCodeEmail({ email: plaintextEmail, code });

	// Mark invite as used
	await db
		.update(inviteToken)
		.set({ used: true })
		.where(eq(inviteToken.id, invite.id));

	return NextResponse.json(
		{
			user: {
				id: signUpResult.user.id,
				email: signUpResult.user.email,
				name: signUpResult.user.name,
				role: invite.role,
				emailVerified: false,
			},
		},
		{ status: 201 },
	);
}
