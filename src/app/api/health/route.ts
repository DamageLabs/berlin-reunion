import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  let dbStatus = "ok";
  try {
    db.run(sql`SELECT 1`);
  } catch {
    dbStatus = "error";
  }

  const status = dbStatus === "ok" ? "ok" : "degraded";
  return NextResponse.json(
    {
      status,
      service: "berlin-reunion",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
      },
    },
    { status: status === "ok" ? 200 : 503 }
  );
}
