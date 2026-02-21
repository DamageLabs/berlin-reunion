import {
	type AnyColumn,
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	like,
	or,
	type SQL,
} from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { safeDecrypt } from "@/lib/crypto";

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

// GET /api/admin/users — Paginated user list (moderator+ only)
export async function GET(request: NextRequest) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const currentRole = (session.user as { role?: string }).role ?? "user";
	if (currentRole !== "admin" && currentRole !== "moderator") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const url = new URL(request.url);
	const page = Math.max(0, Number(url.searchParams.get("page") ?? "0"));
	const limit = Math.min(
		100,
		Math.max(1, Number(url.searchParams.get("limit") ?? "20")),
	);

	const sortableColumns: Record<string, AnyColumn> = {
		name: user.name,
		email: user.email,
		username: user.username,
		location: user.location,
		role: user.role,
		verified: user.emailVerified,
		status: user.banned,
	};

	const sortParam = url.searchParams.get("sort") ?? "name";
	const dirParam = url.searchParams.get("dir") ?? "asc";
	const sortColumn = sortableColumns[sortParam] ?? sortableColumns.name;
	const dirFn = dirParam === "desc" ? desc : asc;

	// Search & filter params
	const search = url.searchParams.get("search")?.trim();
	const roleFilter = url.searchParams.get("role");
	const verifiedFilter = url.searchParams.get("verified");
	const statusFilter = url.searchParams.get("status");

	const conditions: SQL[] = [];
	if (search) {
		const pattern = `%${search}%`;
		const searchCondition = or(
			like(user.name, pattern),
			like(user.username, pattern),
		);
		if (searchCondition) conditions.push(searchCondition);
	}
	if (roleFilter && ["user", "moderator", "admin"].includes(roleFilter)) {
		conditions.push(eq(user.role, roleFilter));
	}
	if (verifiedFilter === "true") conditions.push(eq(user.emailVerified, true));
	if (verifiedFilter === "false")
		conditions.push(eq(user.emailVerified, false));
	if (statusFilter === "active") conditions.push(eq(user.banned, false));
	if (statusFilter === "banned") conditions.push(eq(user.banned, true));
	if (statusFilter === "locked")
		conditions.push(gt(user.lockedUntil, new Date()));

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [users, [total]] = await Promise.all([
		db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				emailVerified: user.emailVerified,
				image: user.image,
				createdAt: user.createdAt,
				username: user.username,
				role: user.role,
				banned: user.banned,
				banReason: user.banReason,
				banExpires: user.banExpires,
				location: user.location,
				failedLoginAttempts: user.failedLoginAttempts,
				lockedUntil: user.lockedUntil,
			})
			.from(user)
			.where(where)
			.orderBy(dirFn(sortColumn))
			.limit(limit)
			.offset(page * limit),
		db.select({ value: count() }).from(user).where(where),
	]);

	return NextResponse.json({
		users: users.map((u) => ({
			...u,
			email: u.email ? safeDecrypt(u.email) : u.email,
		})),
		total: total?.value ?? 0,
		page,
		limit,
	});
}
