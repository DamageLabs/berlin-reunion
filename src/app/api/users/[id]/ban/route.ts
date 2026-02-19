import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { user, session } from "@/db/schema";
import { eq } from "drizzle-orm";

const ROLE_HIERARCHY: Record<string, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
};

type Params = { params: Promise<{ id: string }> };

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// POST /api/users/[id]/ban — Ban a user (moderator+ only)
export async function POST(request: NextRequest, { params }: Params) {
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
      { error: "Cannot ban yourself" },
      { status: 403 },
    );
  }

  // Look up target user to check their role
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
      { error: "Cannot ban a user with equal or higher role" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { reason, expiresInDays } = body as {
    reason?: string;
    expiresInDays?: number;
  };

  const banExpires =
    expiresInDays != null
      ? new Date(Date.now() + expiresInDays * 86400000)
      : null;

  try {
    await db
      .update(user)
      .set({
        banned: true,
        banReason: reason ?? null,
        banExpires: banExpires,
        updatedAt: new Date(),
      })
      .where(eq(user.id, targetUserId));

    // Terminate all sessions for the banned user
    await db.delete(session).where(eq(session.userId, targetUserId));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to ban user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/users/[id]/ban — Unban a user (moderator+ only)
export async function DELETE(_request: NextRequest, { params }: Params) {
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
      { error: "Cannot unban yourself" },
      { status: 403 },
    );
  }

  try {
    await db
      .update(user)
      .set({
        banned: false,
        banReason: null,
        banExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, targetUserId));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to unban user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
