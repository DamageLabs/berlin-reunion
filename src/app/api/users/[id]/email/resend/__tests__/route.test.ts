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

const mockCodeFindFirst = vi.fn();
const mockSelectFrom = vi.fn();
const mockSelectWhere = vi.fn();
const mockSelect = vi.fn();
const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockSendEmail = vi.fn().mockResolvedValue(undefined);

vi.mock("@/db", () => ({
  db: {
    query: {
      emailVerificationCode: {
        findFirst: (...args: unknown[]) => mockCodeFindFirst(...args),
      },
    },
    select: (...args: unknown[]) => mockSelect(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  user: {
    id: "id",
    pendingEmail: "pending_email",
  },
  emailVerificationCode: {
    email: "email",
    createdAt: "created_at",
  },
}));

vi.mock("@/lib/verification-code", () => ({
  generateVerificationCode: () => "ABCD1234",
  hashCode: (code: string) => `hash_${code}`,
  EXPIRY_MS: 15 * 60 * 1000,
  RESEND_COOLDOWN_MS: 60 * 1000,
}));

vi.mock("@/lib/email", () => ({
  sendEmailChangeVerificationEmail: (...args: unknown[]) =>
    mockSendEmail(...args),
}));

import { POST } from "../route";

// --- Helpers ---

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(id: string) {
  return new NextRequest(
    `http://localhost:3000/api/users/${id}/email/resend`,
    { method: "POST" },
  );
}

function userSession(id = "user-1") {
  return { user: { id, name: "User", role: "user" } };
}

// --- Tests ---

describe("POST /api/users/[id]/email/resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectWhere.mockResolvedValue([{ pendingEmail: "new@example.com" }]);
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockDeleteWhere.mockResolvedValue(undefined);
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockInsertValues.mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockInsertValues });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeRequest("user-1"), makeParams("user-1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when targeting another user", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    const res = await POST(makeRequest("user-2"), makeParams("user-2"));
    expect(res.status).toBe(403);
  });

  it("returns 409 when no pending email", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    mockSelectWhere.mockResolvedValue([{ pendingEmail: null }]);

    const res = await POST(makeRequest("user-1"), makeParams("user-1"));
    expect(res.status).toBe(409);
  });

  it("returns 429 within cooldown", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    mockCodeFindFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 10_000),
    });

    const res = await POST(makeRequest("user-1"), makeParams("user-1"));
    expect(res.status).toBe(429);
  });

  it("returns 200 on success", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    mockCodeFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest("user-1"), makeParams("user-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalledWith({
      email: "new@example.com",
      code: "ABCD1234",
    });
  });
});
