/**
 * Seed 7 diverse test users for development/QA.
 *
 * Usage: npm run db:seed:users
 *
 * Idempotent — existing users (matched by emailHash blind index) are skipped.
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

interface TestUser {
	name: string;
	username: string;
	email: string;
	role: "user" | "moderator" | "admin";
	password: string;
	location: string;
	platoon: string;
	yearsServed: string;
}

const TEST_USERS: TestUser[] = [
	{
		name: "Hans Mueller",
		username: "hans",
		email: "hans@test.com",
		role: "user",
		password: "test1234",
		location: "Berlin",
		platoon: "Alpha Co",
		yearsServed: "1985-1989",
	},
	{
		name: "Maria Schmidt",
		username: "maria",
		email: "maria@test.com",
		role: "user",
		password: "test1234",
		location: "Frankfurt",
		platoon: "Bravo Co",
		yearsServed: "1986-1990",
	},
	{
		name: "Klaus Weber",
		username: "klaus",
		email: "klaus@test.com",
		role: "moderator",
		password: "test1234",
		location: "Munich",
		platoon: "Charlie Co",
		yearsServed: "1984-1988",
	},
	{
		name: "Petra Fischer",
		username: "petra",
		email: "petra@test.com",
		role: "user",
		password: "test1234",
		location: "Hamburg",
		platoon: "Delta Co",
		yearsServed: "1987-1991",
	},
	{
		name: "Wolfgang Braun",
		username: "wolfgang",
		email: "wolfgang@test.com",
		role: "user",
		password: "test1234",
		location: "Stuttgart",
		platoon: "Alpha Co",
		yearsServed: "1983-1987",
	},
	{
		name: "Ingrid Hoffman",
		username: "ingrid",
		email: "ingrid@test.com",
		role: "moderator",
		password: "test1234",
		location: "Cologne",
		platoon: "Bravo Co",
		yearsServed: "1985-1989",
	},
	{
		name: "Dieter Schwarz",
		username: "dieter",
		email: "dieter@test.com",
		role: "admin",
		password: "test1234",
		location: "Düsseldorf",
		platoon: "Charlie Co",
		yearsServed: "1984-1988",
	},
];

async function seedUsers() {
	const url = process.env.DATABASE_URL ?? "file:./data/berlin-reunion.db";
	const path = url.replace(/^file:/, "");
	const sqlite = new Database(path);
	sqlite.pragma("journal_mode = WAL");
	const db = drizzle(sqlite);

	let created = 0;
	let skipped = 0;

	for (const tu of TEST_USERS) {
		const emailHash = hmacHash(tu.email);

		// Check if user already exists via blind index
		const existing = db
			.select()
			.from(user)
			.where(eq(user.emailHash, emailHash))
			.get();

		if (existing) {
			console.log(`  skip: ${tu.username} (already exists)`);
			skipped++;
			continue;
		}

		const now = new Date();
		const userId = crypto.randomUUID();
		const hashedPassword = await hashPassword(tu.password);

		db.insert(user)
			.values({
				id: userId,
				name: tu.name,
				email: encrypt(tu.email),
				emailHash,
				emailVerified: true,
				username: tu.username,
				displayUsername: tu.username,
				role: tu.role,
				location: tu.location,
				platoon: tu.platoon,
				yearsServed: tu.yearsServed,
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

		console.log(`  created: ${tu.username} (${tu.role})`);
		created++;
	}

	console.log(`\nDone — ${created} created, ${skipped} skipped.`);
	sqlite.close();
}

seedUsers().catch((err) => {
	console.error("Seed users failed:", err);
	process.exit(1);
});
