import { randomBytes, createHash } from "crypto";

// 30-char alphabet excluding ambiguous characters (0/O/1/I/L)
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_ATTEMPTS = 3;
export const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

export function generateVerificationCode(): string {
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase()).digest("hex");
}
