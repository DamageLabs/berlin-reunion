import { describe, expect, it } from "vitest";
import {
	decrypt,
	encrypt,
	hmacHash,
	isEncrypted,
	safeDecrypt,
} from "../crypto";

// Keys are set globally in vitest.setup.unit.ts

describe("crypto", () => {
	describe("encrypt / decrypt", () => {
		it("roundtrips — decrypt recovers original value", () => {
			const plaintext = "hello@example.com";
			const encrypted = encrypt(plaintext);
			expect(decrypt(encrypted)).toBe(plaintext);
		});

		it("produces different ciphertexts for the same plaintext (unique IV)", () => {
			const plaintext = "test@test.com";
			const a = encrypt(plaintext);
			const b = encrypt(plaintext);
			expect(a).not.toBe(b);
			// Both still decrypt to same value
			expect(decrypt(a)).toBe(plaintext);
			expect(decrypt(b)).toBe(plaintext);
		});

		it("produces different ciphertexts for different plaintexts", () => {
			const a = encrypt("alice@example.com");
			const b = encrypt("bob@example.com");
			expect(a).not.toBe(b);
		});

		it("throws on tampered ciphertext (GCM auth tag)", () => {
			const encrypted = encrypt("sensitive data");
			const parts = encrypted.split(":");
			// Tamper with the ciphertext portion
			const tampered = [parts[0], "dGFtcGVyZWQ=", parts[2]].join(":");
			expect(() => decrypt(tampered)).toThrow();
		});

		it("throws on invalid format", () => {
			expect(() => decrypt("not-encrypted")).toThrow(
				"Invalid encrypted value format",
			);
		});

		it("handles empty string", () => {
			const encrypted = encrypt("");
			expect(decrypt(encrypted)).toBe("");
		});

		it("handles unicode characters", () => {
			const plaintext = "münchen@beispiel.de 🇩🇪";
			const encrypted = encrypt(plaintext);
			expect(decrypt(encrypted)).toBe(plaintext);
		});
	});

	describe("hmacHash", () => {
		it("is deterministic — same input produces same output", () => {
			expect(hmacHash("test@example.com")).toBe(hmacHash("test@example.com"));
		});

		it("normalizes input (lowercase + trim)", () => {
			expect(hmacHash("Test@Example.COM")).toBe(hmacHash("test@example.com"));
			expect(hmacHash("  test@example.com  ")).toBe(
				hmacHash("test@example.com"),
			);
		});

		it("produces different output for different inputs", () => {
			expect(hmacHash("alice@example.com")).not.toBe(
				hmacHash("bob@example.com"),
			);
		});

		it("returns a 64-char hex string (SHA-256)", () => {
			const hash = hmacHash("test@example.com");
			expect(hash).toMatch(/^[0-9a-f]{64}$/);
		});
	});

	describe("isEncrypted", () => {
		it("returns true for encrypted values", () => {
			const encrypted = encrypt("test");
			expect(isEncrypted(encrypted)).toBe(true);
		});

		it("returns false for plaintext values", () => {
			expect(isEncrypted("hello@example.com")).toBe(false);
			expect(isEncrypted("plain text")).toBe(false);
			expect(isEncrypted("")).toBe(false);
		});

		it("returns false for partial format", () => {
			expect(isEncrypted("abc:def")).toBe(false);
			expect(isEncrypted("abc")).toBe(false);
		});
	});

	describe("safeDecrypt", () => {
		it("decrypts encrypted values", () => {
			const encrypted = encrypt("test@example.com");
			expect(safeDecrypt(encrypted)).toBe("test@example.com");
		});

		it("returns plaintext values as-is", () => {
			expect(safeDecrypt("test@example.com")).toBe("test@example.com");
			expect(safeDecrypt("not encrypted")).toBe("not encrypted");
		});
	});

	describe("missing keys", () => {
		it("encrypt throws when ENCRYPTION_KEY is missing", () => {
			const saved = process.env.ENCRYPTION_KEY;
			delete process.env.ENCRYPTION_KEY;
			expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY");
			process.env.ENCRYPTION_KEY = saved;
		});

		it("hmacHash throws when BLIND_INDEX_KEY is missing", () => {
			const saved = process.env.BLIND_INDEX_KEY;
			delete process.env.BLIND_INDEX_KEY;
			expect(() => hmacHash("test")).toThrow("BLIND_INDEX_KEY");
			process.env.BLIND_INDEX_KEY = saved;
		});
	});
});
