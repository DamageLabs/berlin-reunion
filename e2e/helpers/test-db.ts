import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { createHash, createHmac, randomBytes, createCipheriv } from "node:crypto";
import {
	user,
	account,
	auditLog,
	emailVerificationCode,
	inviteToken,
	rateLimit,
	session,
	verification,
} from "../../src/db/schema";

// Load .env.test if env vars aren't already set
if (!process.env.ENCRYPTION_KEY) {
	try {
		const envPath = resolve(__dirname, "..", "..", ".env.test");
		const content = readFileSync(envPath, "utf-8");
		for (const line of content.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			const eqIdx = trimmed.indexOf("=");
			if (eqIdx === -1) continue;
			const key = trimmed.slice(0, eqIdx).trim();
			const value = trimmed.slice(eqIdx + 1).trim();
			if (!process.env[key]) process.env[key] = value;
		}
	} catch {
		// .env.test not found
	}
}

// ─── Crypto helpers (mirror src/lib/crypto.ts and src/lib/verification-code.ts) ─

function getEncryptionKey(): Buffer {
	return Buffer.from(process.env.ENCRYPTION_KEY!, "base64");
}

function getBlindIndexKey(): Buffer {
	return Buffer.from(process.env.BLIND_INDEX_KEY!, "base64");
}

export function encrypt(plaintext: string): string {
	const key = getEncryptionKey();
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
	const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return [iv.toString("base64"), encrypted.toString("base64"), tag.toString("base64")].join(":");
}

export function hmacHash(value: string): string {
	return createHmac("sha256", getBlindIndexKey())
		.update(value.toLowerCase().trim())
		.digest("hex");
}

export function hashCode(code: string): string {
	return createHash("sha256").update(code.toUpperCase()).digest("hex");
}

// ─── DB connection ──────────────────────────────────────────────────────────

function getDb() {
	const url = process.env.DATABASE_URL ?? "file:./data/test-e2e.db";
	const path = url.replace(/^file:/, "");
	const sqlite = new Database(path);
	sqlite.pragma("journal_mode = WAL");
	return { db: drizzle(sqlite), sqlite };
}

// ─── Seed helpers ───────────────────────────────────────────────────────────

export async function seedUser(
	username: string,
	email: string,
	password: string,
	role: string,
	opts?: { emailVerified?: boolean; name?: string },
) {
	const { hashPassword } = await import("better-auth/crypto");
	const { db, sqlite } = getDb();
	const now = new Date();
	const userId = crypto.randomUUID();
	const hashedPassword = await hashPassword(password);

	db.insert(user)
		.values({
			id: userId,
			name: opts?.name ?? username,
			email: encrypt(email),
			emailHash: hmacHash(email),
			emailVerified: opts?.emailVerified ?? true,
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

	sqlite.close();
	return userId;
}

export function seedVerificationCode(email: string, knownCode: string) {
	const { db, sqlite } = getDb();
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

	db.insert(emailVerificationCode)
		.values({
			id: crypto.randomUUID(),
			email: encrypt(email),
			emailHash: hmacHash(email),
			codeHash: hashCode(knownCode),
			attempts: 0,
			createdAt: now,
			expiresAt,
		})
		.run();

	sqlite.close();
}

export function seedInvite(
	email: string,
	role: string,
	invitedByUserId: string,
): string {
	const { db, sqlite } = getDb();
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

	sqlite.close();
	return token;
}

export function getUserByUsername(username: string) {
	const { db, sqlite } = getDb();
	const result = db.select().from(user).where(eq(user.username, username)).get();
	sqlite.close();
	return result;
}

export function setEmailVerified(email: string) {
	const { db, sqlite } = getDb();
	db.update(user)
		.set({ emailVerified: true })
		.where(eq(user.emailHash, hmacHash(email)))
		.run();
	sqlite.close();
}

export function cleanupUser(email: string) {
	const { db, sqlite } = getDb();
	const emailHash = hmacHash(email);
	const found = db.select().from(user).where(eq(user.emailHash, emailHash)).get();

	if (found) {
		db.delete(session).where(eq(session.userId, found.id)).run();
		db.delete(account).where(eq(account.userId, found.id)).run();
		db.delete(auditLog).where(eq(auditLog.actorId, found.id)).run();
		db.delete(verification).where(eq(verification.identifier, email)).run();
		db.delete(user).where(eq(user.id, found.id)).run();
	}

	db.delete(emailVerificationCode)
		.where(eq(emailVerificationCode.emailHash, emailHash))
		.run();

	sqlite.close();
}

export function cleanupInviteByEmail(email: string) {
	const { db, sqlite } = getDb();
	db.delete(inviteToken).where(eq(inviteToken.emailHash, hmacHash(email))).run();
	sqlite.close();
}

export function setUserBanned(username: string, banned: boolean) {
	const { db, sqlite } = getDb();
	db.update(user)
		.set({ banned, banReason: banned ? "test ban" : null, banExpires: null })
		.where(eq(user.username, username))
		.run();
	sqlite.close();
}

export function setUserRole(username: string, role: string) {
	const { db, sqlite } = getDb();
	db.update(user).set({ role }).where(eq(user.username, username)).run();
	sqlite.close();
}

export function clearRateLimits() {
	const { db, sqlite } = getDb();
	db.delete(rateLimit).run();
	sqlite.close();
}
