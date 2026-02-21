import { resolve } from "node:path";
import { readdirSync } from "node:fs";
import { exportBackup, type BackupType } from "./backup";
import { getBackupConfig, type BackupConfigData } from "./backup-config";

// biome-ignore lint/suspicious/noExplicitAny: accepts db with any schema type
type AnyDB = import("drizzle-orm/better-sqlite3").BetterSQLite3Database<any>;

const BACKUP_DIR = resolve(process.cwd(), "data/backups");
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/** Check if a backup already exists for the current period */
function hasBackupForPeriod(type: BackupType): boolean {
	const dir = resolve(BACKUP_DIR, type);
	let files: string[];
	try {
		files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
	} catch {
		return false;
	}

	if (files.length === 0) return false;

	// Parse timestamp from latest backup filename: backup-YYYY-MM-DDTHH-MM-SS-MMMZ.json
	const latest = files[files.length - 1];
	const match = latest.match(/backup-(\d{4})-(\d{2})-(\d{2})T/);
	if (!match) return false;

	const backupDate = new Date(`${match[1]}-${match[2]}-${match[3]}`);
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	if (type === "daily") {
		return backupDate >= today;
	}

	if (type === "weekly") {
		// Start of current week (Sunday)
		const weekStart = new Date(today);
		weekStart.setDate(today.getDate() - today.getDay());
		return backupDate >= weekStart;
	}

	if (type === "monthly") {
		// Start of current month
		const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
		return backupDate >= monthStart;
	}

	return false;
}

function runScheduledBackups(db: AnyDB): void {
	const config = getBackupConfig(db);
	const enabledMap: Record<string, boolean> = {
		daily: config.dailyEnabled,
		weekly: config.weeklyEnabled,
		monthly: config.monthlyEnabled,
	};
	const types: BackupType[] = ["daily", "weekly", "monthly"];

	for (const type of types) {
		if (!enabledMap[type]) continue;
		if (hasBackupForPeriod(type)) continue;

		try {
			const { filePath } = exportBackup(db, BACKUP_DIR, type, config);
			console.log(`[backup-scheduler] Created ${type} backup: ${filePath}`);
		} catch (err) {
			console.error(`[backup-scheduler] Failed to create ${type} backup:`, err);
		}
	}
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startBackupScheduler(db: AnyDB): void {
	if (intervalId) return; // already running

	// Run immediately on startup
	console.log("[backup-scheduler] Starting scheduled backup checks (hourly)");
	runScheduledBackups(db);

	// Then check every hour
	intervalId = setInterval(() => runScheduledBackups(db), CHECK_INTERVAL_MS);
}

export function stopBackupScheduler(): void {
	if (intervalId) {
		clearInterval(intervalId);
		intervalId = null;
	}
}
