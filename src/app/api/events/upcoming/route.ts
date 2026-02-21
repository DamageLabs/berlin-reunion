import { lte } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { event } from "@/db/schema";
import { auth } from "@/lib/auth";
import { expandEvents } from "@/lib/recurrence";

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

// GET /api/events/upcoming — Next 5 events within 30 days
export async function GET() {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const role = (session.user as { role?: string }).role ?? "user";

	const now = new Date();
	const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

	const rows = await db
		.select()
		.from(event)
		.where(lte(event.startAt, thirtyDaysLater));

	// Filter out private events for regular users
	const visibleRows = role === "admin" || role === "moderator"
		? rows
		: rows.filter((r) => r.visibility === "public");

	const expanded = expandEvents(visibleRows, now, thirtyDaysLater);

	return NextResponse.json({ events: expanded.slice(0, 5) });
}
