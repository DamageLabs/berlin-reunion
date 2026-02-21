import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { getBackupConfig, setBackupConfig } from "@/lib/backup-config";

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

function assertAdmin(session: Awaited<ReturnType<typeof getSession>>) {
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const role = (session.user as { role?: string }).role ?? "user";
	if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	return null;
}

// GET /api/admin/backups/config — Return current scheduler config
export async function GET() {
	const session = await getSession();
	const err = assertAdmin(session);
	if (err) return err;

	const config = getBackupConfig(db);
	return NextResponse.json(config);
}

// PUT /api/admin/backups/config — Update scheduler config
export async function PUT(request: Request) {
	const session = await getSession();
	const err = assertAdmin(session);
	if (err) return err;

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const data: Record<string, unknown> = {};

	for (const key of ["dailyEnabled", "weeklyEnabled", "monthlyEnabled"] as const) {
		if (key in body && typeof body[key] === "boolean") {
			data[key] = body[key];
		}
	}

	for (const key of ["dailyRetention", "weeklyRetention", "monthlyRetention"] as const) {
		if (key in body && typeof body[key] === "number") {
			data[key] = Math.max(1, Math.min(365, Math.floor(body[key] as number)));
		}
	}

	const config = setBackupConfig(db, data);
	return NextResponse.json(config);
}
