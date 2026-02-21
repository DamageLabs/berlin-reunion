/**
 * Export all database tables to a JSON backup file.
 *
 * Usage:
 *   npx tsx scripts/backup.ts               # daily backup (default)
 *   npx tsx scripts/backup.ts --type weekly  # weekly backup
 *   npx tsx scripts/backup.ts --type monthly # monthly backup
 *
 * Backups are stored in data/backups/{daily|weekly|monthly}/.
 * Old backups beyond the retention limit are automatically pruned.
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
import { exportBackup, type BackupType } from "../src/lib/backup";

function parseArgs(): BackupType {
	const typeIdx = process.argv.indexOf("--type");
	if (typeIdx !== -1 && process.argv[typeIdx + 1]) {
		const val = process.argv[typeIdx + 1];
		if (["daily", "weekly", "monthly"].includes(val)) {
			return val as BackupType;
		}
		console.error(`Invalid backup type: ${val}. Use daily, weekly, or monthly.`);
		process.exit(1);
	}
	return "daily";
}

function main() {
	const type = parseArgs();
	const url = process.env.DATABASE_URL ?? "file:./data/berlin-reunion.db";
	const path = url.replace(/^file:/, "");
	const baseDir = resolve(process.cwd(), "data/backups");

	const sqlite = new Database(path);
	sqlite.pragma("journal_mode = WAL");
	const db = drizzle(sqlite);

	try {
		const { filePath, envelope } = exportBackup(db, baseDir, type);

		const tableSummary = Object.entries(envelope.tables)
			.map(([name, { count }]) => `  ${name}: ${count} rows`)
			.join("\n");

		console.log(`Backup created: ${filePath}`);
		console.log(`Type: ${type}`);
		console.log(`Tables:\n${tableSummary}`);
	} finally {
		sqlite.close();
	}
}

main();
