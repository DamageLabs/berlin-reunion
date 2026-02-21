export async function register() {
	// Only run on the server (not during build or on the client)
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { db } = await import("@/db");
		const { startBackupScheduler } = await import("@/lib/backup-scheduler");
		startBackupScheduler(db);
	}
}
