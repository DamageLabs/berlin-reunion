import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

const mockGetSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: {
    api: { getSession: (...args: unknown[]) => mockGetSession(...args) },
  },
}));

const mockUserFindFirst = vi.fn();
const mockCodeFindFirst = vi.fn();
const mockSelectFrom = vi.fn();
const mockSelectWhere = vi.fn();
const mockSelect = vi.fn();
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });
const mockLogAuditEvent = vi.fn().mockResolvedValue(undefined);

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
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  user: {
    id: "id",
    email: "email",
    pendingEmail: "pending_email",
  },
  emailVerificationCode: {
    email: "email",
    expiresAt: "expires_at",
    createdAt: "created_at",
    id: "id",
  },
}));

vi.mock("@/lib/verification-code", () => ({
  hashCode: (code: string) => `hash_${code.toUpperCase()}`,
  MAX_ATTEMPTS: 3,
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

import { POST } from "../route";

// --- Helpers ---

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(id: string, body: Record<string, unknown>) {
  return new NextRequest(
    `http://localhost:3000/api/users/${id}/email/confirm`,
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    },
  );
}

function userSession(id = "user-1") {
  return { user: { id, name: "User", role: "user" } };
}

// --- Tests ---

describe("POST /api/users/[id]/email/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectWhere.mockResolvedValue([
      { email: "old@example.com", pendingEmail: "new@example.com" },
    ]);
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockDeleteWhere.mockResolvedValue(undefined);
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(
      makeRequest("user-1", { code: "ABCD1234" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when targeting another user", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    const res = await POST(
      makeRequest("user-2", { code: "ABCD1234" }),
      makeParams("user-2"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when code is missing", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    const res = await POST(makeRequest("user-1", {}), makeParams("user-1"));
    expect(res.status).toBe(400);
  });

  it("returns 409 when no pending email", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    mockSelectWhere.mockResolvedValue([
      { email: "old@example.com", pendingEmail: null },
    ]);

    const res = await POST(
      makeRequest("user-1", { code: "ABCD1234" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("No pending email");
  });

  it("returns 409 on race condition (email taken)", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    // User has pending email
    mockSelectWhere.mockResolvedValue([
      { email: "old@example.com", pendingEmail: "new@example.com" },
    ]);
    // But another user already took that email
    mockUserFindFirst.mockResolvedValue({ id: "user-2" });

    const res = await POST(
      makeRequest("user-1", { code: "ABCD1234" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("already in use");
  });

  it("returns 404 when no valid code exists", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    mockUserFindFirst.mockResolvedValue(null);
    mockCodeFindFirst.mockResolvedValue(undefined);

    const res = await POST(
      makeRequest("user-1", { code: "ABCD1234" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 429 on max attempts exceeded", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    mockUserFindFirst.mockResolvedValue(null);
    mockCodeFindFirst.mockResolvedValue({
      id: "code-1",
      email: "new@example.com",
      codeHash: "hash_ABCD1234",
      attempts: 3,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
    });

    const res = await POST(
      makeRequest("user-1", { code: "ABCD1234" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(429);
    expect(mockDelete).toHaveBeenCalled();
  });

  it("returns 400 on wrong code", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    mockUserFindFirst.mockResolvedValue(null);
    mockCodeFindFirst.mockResolvedValue({
      id: "code-1",
      email: "new@example.com",
      codeHash: "hash_CORRECTCODE",
      attempts: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
    });

    const res = await POST(
      makeRequest("user-1", { code: "WRONGCDE" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid code");
    expect(body.remainingAttempts).toBe(2);
  });

  it("returns 200 on success and commits email change", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    mockUserFindFirst.mockResolvedValue(null);
    mockCodeFindFirst.mockResolvedValue({
      id: "code-1",
      email: "new@example.com",
      codeHash: "hash_ABCD1234",
      attempts: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
    });

    const res = await POST(
      makeRequest("user-1", { code: "ABCD1234" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.email).toBe("new@example.com");

    // Should have updated user, deleted codes, and logged audit
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "email.change",
        actorId: "user-1",
        targetId: "user-1",
        detail: { oldEmail: "old@example.com", newEmail: "new@example.com" },
      }),
    );
  });
});
