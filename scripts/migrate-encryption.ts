/**
 * One-time data migration: encrypt existing plaintext fields and populate blind indexes.
 *
 * Usage: npx tsx scripts/migrate-encryption.ts
 *
 * Idempotent — already-encrypted values are detected and skipped.
 * Requires ENCRYPTION_KEY and BLIND_INDEX_KEY environment variables.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local (Next.js does this automatically but tsx does not)
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
import * as schema from "../src/db/schema";
import { encrypt, hmacHash, isEncrypted } from "../src/lib/crypto";

const url = process.env.DATABASE_URL ?? "file:./data/berlin-reunion.db";
const path = url.replace(/^file:/, "");
const sqlite = new Database(path);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

async function migrateTable(
	label: string,
	rows: { id: string; [k: string]: unknown }[],
	fields: { name: string; blindIndex: string | null }[],
	updateFn: (id: string, data: Record<string, unknown>) => void,
) {
	let migrated = 0;
	for (const row of rows) {
		const updates: Record<string, unknown> = {};
		let needsUpdate = false;

		for (const { name, blindIndex } of fields) {
			const value = row[name];
			if (value != null && typeof value === "string" && !isEncrypted(value)) {
				updates[name] = encrypt(value);
				if (blindIndex) updates[blindIndex] = hmacHash(value);
				needsUpdate = true;
			} else if (
				value != null &&
				typeof value === "string" &&
				isEncrypted(value) &&
				blindIndex
			) {
				// Already encrypted but missing blind index — compute it
				const hashCol = row[blindIndex];
				if (!hashCol) {
					// Can't compute hash from ciphertext without decrypting
					// Skip — this shouldn't happen in normal flow
				}
			}
		}

		if (needsUpdate) {
			updateFn(row.id, updates);
			migrated++;
		}
	}
	console.log(`  ${label}: ${migrated}/${rows.length} rows migrated`);
}

async function main() {
	console.log("Starting encryption migration...\n");

	// 1. User table: email, pendingEmail
	console.log("Migrating user table...");
	const users = await db.select().from(schema.user);
	await migrateTable(
		"user",
		users,
		[
			{ name: "email", blindIndex: "emailHash" },
			{ name: "pendingEmail", blindIndex: "pendingEmailHash" },
		],
		(id, data) => {
			db.update(schema.user).set(data).where(eq(schema.user.id, id)).run();
		},
	);

	// 2. Session table: token, ipAddress
	console.log("Migrating session table...");
	const sessions = await db.select().from(schema.session);
	await migrateTable(
		"session",
		sessions,
		[
			{ name: "token", blindIndex: "tokenHash" },
			{ name: "ipAddress", blindIndex: null },
		],
		(id, data) => {
			db.update(schema.session)
				.set(data)
				.where(eq(schema.session.id, id))
				.run();
		},
	);

	// 3. Verification table: value
	console.log("Migrating verification table...");
	const verifications = await db.select().from(schema.verification);
	await migrateTable(
		"verification",
		verifications,
		[{ name: "value", blindIndex: null }],
		(id, data) => {
			db.update(schema.verification)
				.set(data)
				.where(eq(schema.verification.id, id))
				.run();
		},
	);

	// 4. InviteToken table: token, email
	console.log("Migrating inviteToken table...");
	const invites = await db.select().from(schema.inviteToken);
	await migrateTable(
		"inviteToken",
		invites,
		[
			{ name: "token", blindIndex: "tokenHash" },
			{ name: "email", blindIndex: "emailHash" },
		],
		(id, data) => {
			db.update(schema.inviteToken)
				.set(data)
				.where(eq(schema.inviteToken.id, id))
				.run();
		},
	);

	// 5. EmailVerificationCode table: email
	console.log("Migrating emailVerificationCode table...");
	const codes = await db.select().from(schema.emailVerificationCode);
	await migrateTable(
		"emailVerificationCode",
		codes,
		[{ name: "email", blindIndex: "emailHash" }],
		(id, data) => {
			db.update(schema.emailVerificationCode)
				.set(data)
				.where(eq(schema.emailVerificationCode.id, id))
				.run();
		},
	);

	// 6. AuditLog table: targetEmail
	console.log("Migrating auditLog table...");
	const logs = await db.select().from(schema.auditLog);
	await migrateTable(
		"auditLog",
		logs,
		[{ name: "targetEmail", blindIndex: null }],
		(id, data) => {
			db.update(schema.auditLog)
				.set(data)
				.where(eq(schema.auditLog.id, id))
				.run();
		},
	);

	console.log("\nEncryption migration complete.");
	sqlite.close();
}

main().catch((err) => {
	console.error("Migration failed:", err);
	sqlite.close();
	process.exit(1);
});
