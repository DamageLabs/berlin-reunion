import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAuditEvent } from "@/lib/audit";

const ALLOWED_ROLES = ["user", "moderator", "admin"];

type Params = { params: Promise<{ id: string }> };

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// POST /api/users/[id]/role — Change a user's role (admin only)
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentRole = (session.user as { role?: string }).role ?? "user";
  if (currentRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: targetUserId } = await params;

  // Prevent self-demotion
  if (targetUserId === session.user.id) {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { role } = body as { role?: string };

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    // Fetch old role before changing
    const [targetUser] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, targetUserId));
    const oldRole = targetUser?.role ?? "user";

    const result = await auth.api.setRole({
      headers: await headers(),
      body: { userId: targetUserId, role: role as "user" | "admin" },
    });

    await logAuditEvent({
      action: "role.change",
      actorId: session.user.id,
      targetId: targetUserId,
      detail: { oldRole, newRole: role },
    });

    return NextResponse.json({ user: result.user });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update role";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
