import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { user } from "@/db/schema";

type Params = { params: Promise<{ id: string }> };

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// GET /api/users/[id] — Fetch public profile data (authenticated users)
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const found = await db.query.user.findFirst({
    where: eq(user.id, id),
  });

  if (!found) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: found.id,
    name: found.name,
    username: found.username,
    image: found.image,
    location: found.location,
    platoon: found.platoon,
    yearsServed: found.yearsServed,
    role: found.role,
    createdAt: found.createdAt,
  });
}
