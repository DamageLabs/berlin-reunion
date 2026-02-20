import {
	createCipheriv,
	createDecipheriv,
	createHmac,
	randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SEPARATOR = ":";

function getEncryptionKey(): Buffer {
	const raw = process.env.ENCRYPTION_KEY;
	if (!raw) {
		throw new Error(
			"ENCRYPTION_KEY environment variable is required for field encryption",
		);
	}
	const key = Buffer.from(raw, "base64");
	if (key.length !== 32) {
		throw new Error("ENCRYPTION_KEY must be a 32-byte base64-encoded string");
	}
	return key;
}

function getBlindIndexKey(): Buffer {
	const raw = process.env.BLIND_INDEX_KEY;
	if (!raw) {
		throw new Error(
			"BLIND_INDEX_KEY environment variable is required for blind indexes",
		);
	}
	return Buffer.from(raw, "base64");
}

/** AES-256-GCM encrypt. Returns `iv:ciphertext:authTag` base64-encoded. */
export function encrypt(plaintext: string): string {
	const key = getEncryptionKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv, {
		authTagLength: TAG_LENGTH,
	});
	const encrypted = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return [
		iv.toString("base64"),
		encrypted.toString("base64"),
		tag.toString("base64"),
	].join(SEPARATOR);
}

/** Decrypt an `iv:ciphertext:authTag` base64 string. */
export function decrypt(encrypted: string): string {
	const key = getEncryptionKey();
	const parts = encrypted.split(SEPARATOR);
	if (parts.length !== 3) {
		throw new Error("Invalid encrypted value format");
	}
	const iv = Buffer.from(parts[0], "base64");
	const ciphertext = Buffer.from(parts[1], "base64");
	const tag = Buffer.from(parts[2], "base64");
	const decipher = createDecipheriv(ALGORITHM, key, iv, {
		authTagLength: TAG_LENGTH,
	});
	decipher.setAuthTag(tag);
	return decipher.update(ciphertext) + decipher.final("utf8");
}

/** HMAC-SHA256 for blind indexes. Deterministic — same input always produces same output. */
export function hmacHash(value: string): string {
	const key = getBlindIndexKey();
	return createHmac("sha256", key)
		.update(value.toLowerCase().trim())
		.digest("hex");
}

/** Detect if a value looks like an encrypted string (iv:ciphertext:tag base64 format). */
export function isEncrypted(value: string): boolean {
	const parts = value.split(SEPARATOR);
	if (parts.length !== 3) return false;
	// Each part must be valid base64 and non-empty
	const base64Re = /^[A-Za-z0-9+/]+=*$/;
	return parts.every((p) => p.length > 0 && base64Re.test(p));
}

/** Decrypt if encrypted, return as-is if plaintext. For migration transition. */
export function safeDecrypt(value: string): string {
	if (isEncrypted(value)) {
		return decrypt(value);
	}
	return value;
}
