import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

// PATCH /api/users/[id]/visibility — Toggle profile visibility (own user or admin)
export async function PATCH(request: NextRequest, { params }: Params) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id: targetUserId } = await params;
	const currentRole = (session.user as { role?: string }).role ?? "user";
	const isOwnProfile = session.user.id === targetUserId;

	if (!isOwnProfile && currentRole !== "admin") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const body = await request.json();

	if (typeof body.isPublic !== "boolean") {
		return NextResponse.json(
			{ error: "isPublic must be a boolean" },
			{ status: 400 },
		);
	}

	await db
		.update(user)
		.set({ isProfilePublic: body.isPublic })
		.where(eq(user.id, targetUserId));

	return NextResponse.json({
		message: `Profile is now ${body.isPublic ? "public" : "private"}`,
		isProfilePublic: body.isPublic,
	});
}
