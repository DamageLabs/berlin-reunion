import { count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

// GET /api/stats — Community stats (authenticated users)
export async function GET() {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const [result] = await db
		.select({ value: count() })
		.from(user)
		.where(eq(user.banned, false));

	return NextResponse.json({ memberCount: result?.value ?? 0 });
}
