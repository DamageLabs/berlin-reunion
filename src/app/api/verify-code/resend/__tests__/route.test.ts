import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

const mockUserFindFirst = vi.fn();
const mockCodeFindFirst = vi.fn();
const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockSendVerificationCodeEmail = vi.fn().mockResolvedValue(undefined);

vi.mock("@/db", () => ({
  db: {
    query: {
      user: {
        findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
      },
      emailVerificationCode: {
        findFirst: (...args: unknown[]) => mockCodeFindFirst(...args),
      },
    },
    delete: (...args: unknown[]) => mockDelete(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  emailVerificationCode: {
    email: "email",
    createdAt: "created_at",
  },
  user: { email: "email" },
}));

vi.mock("@/lib/verification-code", () => ({
  generateVerificationCode: () => "ABCD1234",
  hashCode: (code: string) => `hash_${code}`,
  EXPIRY_MS: 15 * 60 * 1000,
  RESEND_COOLDOWN_MS: 60 * 1000,
}));

vi.mock("@/lib/email", () => ({
  sendVerificationCodeEmail: (...args: unknown[]) =>
    mockSendVerificationCodeEmail(...args),
}));

import { POST } from "../../resend/route";

// --- Helpers ---

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/verify-code/resend", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// --- Tests ---

describe("POST /api/verify-code/resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteWhere.mockResolvedValue(undefined);
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockInsertValues.mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockInsertValues });
  });

  it("returns 400 on missing email", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("required");
  });

  it("returns silent 200 for unknown email", async () => {
    mockUserFindFirst.mockResolvedValue(undefined);
    const res = await POST(makeRequest({ email: "unknown@b.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(true);
    // Should NOT have sent an email
    expect(mockSendVerificationCodeEmail).not.toHaveBeenCalled();
  });

  it("returns 400 for already-verified email", async () => {
    mockUserFindFirst.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      emailVerified: true,
    });

    const res = await POST(makeRequest({ email: "a@b.com" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("already verified");
  });

  it("returns 429 within cooldown", async () => {
    mockUserFindFirst.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      emailVerified: false,
    });
    mockCodeFindFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 10_000), // 10s ago
    });

    const res = await POST(makeRequest({ email: "a@b.com" }));
    expect(res.status).toBe(429);
  });

  it("returns 200 on valid resend", async () => {
    mockUserFindFirst.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      emailVerified: false,
    });
    mockCodeFindFirst.mockResolvedValue(null); // no existing code

    const res = await POST(makeRequest({ email: "a@b.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(true);

    expect(mockDelete).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
    expect(mockSendVerificationCodeEmail).toHaveBeenCalledWith({
      email: "a@b.com",
      code: "ABCD1234",
    });
  });
});
