import { eq } from "drizzle-orm";
import { backupConfig } from "@/db/schema";

// biome-ignore lint/suspicious/noExplicitAny: accepts db with any schema type
type AnyDB = import("drizzle-orm/better-sqlite3").BetterSQLite3Database<any>;

export interface BackupConfigData {
	dailyEnabled: boolean;
	weeklyEnabled: boolean;
	monthlyEnabled: boolean;
	dailyRetention: number;
	weeklyRetention: number;
	monthlyRetention: number;
}

const DEFAULTS: BackupConfigData = {
	dailyEnabled: true,
	weeklyEnabled: true,
	monthlyEnabled: true,
	dailyRetention: 7,
	weeklyRetention: 4,
	monthlyRetention: 12,
};

const CONFIG_ID = "default";

export function getBackupConfig(db: AnyDB): BackupConfigData {
	const row = db
		.select()
		.from(backupConfig)
		.where(eq(backupConfig.id, CONFIG_ID))
		.get();

	if (!row) return { ...DEFAULTS };

	return {
		dailyEnabled: row.dailyEnabled,
		weeklyEnabled: row.weeklyEnabled,
		monthlyEnabled: row.monthlyEnabled,
		dailyRetention: row.dailyRetention,
		weeklyRetention: row.weeklyRetention,
		monthlyRetention: row.monthlyRetention,
	};
}

export function setBackupConfig(
	db: AnyDB,
	data: Partial<BackupConfigData>,
): BackupConfigData {
	const current = getBackupConfig(db);
	const merged = { ...current, ...data };

	db.insert(backupConfig)
		.values({
			id: CONFIG_ID,
			...merged,
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: backupConfig.id,
			set: {
				...merged,
				updatedAt: new Date(),
			},
		})
		.run();

	return merged;
}
