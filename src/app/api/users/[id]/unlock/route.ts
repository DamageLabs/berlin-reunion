import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";

const ROLE_HIERARCHY: Record<string, number> = {
	user: 0,
	moderator: 1,
	admin: 2,
};

type Params = { params: Promise<{ id: string }> };

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

// POST /api/users/[id]/unlock — Unlock a locked account (moderator+ only)
export async function POST(_request: NextRequest, { params }: Params) {
	const currentSession = await getSession();
	if (!currentSession) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const callerRole = (currentSession.user as { role?: string }).role ?? "user";
	const callerLevel = ROLE_HIERARCHY[callerRole] ?? 0;

	if (callerLevel < 1) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const { id: targetUserId } = await params;

	if (targetUserId === currentSession.user.id) {
		return NextResponse.json(
			{ error: "Cannot unlock yourself" },
			{ status: 403 },
		);
	}

	const [targetUser] = await db
		.select({ role: user.role })
		.from(user)
		.where(eq(user.id, targetUserId));

	if (!targetUser) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	const targetLevel = ROLE_HIERARCHY[targetUser.role ?? "user"] ?? 0;
	if (targetLevel >= callerLevel) {
		return NextResponse.json(
			{ error: "Cannot unlock a user with equal or higher role" },
			{ status: 403 },
		);
	}

	try {
		await db
			.update(user)
			.set({
				failedLoginAttempts: 0,
				lockedUntil: null,
				lastFailedLoginAt: null,
				updatedAt: new Date(),
			})
			.where(eq(user.id, targetUserId));

		await logAuditEvent({
			action: "user.unlock",
			actorId: currentSession.user.id,
			targetId: targetUserId,
		});

		return NextResponse.json({ success: true });
	} catch (err: unknown) {
		const message =
			err instanceof Error ? err.message : "Failed to unlock user";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
