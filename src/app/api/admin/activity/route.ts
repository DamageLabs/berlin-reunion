import {
	aliasedTable,
	and,
	count,
	countDistinct,
	desc,
	eq,
	gte,
	gt,
} from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLog, session, user } from "@/db/schema";
import { auth } from "@/lib/auth";

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

export async function GET() {
	const sess = await getSession();
	if (!sess) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const currentRole = (sess.user as { role?: string }).role ?? "user";
	if (currentRole !== "admin" && currentRole !== "moderator") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const now = new Date();
	const d7ago = new Date(now.getTime() - 7 * 86400000);
	const d30ago = new Date(now.getTime() - 30 * 86400000);
	const d84ago = new Date(now.getTime() - 84 * 86400000); // ~12 weeks

	const actorUser = aliasedTable(user, "actor");

	const [
		[totalMembers],
		[activeUsers30d],
		[newSignupsWeek],
		[newSignupsMonth],
		[failedLogins7d],
		[failedLogins30d],
		[lockedAccounts],
		[bannedAccounts],
		[activeSessions],
		signupTrendRaw,
		recentActivity,
	] = await Promise.all([
		db
			.select({ value: count() })
			.from(user)
			.where(eq(user.banned, false)),
		db
			.select({ value: countDistinct(auditLog.actorId) })
			.from(auditLog)
			.where(
				and(
					eq(auditLog.action, "login.success"),
					gte(auditLog.createdAt, d30ago),
				),
			),
		db
			.select({ value: count() })
			.from(user)
			.where(gte(user.createdAt, d7ago)),
		db
			.select({ value: count() })
			.from(user)
			.where(gte(user.createdAt, d30ago)),
		db
			.select({ value: count() })
			.from(auditLog)
			.where(
				and(
					eq(auditLog.action, "login.failure"),
					gte(auditLog.createdAt, d7ago),
				),
			),
		db
			.select({ value: count() })
			.from(auditLog)
			.where(
				and(
					eq(auditLog.action, "login.failure"),
					gte(auditLog.createdAt, d30ago),
				),
			),
		db
			.select({ value: count() })
			.from(user)
			.where(gt(user.lockedUntil, now)),
		db
			.select({ value: count() })
			.from(user)
			.where(eq(user.banned, true)),
		db
			.select({ value: count() })
			.from(session)
			.where(gt(session.expiresAt, now)),
		db
			.select({ createdAt: user.createdAt })
			.from(user)
			.where(gte(user.createdAt, d84ago)),
		db
			.select({
				id: auditLog.id,
				action: auditLog.action,
				actorId: auditLog.actorId,
				actorName: actorUser.name,
				createdAt: auditLog.createdAt,
			})
			.from(auditLog)
			.leftJoin(actorUser, eq(auditLog.actorId, actorUser.id))
			.orderBy(desc(auditLog.createdAt))
			.limit(20),
	]);

	// Group signups by week (Mon-Sun buckets going back 12 weeks)
	const signupTrend: { week: string; count: number }[] = [];
	const weekStart = new Date(d84ago);
	weekStart.setHours(0, 0, 0, 0);
	// Align to Monday
	const dayOfWeek = weekStart.getDay();
	const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
	weekStart.setDate(weekStart.getDate() + diff);

	for (let i = 0; i < 12; i++) {
		const start = new Date(weekStart.getTime() + i * 7 * 86400000);
		const end = new Date(start.getTime() + 7 * 86400000);
		const label = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
		const cnt = signupTrendRaw.filter(
			(u) => u.createdAt >= start && u.createdAt < end,
		).length;
		signupTrend.push({ week: label, count: cnt });
	}

	return NextResponse.json({
		totalMembers: totalMembers?.value ?? 0,
		activeUsers30d: activeUsers30d?.value ?? 0,
		newSignupsThisWeek: newSignupsWeek?.value ?? 0,
		newSignupsThisMonth: newSignupsMonth?.value ?? 0,
		failedLogins7d: failedLogins7d?.value ?? 0,
		failedLogins30d: failedLogins30d?.value ?? 0,
		lockedAccounts: lockedAccounts?.value ?? 0,
		bannedAccounts: bannedAccounts?.value ?? 0,
		activeSessions: activeSessions?.value ?? 0,
		signupTrend,
		recentActivity,
	});
}
