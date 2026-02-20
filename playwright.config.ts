import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.test so webServer inherits the right env vars
const envPath = resolve(__dirname, ".env.test");
const testEnv: Record<string, string> = {};
try {
	const content = readFileSync(envPath, "utf-8");
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx === -1) continue;
		testEnv[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
	}
} catch {
	// .env.test not found
}

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: 0,
	workers: 1,
	reporter: "html",
	use: {
		baseURL: "http://localhost:3051",
		trace: "on-first-retry",
	},
	globalSetup: "./e2e/global-setup.ts",
	webServer: {
		command: "npx next dev -p 3051",
		url: "http://localhost:3051",
		reuseExistingServer: !process.env.CI,
		env: { ...testEnv, NEXT_DIST_DIR: ".next-test" },
		timeout: 30_000,
	},
});
