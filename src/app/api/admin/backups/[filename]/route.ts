import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
	readAndValidateBackup,
	restoreFromBackup,
	deleteBackupFile,
} from "@/lib/backup";

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

const BACKUP_DIR = resolve(process.cwd(), "data/backups");

type Params = { params: Promise<{ filename: string }> };

async function requireAdmin() {
	const session = await getSession();
	if (!session) return { error: "Unauthorized", status: 401 } as const;
	const role = (session.user as { role?: string }).role ?? "user";
	if (role !== "admin") return { error: "Forbidden", status: 403 } as const;
	return { session } as const;
}

// GET /api/admin/backups/[filename]?type=daily — Download a backup file (admin-only)
export async function GET(request: NextRequest, { params }: Params) {
	const result = await requireAdmin();
	if ("error" in result) {
		return NextResponse.json(
			{ error: result.error },
			{ status: result.status },
		);
	}

	const { filename } = await params;
	const type = request.nextUrl.searchParams.get("type") ?? "daily";

	// Prevent path traversal
	if (filename.includes("..") || filename.includes("/")) {
		return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
	}

	const filePath = join(BACKUP_DIR, type, filename);
	if (!existsSync(filePath)) {
		return NextResponse.json({ error: "Backup not found" }, { status: 404 });
	}

	const content = readFileSync(filePath, "utf-8");
	return new NextResponse(content, {
		headers: {
			"Content-Type": "application/json",
			"Content-Disposition": `attachment; filename="${filename}"`,
		},
	});
}

// POST /api/admin/backups/[filename]?type=daily — Restore from a backup file (admin-only)
export async function POST(request: NextRequest, { params }: Params) {
	const result = await requireAdmin();
	if ("error" in result) {
		return NextResponse.json(
			{ error: result.error },
			{ status: result.status },
		);
	}

	const { filename } = await params;
	const type = request.nextUrl.searchParams.get("type") ?? "daily";

	const backupData = readAndValidateBackup(BACKUP_DIR, type, filename);
	if (!backupData) {
		return NextResponse.json(
			{ error: "Backup not found or invalid" },
			{ status: 404 },
		);
	}

	try {
		const { safetyPath, tablesRestored } = restoreFromBackup(
			db,
			BACKUP_DIR,
			backupData,
		);
		return NextResponse.json({ safetyPath, tablesRestored });
	} catch {
		return NextResponse.json({ error: "Restore failed" }, { status: 500 });
	}
}

// DELETE /api/admin/backups/[filename]?type=daily — Delete a backup file (admin-only)
export async function DELETE(request: NextRequest, { params }: Params) {
	const result = await requireAdmin();
	if ("error" in result) {
		return NextResponse.json(
			{ error: result.error },
			{ status: result.status },
		);
	}

	const { filename } = await params;
	const type = request.nextUrl.searchParams.get("type") ?? "daily";

	const deleted = deleteBackupFile(BACKUP_DIR, type, filename);
	if (!deleted) {
		return NextResponse.json(
			{ error: "Backup not found" },
			{ status: 404 },
		);
	}

	return NextResponse.json({ ok: true });
}
