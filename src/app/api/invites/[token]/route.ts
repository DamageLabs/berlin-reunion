import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { inviteToken } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";

type Params = { params: Promise<{ token: string }> };

function findInvite(token: string) {
  return db.query.inviteToken.findFirst({
    where: eq(inviteToken.token, token),
  });
}

// GET /api/invites/[token] — Validate invite (public)
export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params;
  const invite = await findInvite(token);

  if (!invite) {
    return NextResponse.json(
      { error: "Invite not found" },
      { status: 404 },
    );
  }

  if (invite.used) {
    return NextResponse.json(
      { error: "Invite has already been used" },
      { status: 410 },
    );
  }

  if (new Date() > invite.expiresAt) {
    return NextResponse.json(
      { error: "Invite has expired" },
      { status: 410 },
    );
  }

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
  });
}

// DELETE /api/invites/[token] — Revoke a pending invite (moderator+ only)
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? "user";
  if (role !== "admin" && role !== "moderator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { token } = await params;
  const invite = await findInvite(token);

  if (!invite) {
    return NextResponse.json(
      { error: "Invite not found" },
      { status: 404 },
    );
  }

  if (invite.used) {
    return NextResponse.json(
      { error: "Invite already used" },
      { status: 400 },
    );
  }

  if (new Date() > invite.expiresAt) {
    return NextResponse.json(
      { error: "Invite already expired" },
      { status: 400 },
    );
  }

  await db
    .update(inviteToken)
    .set({ used: true })
    .where(eq(inviteToken.id, invite.id));

  await logAuditEvent({
    action: "invite.revoke",
    actorId: session.user.id,
    targetEmail: invite.email ?? undefined,
    detail: { token, role: invite.role },
  });

  return NextResponse.json({ success: true });
}
