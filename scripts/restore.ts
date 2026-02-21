/**
 * Restore the database from a JSON backup file.
 *
 * Usage:
 *   npx tsx scripts/restore.ts <path-to-backup.json>
 *
 * Before restoring, a pre-restore safety backup is created automatically.
 * All existing data is replaced with the backup contents.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local before any imports that need env vars
try {
	const envPath = resolve(process.cwd(), ".env.local");
	const envContent = readFileSync(envPath, "utf-8");
	for (const line of envContent.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx).trim();
		const value = trimmed.slice(eqIdx + 1).trim();
		if (!process.env[key]) process.env[key] = value;
	}
} catch {
	// .env.local not found — env vars must be set externally
}

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import {
	exportBackup,
	type BackupEnvelope,
	EXPECTED_TABLES,
	DELETE_ORDER,
	INSERT_ORDER,
	TABLE_MAP,
} from "../src/lib/backup";
import { auditLog } from "../src/db/schema";

function validate(data: unknown): data is BackupEnvelope {
	if (!data || typeof data !== "object") return false;
	const obj = data as Record<string, unknown>;
	if (obj.version !== 1) return false;
	if (typeof obj.createdAt !== "string") return false;
	if (!obj.tables || typeof obj.tables !== "object") return false;

	const tables = obj.tables as Record<string, unknown>;
	for (const name of EXPECTED_TABLES) {
		if (!(name in tables)) {
			console.error(`Missing table in backup: ${name}`);
			return false;
		}
		const t = tables[name] as Record<string, unknown>;
		if (!Array.isArray(t.rows)) {
			console.error(`Invalid rows for table ${name}`);
			return false;
		}
	}
	return true;
}

function main() {
	const backupPath = process.argv[2];
	if (!backupPath) {
		console.error("Usage: npx tsx scripts/restore.ts <path-to-backup.json>");
		process.exit(1);
	}

	const resolvedPath = resolve(process.cwd(), backupPath);
	let raw: string;
	try {
		raw = readFileSync(resolvedPath, "utf-8");
	} catch {
		console.error(`Cannot read file: ${resolvedPath}`);
		process.exit(1);
	}

	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		console.error("Invalid JSON in backup file.");
		process.exit(1);
	}

	if (!validate(data)) {
		console.error("Backup validation failed. Aborting.");
		process.exit(1);
	}

	const url = process.env.DATABASE_URL ?? "file:./data/berlin-reunion.db";
	const path = url.replace(/^file:/, "");
	const baseDir = resolve(process.cwd(), "data/backups");

	const sqlite = new Database(path);
	sqlite.pragma("journal_mode = WAL");
	const db = drizzle(sqlite);

	// Create pre-restore safety backup
	console.log("Creating pre-restore safety backup...");
	const { filePath: safetyPath } = exportBackup(db, baseDir, "pre-restore");
	console.log(`Safety backup: ${safetyPath}`);

	console.log(`Restoring from: ${resolvedPath}`);
	console.log(`Backup date: ${data.createdAt}`);

	// Disable FK checks before transaction (PRAGMA can't change inside a transaction)
	sqlite.pragma("foreign_keys = OFF");

	// Use a transaction for atomicity
	sqlite.exec("BEGIN");
	try {

		// Delete all rows in FK-safe order
		for (const name of DELETE_ORDER) {
			const table = TABLE_MAP[name];
			db.delete(table).run();
		}

		// Insert rows in FK-safe order
		for (const name of INSERT_ORDER) {
			const tableData = data.tables[name];
			if (!tableData || tableData.rows.length === 0) continue;

			const table = TABLE_MAP[name];
			for (const row of tableData.rows) {
				// Convert ISO date strings back to Date objects for timestamp columns
				const converted = convertDates(row as Record<string, unknown>);
				// biome-ignore lint/suspicious/noExplicitAny: backup rows are untyped JSON
				db.insert(table).values(converted as any).run();
			}
			console.log(`  Restored ${name}: ${tableData.rows.length} rows`);
		}

		// Log the restore action
		db.insert(auditLog)
			.values({
				id: crypto.randomUUID(),
				action: "db.restore",
				actorId: null,
				targetId: null,
				targetEmail: null,
				detail: JSON.stringify({
					source: resolvedPath,
					backupDate: data.createdAt,
				}),
				createdAt: new Date(),
			})
			.run();

		sqlite.exec("COMMIT");
		sqlite.pragma("foreign_keys = ON");
		console.log("Restore complete. Audit log entry added.");
	} catch (err) {
		sqlite.exec("ROLLBACK");
		sqlite.pragma("foreign_keys = ON");
		console.error("Restore failed, rolled back:", err);
		process.exit(1);
	} finally {
		sqlite.close();
	}
}

/**
 * Convert string values that look like ISO timestamps back to Date objects.
 * Drizzle timestamp columns expect Date objects for insert.
 */
function convertDates(row: Record<string, unknown>): Record<string, unknown> {
	const result = { ...row };
	for (const [key, value] of Object.entries(result)) {
		if (
			typeof value === "string" &&
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)
		) {
			result[key] = new Date(value);
		}
	}
	return result;
}

main();
