import { readFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

function loadEnvTest() {
	const envPath = resolve(__dirname, "..", ".env.test");
	const envContent = readFileSync(envPath, "utf-8");
	const env: Record<string, string> = {};
	for (const line of envContent.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx).trim();
		const value = trimmed.slice(eqIdx + 1).trim();
		process.env[key] = value;
		env[key] = value;
	}
	return env;
}

export default async function globalSetup() {
	// 1. Load .env.test into process.env
	const testEnv = loadEnvTest();
	const cwd = resolve(__dirname, "..");
	const env = { ...process.env, ...testEnv };

	// 2. Ensure data directory exists
	const dataDir = resolve(cwd, "data");
	if (!existsSync(dataDir)) {
		mkdirSync(dataDir, { recursive: true });
	}

	// 3. Remove stale test DB to start fresh
	const dbPath = resolve(dataDir, "test-e2e.db");
	for (const suffix of ["", "-shm", "-wal"]) {
		const f = dbPath + suffix;
		if (existsSync(f)) unlinkSync(f);
	}

	// 4. Push schema to test DB
	execSync("npx drizzle-kit push --force", {
		cwd,
		env: { ...env, DRIZZLE_DATABASE_URL: "./data/test-e2e.db" },
		stdio: "pipe",
	});

	// 5. Seed test data
	execSync("npx tsx e2e/seed.ts", {
		cwd,
		env,
		stdio: "inherit",
	});
}
