import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { verifyPassword } from "better-auth/crypto";
import { db } from "@/db";
import {
	user,
	account,
	auditLog,
	event,
	inviteToken,
	emailVerificationCode,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { safeDecrypt } from "@/lib/crypto";
import { logAuditEvent } from "@/lib/audit";
import { sendAccountDeletedEmail } from "@/lib/email";

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

// POST /api/account/delete — Self-delete account with password confirmation
export async function POST(request: Request) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json();
	const { password } = body as { password: string };

	if (!password) {
		return NextResponse.json(
			{ error: "Password is required" },
			{ status: 400 },
		);
	}

	const userId = session.user.id;

	// Fetch the user's credential account to verify password
	const credentialAccount = await db.query.account.findFirst({
		where: eq(account.userId, userId),
		columns: { password: true },
	});

	if (!credentialAccount?.password) {
		return NextResponse.json(
			{ error: "No password credential found" },
			{ status: 400 },
		);
	}

	const isValid = await verifyPassword({
		hash: credentialAccount.password,
		password,
	});

	if (!isValid) {
		return NextResponse.json(
			{ error: "Incorrect password" },
			{ status: 403 },
		);
	}

	// Fetch user details before deletion (need email and name for confirmation)
	const target = await db.query.user.findFirst({
		where: eq(user.id, userId),
		columns: { id: true, email: true, emailHash: true, name: true },
	});

	if (!target) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	try {
		// 1. Audit log BEFORE deletion
		await logAuditEvent({
			action: "user.delete",
			actorId: userId,
			targetId: userId,
			detail: { selfDelete: true },
		});

		// 2. Nullify actorId in audit logs referencing this user
		await db
			.update(auditLog)
			.set({ actorId: null })
			.where(eq(auditLog.actorId, userId));

		// 3. Nullify createdBy/updatedBy on events (preserve community events)
		await db
			.update(event)
			.set({ createdBy: null })
			.where(eq(event.createdBy, userId));
		await db
			.update(event)
			.set({ updatedBy: null })
			.where(eq(event.updatedBy, userId));

		// 4. Delete invite tokens created by this user
		await db.delete(inviteToken).where(eq(inviteToken.invitedBy, userId));

		// 5. Delete email verification codes for this user's email hash
		if (target.emailHash) {
			await db
				.delete(emailVerificationCode)
				.where(eq(emailVerificationCode.emailHash, target.emailHash));
		}

		// 6. Send confirmation email (best-effort, before deleting user row)
		try {
			const plainEmail = safeDecrypt(target.email);
			await sendAccountDeletedEmail({
				email: plainEmail,
				name: target.name,
			});
		} catch {
			// Email is best-effort — don't block deletion
		}

		// 7. Hard-delete user row (sessions + accounts cascade via FK)
		await db.delete(user).where(eq(user.id, userId));

		return NextResponse.json({ success: true });
	} catch {
		return NextResponse.json(
			{ error: "Failed to delete account" },
			{ status: 500 },
		);
	}
}
