import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { encrypt, hmacHash } from "@/lib/crypto";
import { geocodeLocation } from "@/lib/geocode";

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

  // latitude / longitude — nullable numbers, must be valid ranges
  if ("latitude" in body) {
    if (body.latitude === null) {
      updates.latitude = null;
    } else if (typeof body.latitude !== "number" || body.latitude < -90 || body.latitude > 90) {
      return NextResponse.json(
        { error: "latitude must be a number between -90 and 90" },
        { status: 400 },
      );
    } else {
      updates.latitude = body.latitude;
    }
  }

  if ("longitude" in body) {
    if (body.longitude === null) {
      updates.longitude = null;
    } else if (typeof body.longitude !== "number" || body.longitude < -180 || body.longitude > 180) {
      return NextResponse.json(
        { error: "longitude must be a number between -180 and 180" },
        { status: 400 },
      );
    } else {
      updates.longitude = body.longitude;
    }
  }

  // phone — optional, strip to digits (keep leading +), require 10+ digits or empty to clear
  if ("phone" in body) {
    if (typeof body.phone !== "string") {
      return NextResponse.json(
        { error: "phone must be a string" },
        { status: 400 },
      );
    }
    const raw = body.phone.trim();
    if (raw === "") {
      updates.phone = null;
      updates.phoneHash = null;
    } else {
      const digits = raw.replace(/[^\d+]/g, "");
      const digitCount = digits.replace(/\+/g, "").length;
      if (digitCount < 10) {
        return NextResponse.json(
          { error: "Phone number must have at least 10 digits" },
          { status: 400 },
        );
      }
      updates.phone = encrypt(digits);
      updates.phoneHash = hmacHash(digits);
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  // Auto-geocode when location changes and no explicit lat/lng provided
  if ("location" in updates && !("latitude" in updates)) {
    const loc = updates.location as string;
    if (loc) {
      const coords = await geocodeLocation(loc);
      if (coords) {
        updates.latitude = coords.latitude;
        updates.longitude = coords.longitude;
      }
    } else {
      updates.latitude = null;
      updates.longitude = null;
    }
  }

  await db.update(user).set(updates).where(eq(user.id, targetUserId));

  return NextResponse.json(updates);
}
