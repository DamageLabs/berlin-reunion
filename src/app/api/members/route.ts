import { and, asc, count, eq, like, or, type SQL } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

// GET /api/members — Paginated public member directory (authenticated users)
export async function GET(request: NextRequest) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const url = new URL(request.url);
	const page = Math.max(0, Number(url.searchParams.get("page") ?? "0"));
	const limit = Math.min(
		100,
		Math.max(1, Number(url.searchParams.get("limit") ?? "20")),
	);
	const search = url.searchParams.get("search")?.trim();
	const platoonFilter = url.searchParams.get("platoon")?.trim();

	// Only show public, non-banned profiles
	const conditions: SQL[] = [
		eq(user.isProfilePublic, true),
		eq(user.banned, false),
	];

	if (search) {
		const pattern = `%${search}%`;
		const searchCondition = or(
			like(user.name, pattern),
			like(user.username, pattern),
			like(user.location, pattern),
		);
		if (searchCondition) conditions.push(searchCondition);
	}

	if (platoonFilter) {
		conditions.push(eq(user.platoon, platoonFilter));
	}

	const where = and(...conditions);

	const [members, [total]] = await Promise.all([
		db
			.select({
				id: user.id,
				name: user.name,
				username: user.username,
				image: user.image,
				location: user.location,
				platoon: user.platoon,
				yearsServed: user.yearsServed,
			})
			.from(user)
			.where(where)
			.orderBy(asc(user.name))
			.limit(limit)
			.offset(page * limit),
		db.select({ value: count() }).from(user).where(where),
	]);

	return NextResponse.json({
		members,
		total: total?.value ?? 0,
		page,
		limit,
	});
}
