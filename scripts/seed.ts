/**
 * Seed the initial admin user.
 *
 * Usage: npm run db:seed
 *
 * Idempotent — skips if admin already exists (matched by emailHash blind index).
 * Requires ENCRYPTION_KEY and BLIND_INDEX_KEY in .env.local (or environment).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local before importing crypto (needs ENCRYPTION_KEY / BLIND_INDEX_KEY)
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
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { hashPassword } from "better-auth/crypto";
import { user, account } from "../src/db/schema";
import { encrypt, hmacHash } from "../src/lib/crypto";

const ADMIN_EMAIL = "admin@berlin-reunion.com";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

async function seed() {
	const url = process.env.DATABASE_URL ?? "file:./data/berlin-reunion.db";
	const path = url.replace(/^file:/, "");
	const sqlite = new Database(path);
	sqlite.pragma("journal_mode = WAL");
	const db = drizzle(sqlite);

	// Check if admin already exists via blind index
	const emailHash = hmacHash(ADMIN_EMAIL);
	const existing = db
		.select()
		.from(user)
		.where(eq(user.emailHash, emailHash))
		.get();

	if (existing) {
		console.log("Admin user already exists, skipping seed.");
		sqlite.close();
		return;
	}

	const now = new Date();
	const userId = crypto.randomUUID();
	const hashedPassword = await hashPassword(ADMIN_PASSWORD);

	db.insert(user)
		.values({
			id: userId,
			name: "Admin",
			email: encrypt(ADMIN_EMAIL),
			emailHash,
			emailVerified: true,
			username: ADMIN_USERNAME,
			displayUsername: ADMIN_USERNAME,
			role: "admin",
			createdAt: now,
			updatedAt: now,
		})
		.run();

	db.insert(account)
		.values({
			id: crypto.randomUUID(),
			userId,
			accountId: userId,
			providerId: "credential",
			password: hashedPassword,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	console.log("Seeded admin user:", ADMIN_USERNAME);
	sqlite.close();
}

seed().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
