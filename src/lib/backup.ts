import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
// biome-ignore lint/suspicious/noExplicitAny: accepts db with any schema type
type AnyDB = import("drizzle-orm/better-sqlite3").BetterSQLite3Database<any>;
import {
	user,
	session,
	account,
	verification,
	rateLimit,
	emailVerificationCode,
	auditLog,
	event,
	survey,
	surveyQuestion,
	surveyResponse,
	surveyAnswer,
	inviteToken,
	backupConfig,
} from "@/db/schema";
import type { BackupConfigData } from "./backup-config";

export type BackupType = "daily" | "weekly" | "monthly" | "pre-restore";

const DEFAULT_RETENTION: Record<string, number> = {
	daily: 7,
	weekly: 4,
	monthly: 12,
	"pre-restore": 5,
};

// Tables in FK-safe insert order (parents before children)
const TABLES = [
	{ name: "user", table: user },
	{ name: "session", table: session },
	{ name: "account", table: account },
	{ name: "verification", table: verification },
	{ name: "rateLimit", table: rateLimit },
	{ name: "emailVerificationCode", table: emailVerificationCode },
	{ name: "auditLog", table: auditLog },
	{ name: "event", table: event },
	{ name: "survey", table: survey },
	{ name: "surveyQuestion", table: surveyQuestion },
	{ name: "surveyResponse", table: surveyResponse },
	{ name: "surveyAnswer", table: surveyAnswer },
	{ name: "inviteToken", table: inviteToken },
	{ name: "backupConfig", table: backupConfig },
] as const;

export interface BackupMetadata {
	version: number;
	createdAt: string;
	tables: Record<string, { count: number }>;
}

export interface BackupEnvelope {
	version: number;
	createdAt: string;
	tables: Record<string, { count: number; rows: Record<string, unknown>[] }>;
}

export function getBackupDir(baseDir: string, type: BackupType): string {
	return join(baseDir, type);
}

function formatTimestamp(): string {
	return new Date().toISOString().replace(/[:.]/g, "-");
}

export function exportBackup(
	db: AnyDB,
	baseDir: string,
	type: BackupType,
	config?: BackupConfigData,
): { filePath: string; envelope: BackupEnvelope } {
	const dir = getBackupDir(baseDir, type);
	mkdirSync(dir, { recursive: true });

	const envelope: BackupEnvelope = {
		version: 1,
		createdAt: new Date().toISOString(),
		tables: {},
	};

	for (const { name, table } of TABLES) {
		const rows = db.select().from(table).all();
		envelope.tables[name] = { count: rows.length, rows };
	}

	const filename = `backup-${formatTimestamp()}.json`;
	const filePath = join(dir, filename);
	writeFileSync(filePath, JSON.stringify(envelope, null, 2));

	const retentionMap: Record<string, number> = config
		? {
				daily: config.dailyRetention,
				weekly: config.weeklyRetention,
				monthly: config.monthlyRetention,
			}
		: {};
	pruneBackups(dir, retentionMap[type] ?? DEFAULT_RETENTION[type] ?? 7);

	return { filePath, envelope };
}

export function pruneBackups(dir: string, keep: number): void {
	let files: string[];
	try {
		files = readdirSync(dir)
			.filter((f) => f.endsWith(".json"))
			.sort();
	} catch {
		return;
	}

	if (files.length <= keep) return;

	const toRemove = files.slice(0, files.length - keep);
	for (const f of toRemove) {
		rmSync(join(dir, f), { force: true });
	}
}

export interface BackupFileInfo {
	filename: string;
	type: string;
	size: number;
	createdAt: string;
}

export function listBackups(baseDir: string): BackupFileInfo[] {
	const results: BackupFileInfo[] = [];

	for (const type of ["daily", "weekly", "monthly", "pre-restore"]) {
		const dir = join(baseDir, type);
		let files: string[];
		try {
			files = readdirSync(dir).filter((f) => f.endsWith(".json"));
		} catch {
			continue;
		}

		for (const filename of files) {
			const filePath = join(dir, filename);
			const stat = statSync(filePath);
			results.push({
				filename,
				type,
				size: stat.size,
				createdAt: stat.mtime.toISOString(),
			});
		}
	}

	results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	return results;
}

