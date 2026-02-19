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
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockSendEmail = vi.fn().mockResolvedValue(undefined);

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
    insert: (...args: unknown[]) => mockInsert(...args),
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
    createdAt: "created_at",
    expiresAt: "expires_at",
    id: "id",
  },
}));

vi.mock("@/lib/verification-code", () => ({
  generateVerificationCode: () => "ABCD1234",
  hashCode: (code: string) => `hash_${code.toUpperCase()}`,
  EXPIRY_MS: 15 * 60 * 1000,
  RESEND_COOLDOWN_MS: 60 * 1000,
}));

vi.mock("@/lib/email", () => ({
  sendEmailChangeVerificationEmail: (...args: unknown[]) =>
    mockSendEmail(...args),
}));

import { PATCH } from "../route";

// --- Helpers ---

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(id: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000/api/users/${id}/email`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function userSession(id = "user-1") {
  return { user: { id, name: "User", role: "user" } };
}

// --- Tests ---

describe("PATCH /api/users/[id]/email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectWhere.mockResolvedValue([
      { email: "old@example.com", pendingEmail: null },
    ]);
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockDeleteWhere.mockResolvedValue(undefined);
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockInsertValues.mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockInsertValues });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await PATCH(
      makeRequest("user-1", { email: "new@example.com" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when targeting another user", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    const res = await PATCH(
      makeRequest("user-2", { email: "new@example.com" }),
      makeParams("user-2"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when email is missing", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    const res = await PATCH(makeRequest("user-1", {}), makeParams("user-1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when new email is same as current", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    mockSelectWhere.mockResolvedValue([
      { email: "old@example.com", pendingEmail: null },
    ]);
    mockCodeFindFirst.mockResolvedValue(null);
    mockUserFindFirst.mockResolvedValue(null);

    const res = await PATCH(
      makeRequest("user-1", { email: "old@example.com" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("different");
  });

  it("returns 409 when email is already in use", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    mockSelectWhere.mockResolvedValue([
      { email: "old@example.com", pendingEmail: null },
    ]);
    mockUserFindFirst.mockResolvedValue({ id: "user-2" });

    const res = await PATCH(
      makeRequest("user-1", { email: "taken@example.com" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(409);
  });

  it("returns 429 within cooldown", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    mockSelectWhere.mockResolvedValue([
      { email: "old@example.com", pendingEmail: null },
    ]);
    mockUserFindFirst.mockResolvedValue(null);
    mockCodeFindFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 10_000),
    });

    const res = await PATCH(
      makeRequest("user-1", { email: "new@example.com" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(429);
  });

  it("returns 200 on success", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    mockSelectWhere.mockResolvedValue([
      { email: "old@example.com", pendingEmail: null },
    ]);
    mockUserFindFirst.mockResolvedValue(null);
    mockCodeFindFirst.mockResolvedValue(null);

    const res = await PATCH(
      makeRequest("user-1", { email: "new@example.com" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalledWith({
      email: "new@example.com",
      code: "ABCD1234",
    });
  });

  it("returns 409 when pending email is taken by another user", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    mockSelectWhere.mockResolvedValue([
      { email: "old@example.com", pendingEmail: null },
    ]);
    // findFirst returns a different user who has this as pendingEmail
    mockUserFindFirst.mockResolvedValue({ id: "user-3" });

    const res = await PATCH(
      makeRequest("user-1", { email: "pending@example.com" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(409);
  });
});
