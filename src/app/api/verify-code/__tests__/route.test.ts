import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

const mockQueryFindFirst = vi.fn();
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });

vi.mock("@/db", () => ({
  db: {
    query: {
      emailVerificationCode: {
        findFirst: (...args: unknown[]) => mockQueryFindFirst(...args),
      },
    },
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  emailVerificationCode: {
    email: "email",
    expiresAt: "expires_at",
    createdAt: "created_at",
    id: "id",
  },
  user: { email: "email" },
}));

vi.mock("@/lib/verification-code", () => ({
  hashCode: (code: string) => `hash_${code.toUpperCase()}`,
  MAX_ATTEMPTS: 3,
}));

import { POST } from "../route";

// --- Helpers ---

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/verify-code", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// --- Tests ---

describe("POST /api/verify-code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateWhere.mockResolvedValue(undefined);
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockDeleteWhere.mockResolvedValue(undefined);
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
  });

  it("returns 400 on missing fields", async () => {
    const res = await POST(makeRequest({ email: "a@b.com" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("required");
  });

  it("returns 400 on missing email", async () => {
    const res = await POST(makeRequest({ code: "ABCD1234" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when no valid code exists", async () => {
    mockQueryFindFirst.mockResolvedValue(undefined);
    const res = await POST(
      makeRequest({ email: "a@b.com", code: "ABCD1234" }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 429 on max attempts exceeded", async () => {
    mockQueryFindFirst.mockResolvedValue({
      id: "code-1",
      email: "a@b.com",
      codeHash: "hash_ABCD1234",
      attempts: 3,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
    });

    const res = await POST(
      makeRequest({ email: "a@b.com", code: "ABCD1234" }),
    );
    expect(res.status).toBe(429);
    // Should delete the exhausted code
    expect(mockDelete).toHaveBeenCalled();
  });

  it("returns 400 on wrong code with remaining attempts", async () => {
    mockQueryFindFirst.mockResolvedValue({
      id: "code-1",
      email: "a@b.com",
      codeHash: "hash_CORRECTCODE",
      attempts: 1,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
    });

    const res = await POST(
      makeRequest({ email: "a@b.com", code: "WRONGCDE" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid code");
    expect(body.remainingAttempts).toBe(1); // 3 - (1+1) = 1
    // Should have incremented attempts
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("returns 200 on correct code and verifies email", async () => {
    mockQueryFindFirst.mockResolvedValue({
      id: "code-1",
      email: "a@b.com",
      codeHash: "hash_ABCD1234",
      attempts: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
    });

    const res = await POST(
      makeRequest({ email: "a@b.com", code: "ABCD1234" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verified).toBe(true);

    // Should have updated user emailVerified and deleted codes
    expect(mockUpdate).toHaveBeenCalledTimes(2); // increment attempts + set emailVerified
    expect(mockDelete).toHaveBeenCalled();
  });
});
