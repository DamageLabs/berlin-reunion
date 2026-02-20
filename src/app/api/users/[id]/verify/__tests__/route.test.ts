import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

const mockGetSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
});
const mockSelect = vi.fn();

vi.mock("@/db", () => ({
  db: {
    update: (...args: unknown[]) => mockUpdate(...args),
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  user: { id: "user.id", role: "user.role", emailVerified: "user.emailVerified" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

const mockLogAuditEvent = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/audit", () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

import { POST } from "../route";

// --- Helpers ---

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(id: string) {
  return new NextRequest(`http://localhost:3000/api/users/${id}/verify`, {
    method: "POST",
  });
}

function setupMockDb(targetRole = "user", emailVerified = false) {
  const whereFnUpdate = vi.fn().mockResolvedValue(undefined);
  const setFn = vi.fn().mockReturnValue({ where: whereFnUpdate });
  mockUpdate.mockReturnValue({ set: setFn });

  const fromFn = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([{ role: targetRole, emailVerified }]),
  });
  mockSelect.mockReturnValue({ from: fromFn });

  return { setFn, whereFnUpdate };
}

function sessionWith(id: string, role: string) {
  return { user: { id, name: "Test", role } };
}

// --- Tests ---

describe("POST /api/users/[id]/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeRequest("user-1"), makeParams("user-1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for regular user", async () => {
    mockGetSession.mockResolvedValue(sessionWith("user-1", "user"));
    const res = await POST(makeRequest("user-2"), makeParams("user-2"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 403 on self-verify", async () => {
    mockGetSession.mockResolvedValue(sessionWith("mod-1", "moderator"));
    const res = await POST(makeRequest("mod-1"), makeParams("mod-1"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("yourself");
  });

  it("returns 403 when moderator tries to verify moderator", async () => {
    mockGetSession.mockResolvedValue(sessionWith("mod-1", "moderator"));
    setupMockDb("moderator");
    const res = await POST(makeRequest("mod-2"), makeParams("mod-2"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("equal or higher");
  });

  it("returns 403 when moderator tries to verify admin", async () => {
    mockGetSession.mockResolvedValue(sessionWith("mod-1", "moderator"));
    setupMockDb("admin");
    const res = await POST(makeRequest("admin-1"), makeParams("admin-1"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("equal or higher");
  });

  it("returns 404 when target user not found", async () => {
    mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
    const fromFn = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });
    mockSelect.mockReturnValue({ from: fromFn });
    const res = await POST(makeRequest("nonexistent"), makeParams("nonexistent"));
    expect(res.status).toBe(404);
  });

  it("returns 200 with alreadyVerified when user is already verified", async () => {
    mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
    setupMockDb("user", true);
    const res = await POST(makeRequest("user-1"), makeParams("user-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.alreadyVerified).toBe(true);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockLogAuditEvent).not.toHaveBeenCalled();
  });

  it("returns 200 when admin verifies user", async () => {
    mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
    const { setFn } = setupMockDb("user", false);
    const res = await POST(makeRequest("user-1"), makeParams("user-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.alreadyVerified).toBeUndefined();
    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({ emailVerified: true }),
    );
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      action: "email.verify",
      actorId: "admin-1",
      targetId: "user-1",
    });
  });

  it("returns 200 when moderator verifies user", async () => {
    mockGetSession.mockResolvedValue(sessionWith("mod-1", "moderator"));
    setupMockDb("user", false);
    const res = await POST(makeRequest("user-1"), makeParams("user-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 500 on DB error", async () => {
    mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
    // Set up select to return unverified user
    const fromFn = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ role: "user", emailVerified: false }]),
    });
    mockSelect.mockReturnValue({ from: fromFn });
    // Set up update to throw
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error("DB failure")),
      }),
    });
    const res = await POST(makeRequest("user-1"), makeParams("user-1"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("DB failure");
  });
});
