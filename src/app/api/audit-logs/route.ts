import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { auditLog, user } from "@/db/schema";
import { eq, desc, and, count, aliasedTable } from "drizzle-orm";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// GET /api/audit-logs — List audit logs (admin only)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentRole = (session.user as { role?: string }).role ?? "user";
  if (currentRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(0, Number(url.searchParams.get("page") ?? "0"));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));
  const actionFilter = url.searchParams.get("action");
  const actorFilter = url.searchParams.get("actorId");

  const conditions = [];
  if (actionFilter) {
    conditions.push(eq(auditLog.action, actionFilter));
  }
  if (actorFilter) {
    conditions.push(eq(auditLog.actorId, actorFilter));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const actorUser = aliasedTable(user, "actor");
  const targetUser = aliasedTable(user, "target");

  const [logs, [total]] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        actorId: auditLog.actorId,
        actorName: actorUser.name,
        targetId: auditLog.targetId,
        targetName: targetUser.name,
        targetEmail: auditLog.targetEmail,
        detail: auditLog.detail,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .leftJoin(actorUser, eq(auditLog.actorId, actorUser.id))
      .leftJoin(targetUser, eq(auditLog.targetId, targetUser.id))
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(page * limit),
    db
      .select({ value: count() })
      .from(auditLog)
      .where(where),
  ]);

  return NextResponse.json({
    logs: logs.map((l) => ({
      ...l,
      detail: l.detail ? JSON.parse(l.detail) : null,
    })),
    total: total?.value ?? 0,
    page,
    limit,
  });
}
