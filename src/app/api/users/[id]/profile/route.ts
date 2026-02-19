import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// PATCH /api/users/[id]/profile — Update profile fields (own user or admin)
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: targetUserId } = await params;
  const currentRole = (session.user as { role?: string }).role ?? "user";
  const isOwnProfile = session.user.id === targetUserId;

  if (!isOwnProfile && currentRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  for (const field of ["location", "platoon", "yearsServed"] as const) {
    if (field in body) {
      if (typeof body[field] !== "string") {
        return NextResponse.json(
          { error: `${field} must be a string` },
          { status: 400 },
        );
      }
      updates[field] = (body[field] as string).trim();
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  await db.update(user).set(updates).where(eq(user.id, targetUserId));

  return NextResponse.json(updates);
}
