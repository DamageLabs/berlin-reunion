import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";

// POST /api/clear-force-password-change — Clear flag after password change
export async function POST() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	await db
		.update(user)
		.set({ forcePasswordChange: false, updatedAt: new Date() })
		.where(eq(user.id, session.user.id));

	return NextResponse.json({ success: true });
}