/** Table names expected in a valid backup envelope */
export const EXPECTED_TABLES = TABLES.map((t) => t.name);

/** FK-safe deletion order (children before parents) */
export const DELETE_ORDER = [
	"surveyAnswer",
	"surveyResponse",
	"surveyQuestion",
	"survey",
	"session",
	"account",
	"emailVerificationCode",
	"verification",
	"rateLimit",
	"inviteToken",
	"auditLog",
	"event",
	"backupConfig",
	"user",
] as const;

/** FK-safe insert order (parents before children) */
export const INSERT_ORDER = TABLES.map((t) => t.name);

/** Map from table name to Drizzle table object */
export const TABLE_MAP: Record<string, (typeof TABLES)[number]["table"]> = {};
for (const { name, table } of TABLES) {
	TABLE_MAP[name] = table;
}

export function validateBackup(data: unknown): data is BackupEnvelope {
	if (!data || typeof data !== "object") return false;
	const obj = data as Record<string, unknown>;
	if (obj.version !== 1) return false;
	if (typeof obj.createdAt !== "string") return false;
	if (!obj.tables || typeof obj.tables !== "object") return false;
	const tables = obj.tables as Record<string, unknown>;
	for (const name of EXPECTED_TABLES) {
		if (!(name in tables)) return false;
		const t = tables[name] as Record<string, unknown>;
		if (!Array.isArray(t.rows)) return false;
	}
	return true;
}

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

export function restoreFromBackup(
	db: AnyDB,
	baseDir: string,
	backupData: BackupEnvelope,
): { safetyPath: string; tablesRestored: Record<string, number> } {
	// Create pre-restore safety backup
	const { filePath: safetyPath } = exportBackup(db, baseDir, "pre-restore");

	// Access raw better-sqlite3 instance for pragma control
	const sqlite = (db as unknown as { $client: { pragma: (s: string) => void; exec: (s: string) => void } }).$client;

	// Disable FK checks before transaction
	sqlite.pragma("foreign_keys = OFF");
	sqlite.exec("BEGIN");

	try {
		// Delete all rows in FK-safe order
		for (const name of DELETE_ORDER) {
			db.delete(TABLE_MAP[name]).run();
		}

		// Insert rows in FK-safe order
		const tablesRestored: Record<string, number> = {};
		for (const name of INSERT_ORDER) {
			const tableData = backupData.tables[name];
			if (!tableData || tableData.rows.length === 0) {
				tablesRestored[name] = 0;
				continue;
			}
			for (const row of tableData.rows) {
				const converted = convertDates(row as Record<string, unknown>);
				// biome-ignore lint/suspicious/noExplicitAny: backup rows are untyped JSON
				db.insert(TABLE_MAP[name]).values(converted as any).run();
			}
			tablesRestored[name] = tableData.rows.length;
		}

		// Log restore in audit log
		db.insert(auditLog)
			.values({
				id: crypto.randomUUID(),
				action: "db.restore",
				actorId: null,
				targetId: null,
				targetEmail: null,
				detail: JSON.stringify({
					backupDate: backupData.createdAt,
					safetyBackup: safetyPath,
				}),
				createdAt: new Date(),
			})
			.run();

		sqlite.exec("COMMIT");
		sqlite.pragma("foreign_keys = ON");

		return { safetyPath, tablesRestored };
	} catch (err) {
		sqlite.exec("ROLLBACK");
		sqlite.pragma("foreign_keys = ON");
		throw err;
	}
}

export function readAndValidateBackup(
	baseDir: string,
	type: string,
	filename: string,
): BackupEnvelope | null {
	if (filename.includes("..") || filename.includes("/")) return null;
	const filePath = join(baseDir, type, filename);
	if (!existsSync(filePath)) return null;

	try {
		const raw = readFileSync(filePath, "utf-8");
		const data = JSON.parse(raw);
		if (!validateBackup(data)) return null;
		return data;
	} catch {
		return null;
	}
}

export function deleteBackupFile(
	baseDir: string,
	type: string,
	filename: string,
): boolean {
	if (filename.includes("..") || filename.includes("/")) return false;
	const filePath = join(baseDir, type, filename);
	if (!existsSync(filePath)) return false;
	rmSync(filePath, { force: true });
	return true;
}
