import { resolve } from "node:path";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { exportBackup, listBackups } from "@/lib/backup";
import { logAuditEvent } from "@/lib/audit";

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

const BACKUP_DIR = resolve(process.cwd(), "data/backups");

// GET /api/admin/backups — List available backup files (admin-only)
export async function GET() {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const currentRole = (session.user as { role?: string }).role ?? "user";
	if (currentRole !== "admin") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const backups = listBackups(BACKUP_DIR);
	return NextResponse.json({ backups });
}

// POST /api/admin/backups — Trigger a new daily backup (admin-only)
export async function POST() {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const currentRole = (session.user as { role?: string }).role ?? "user";
	if (currentRole !== "admin") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	try {
		const { filePath, envelope } = exportBackup(db, BACKUP_DIR, "daily");

		await logAuditEvent({
			action: "db.backup",
			actorId: session.user.id,
			detail: {
				filePath,
				type: "daily",
				tables: Object.fromEntries(
					Object.entries(envelope.tables).map(([name, { count }]) => [
						name,
						count,
					]),
				),
			},
		});

		return NextResponse.json({
			success: true,
			filePath,
			createdAt: envelope.createdAt,
			tables: Object.fromEntries(
				Object.entries(envelope.tables).map(([name, { count }]) => [
					name,
					count,
				]),
			),
		});
	} catch {
		return NextResponse.json(
			{ error: "Backup failed" },
			{ status: 500 },
		);
	}
}
