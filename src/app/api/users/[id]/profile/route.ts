import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";

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

  // name — must be a non-empty string
  if ("name" in body) {
    if (typeof body.name !== "string") {
      return NextResponse.json(
        { error: "name must be a string" },
        { status: 400 },
      );
    }
    const trimmed = body.name.trim();
    if (trimmed.length === 0) {
      return NextResponse.json(
        { error: "name cannot be empty" },
        { status: 400 },
      );
    }
    updates.name = trimmed;
  }

  // username — must be a non-empty string, must be unique
  if ("username" in body) {
    if (typeof body.username !== "string") {
      return NextResponse.json(
        { error: "username must be a string" },
        { status: 400 },
      );
    }
    const trimmed = body.username.trim();
    if (trimmed.length === 0) {
      return NextResponse.json(
        { error: "username cannot be empty" },
        { status: 400 },
      );
    }
    // Check uniqueness (exclude the target user's own row)
    const existing = await db.query.user.findFirst({
      where: and(eq(user.username, trimmed), ne(user.id, targetUserId)),
    });
    if (existing) {
      return NextResponse.json(
        { error: "username is already taken" },
        { status: 409 },
      );
    }
    updates.username = trimmed;
  }

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
