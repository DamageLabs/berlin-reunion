import { and, asc, eq, like, or, type SQL } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { event, user } from "@/db/schema";
import { auth } from "@/lib/auth";

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

export async function GET(request: NextRequest) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const url = new URL(request.url);
	const q = url.searchParams.get("q")?.trim();
	const limit = Math.min(
		20,
		Math.max(1, Number(url.searchParams.get("limit") ?? "5")),
	);

	if (!q || q.length < 2) {
		return NextResponse.json(
			{ error: "Query must be at least 2 characters" },
			{ status: 400 },
		);
	}

	const pattern = `%${q}%`;
	const role = (session.user as { role?: string }).role ?? "user";

	// Member search: public, non-banned profiles matching name/username/location
	const memberConditions: SQL[] = [
		eq(user.isProfilePublic, true),
		eq(user.banned, false),
	];
	const memberSearch = or(
		like(user.name, pattern),
		like(user.username, pattern),
		like(user.location, pattern),
	);
	if (memberSearch) memberConditions.push(memberSearch);

	// Event search: LIKE on title/description/location
	const eventConditions: SQL[] = [];
	const eventSearch = or(
		like(event.title, pattern),
		like(event.description, pattern),
		like(event.location, pattern),
	);
	if (eventSearch) eventConditions.push(eventSearch);

	// Regular users only see public events
	if (role !== "admin" && role !== "moderator") {
		eventConditions.push(eq(event.visibility, "public"));
	}

	const [members, events] = await Promise.all([
		db
			.select({
				id: user.id,
				name: user.name,
				username: user.username,
				image: user.image,
				location: user.location,
				platoon: user.platoon,
			})
			.from(user)
			.where(and(...memberConditions))
			.orderBy(asc(user.name))
			.limit(limit),
		db
			.select({
				id: event.id,
				title: event.title,
				startAt: event.startAt,
				location: event.location,
				visibility: event.visibility,
			})
			.from(event)
			.where(and(...eventConditions))
			.orderBy(asc(event.startAt))
			.limit(limit),
	]);

	return NextResponse.json({ members, events });
}
