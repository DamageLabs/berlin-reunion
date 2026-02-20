/**
 * E2E test database seeder.
 * Run via: npx tsx e2e/seed.ts
 *
 * Expects env vars to be set (ENCRYPTION_KEY, BLIND_INDEX_KEY, DATABASE_URL).
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { hashPassword } from "better-auth/crypto";
import {
	createHash,
	createHmac,
	randomBytes,
	createCipheriv,
} from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { user, account, inviteToken } from "../src/db/schema";

// ─── Crypto helpers ─────────────────────────────────────────────────────────

function encrypt(plaintext: string): string {
	const key = Buffer.from(process.env.ENCRYPTION_KEY!, "base64");
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
	const encrypted = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return [
		iv.toString("base64"),
		encrypted.toString("base64"),
		tag.toString("base64"),
	].join(":");
}

function hmacHash(value: string): string {
	return createHmac("sha256", Buffer.from(process.env.BLIND_INDEX_KEY!, "base64"))
		.update(value.toLowerCase().trim())
		.digest("hex");
}

// ─── DB connection ──────────────────────────────────────────────────────────

const url = process.env.DATABASE_URL ?? "file:./data/test-e2e.db";
const path = url.replace(/^file:/, "");
const sqlite = new Database(path);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite);

// ─── Seed helpers ───────────────────────────────────────────────────────────

async function seedUser(
	username: string,
	email: string,
	password: string,
	role: string,
	name: string,
): Promise<string> {
	const now = new Date();
	const userId = crypto.randomUUID();
	const hashedPassword = await hashPassword(password);

	db.insert(user)
		.values({
			id: userId,
			name,
			email: encrypt(email),
			emailHash: hmacHash(email),
			emailVerified: true,
			username,
			displayUsername: username,
			role,
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

	return userId;
}

function seedInvite(
	email: string,
	role: string,
	invitedByUserId: string,
): string {
	const token = crypto.randomUUID();
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

	db.insert(inviteToken)
		.values({
			id: crypto.randomUUID(),
			token: encrypt(token),
			tokenHash: hmacHash(token),
			email: encrypt(email),
			emailHash: hmacHash(email),
			invitedBy: invitedByUserId,
			role,
			used: false,
			createdAt: now,
			expiresAt,
		})
		.run();

	return token;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
	const adminId = await seedUser(
		"admin",
		"admin@test.com",
		"admin123",
		"admin",
		"Admin User",
	);

	await seedUser(
		"testuser",
		"testuser@test.com",
		"test1234",
		"user",
		"Test User",
	);

	await seedUser(
		"testmod",
		"testmod@test.com",
		"test1234",
		"moderator",
		"Test Moderator",
	);

	// Seed invite token for registration test
	const token = seedInvite("newuser@test.com", "user", adminId);

	// Write token to file for test specs to read
	writeFileSync(
		resolve(__dirname, "..", "data", "test-invite-token.txt"),
		token,
	);

	console.log("E2E seed complete.");
	sqlite.close();
}

main().catch((err) => {
	console.error("E2E seed failed:", err);
	process.exit(1);
});
