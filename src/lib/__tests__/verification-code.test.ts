import { describe, it, expect } from "vitest";
import { generateVerificationCode, hashCode } from "../verification-code";

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

describe("verification-code", () => {
  describe("generateVerificationCode", () => {
    it("produces an 8-character string", () => {
      const code = generateVerificationCode();
      expect(code).toHaveLength(8);
    });

    it("uses only allowed alphabet characters", () => {
      for (let i = 0; i < 50; i++) {
        const code = generateVerificationCode();
        for (const ch of code) {
          expect(ALPHABET).toContain(ch);
        }
      }
    });

    it("produces different codes on successive calls", () => {
      const codes = new Set(
        Array.from({ length: 20 }, () => generateVerificationCode()),
      );
      // With 30^8 possibilities, 20 codes should all be unique
      expect(codes.size).toBe(20);
    });
  });

  describe("hashCode", () => {
    it("returns a consistent hash for the same input", () => {
      expect(hashCode("ABCD1234")).toBe(hashCode("ABCD1234"));
    });

    it("is case-insensitive", () => {
      expect(hashCode("abcd1234")).toBe(hashCode("ABCD1234"));
      expect(hashCode("AbCd1234")).toBe(hashCode("abcd1234"));
    });

    it("returns a 64-char hex string (SHA-256)", () => {
      const hash = hashCode("ABCD1234");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
