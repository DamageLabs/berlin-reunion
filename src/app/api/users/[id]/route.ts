import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
	user,
	auditLog,
	inviteToken,
	emailVerificationCode,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { safeDecrypt } from "@/lib/crypto";
import { logAuditEvent } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

// GET /api/users/[id] — Fetch public profile data (authenticated users)
export async function GET(_request: NextRequest, { params }: Params) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;

	const found = await db.query.user.findFirst({
		where: eq(user.id, id),
	});

	if (!found) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	const isOwner = session.user.id === found.id;
	const callerRole = (session.user as { role?: string }).role ?? "user";
	const isAdmin = callerRole === "admin";

	// Private profiles return 404 for non-owner, non-admin callers
	if (!found.isProfilePublic && !isOwner && !isAdmin) {
		return NextResponse.json({ error: "Profile not found" }, { status: 404 });
	}

	const response: Record<string, unknown> = {
		id: found.id,
		name: found.name,
		username: found.username,
		image: found.image,
		location: found.location,
		platoon: found.platoon,
		yearsServed: found.yearsServed,
		role: found.role,
		createdAt: found.createdAt,
		isProfilePublic: found.isProfilePublic ?? false,
	};

	if (isOwner || isAdmin) {
		response.email = safeDecrypt(found.email);
		response.pendingEmail = found.pendingEmail
			? safeDecrypt(found.pendingEmail)
			: null;
	}

	return NextResponse.json(response);
}

const ROLE_HIERARCHY: Record<string, number> = {
	user: 0,
	moderator: 1,
	admin: 2,
};

// DELETE /api/users/[id] — Permanently remove a user (admin-only)
export async function DELETE(_request: NextRequest, { params }: Params) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const callerRole = (session.user as { role?: string }).role ?? "user";
	const callerLevel = ROLE_HIERARCHY[callerRole] ?? 0;
	if (callerLevel < 2) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const { id: targetId } = await params;

	if (targetId === session.user.id) {
		return NextResponse.json(
			{ error: "Cannot delete your own account" },
			{ status: 403 },
		);
	}

	const target = await db.query.user.findFirst({
		where: eq(user.id, targetId),
		columns: { id: true, role: true, emailHash: true },
	});

	if (!target) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	const targetLevel = ROLE_HIERARCHY[target.role ?? "user"] ?? 0;
	if (targetLevel >= callerLevel) {
		return NextResponse.json(
			{ error: "Cannot delete a user with equal or higher role" },
			{ status: 403 },
		);
	}

	try {
		// Audit log BEFORE deletion so the record persists
		await logAuditEvent({
			action: "user.delete",
			actorId: session.user.id,
			targetId,
		});

		// Nullify audit log references to the target user
		await db
			.update(auditLog)
			.set({ actorId: null })
			.where(eq(auditLog.actorId, targetId));

		// Delete invite tokens created by this user (NOT NULL FK)
		await db.delete(inviteToken).where(eq(inviteToken.invitedBy, targetId));

		// Delete email verification codes for this user's email hash
		if (target.emailHash) {
			await db
				.delete(emailVerificationCode)
				.where(eq(emailVerificationCode.emailHash, target.emailHash));
		}

		// Delete the user row (sessions + accounts cascade automatically)
		await db.delete(user).where(eq(user.id, targetId));

		return NextResponse.json({ success: true });
	} catch {
		return NextResponse.json(
			{ error: "Failed to delete user" },
			{ status: 500 },
		);
	}
}
