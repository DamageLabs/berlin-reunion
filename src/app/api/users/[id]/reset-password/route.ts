import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { account, session, user } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { safeDecrypt } from "@/lib/crypto";
import { sendAdminPasswordResetEmail } from "@/lib/email";
import { PRINTABLE_RE } from "@/lib/password-rules";

const ROLE_HIERARCHY: Record<string, number> = {
	user: 0,
	moderator: 1,
	admin: 2,
};

const TEMP_PASSWORD_LENGTH = 16;
const TEMP_PASSWORD_CHARS =
	"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";

function generateTempPassword(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(TEMP_PASSWORD_LENGTH));
	return Array.from(bytes, (b) => TEMP_PASSWORD_CHARS[b % TEMP_PASSWORD_CHARS.length]).join("");
}

type Params = { params: Promise<{ id: string }> };

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

// POST /api/users/[id]/reset-password — Admin/moderator password reset
export async function POST(_request: NextRequest, { params }: Params) {
	const currentSession = await getSession();
	if (!currentSession) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const callerRole =
		(currentSession.user as { role?: string }).role ?? "user";
	const callerLevel = ROLE_HIERARCHY[callerRole] ?? 0;

	if (callerLevel < 1) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const { id: targetUserId } = await params;

	if (targetUserId === currentSession.user.id) {
		return NextResponse.json(
			{ error: "Cannot reset your own password" },
			{ status: 403 },
		);
	}

	// Look up target user
	const [targetUser] = await db
		.select({ role: user.role, email: user.email })
		.from(user)
		.where(eq(user.id, targetUserId));

	if (!targetUser) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	const targetLevel = ROLE_HIERARCHY[targetUser.role ?? "user"] ?? 0;
	if (targetLevel >= callerLevel) {
		return NextResponse.json(
			{ error: "Cannot reset password for a user with equal or higher role" },
			{ status: 403 },
		);
	}

	const tempPassword = generateTempPassword();

	if (!PRINTABLE_RE.test(tempPassword)) {
		return NextResponse.json(
			{ error: "Generated password failed validation" },
			{ status: 500 },
		);
	}

	try {
		// Hash the password using better-auth's scrypt implementation
		const hashedPassword = await hashPassword(tempPassword);

		// Update the credential account's password
		await db
			.update(account)
			.set({ password: hashedPassword, updatedAt: new Date() })
			.where(eq(account.userId, targetUserId));

		// Set forcePasswordChange flag
		await db
			.update(user)
			.set({ forcePasswordChange: true, updatedAt: new Date() })
			.where(eq(user.id, targetUserId));

		// Terminate all sessions for the target user
		await db.delete(session).where(eq(session.userId, targetUserId));

		// Send email notification with temp password
		const plaintextEmail = safeDecrypt(targetUser.email);
		await sendAdminPasswordResetEmail({
			email: plaintextEmail,
			tempPassword,
		});

		await logAuditEvent({
			action: "password.reset",
			actorId: currentSession.user.id,
			targetId: targetUserId,
		});

		return NextResponse.json({ success: true });
	} catch (err: unknown) {
		const message =
			err instanceof Error ? err.message : "Failed to reset password";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
