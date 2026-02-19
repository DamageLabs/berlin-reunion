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
const mockDelete = vi.fn().mockReturnValue({
  where: vi.fn().mockResolvedValue(undefined),
});
const mockSelect = vi.fn();

vi.mock("@/db", () => ({
  db: {
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  user: { id: "user.id", role: "user.role" },
  session: { userId: "session.userId" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

const mockLogAuditEvent = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/audit", () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

import { POST, DELETE } from "../route";

// --- Helpers ---

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeBanRequest(id: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000/api/users/${id}/ban`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeUnbanRequest(id: string) {
  return new NextRequest(`http://localhost:3000/api/users/${id}/ban`, {
    method: "DELETE",
  });
}

function setupMockDb(targetRole = "user") {
  const whereFnUpdate = vi.fn().mockResolvedValue(undefined);
  const setFn = vi.fn().mockReturnValue({ where: whereFnUpdate });
  mockUpdate.mockReturnValue({ set: setFn });

  const whereFnDelete = vi.fn().mockResolvedValue(undefined);
  mockDelete.mockReturnValue({ where: whereFnDelete });

  const fromFn = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([{ role: targetRole }]),
  });
  mockSelect.mockReturnValue({ from: fromFn });

  return { setFn, whereFnUpdate, whereFnDelete };
}

function sessionWith(id: string, role: string) {
  return { user: { id, name: "Test", role } };
}

// --- POST (ban) tests ---

describe("POST /api/users/[id]/ban", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeBanRequest("user-1", {}), makeParams("user-1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for regular user", async () => {
    mockGetSession.mockResolvedValue(sessionWith("user-1", "user"));
    const res = await POST(makeBanRequest("user-2", {}), makeParams("user-2"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 403 on self-ban", async () => {
    mockGetSession.mockResolvedValue(sessionWith("mod-1", "moderator"));
    const res = await POST(makeBanRequest("mod-1", {}), makeParams("mod-1"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("yourself");
  });

  it("returns 403 when moderator tries to ban moderator", async () => {
    mockGetSession.mockResolvedValue(sessionWith("mod-1", "moderator"));
    setupMockDb("moderator");
    const res = await POST(makeBanRequest("mod-2", {}), makeParams("mod-2"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("equal or higher");
  });

  it("returns 403 when moderator tries to ban admin", async () => {
    mockGetSession.mockResolvedValue(sessionWith("mod-1", "moderator"));
    setupMockDb("admin");
    const res = await POST(makeBanRequest("admin-1", {}), makeParams("admin-1"));
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
    const res = await POST(
      makeBanRequest("nonexistent", {}),
      makeParams("nonexistent"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 when admin bans user", async () => {
    mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
    const { setFn } = setupMockDb("user");
    const res = await POST(
      makeBanRequest("user-1", { reason: "spam" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({ banned: true, banReason: "spam" }),
    );
    expect(mockDelete).toHaveBeenCalled();
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      action: "user.ban",
      actorId: "admin-1",
      targetId: "user-1",
      detail: { reason: "spam", expiresInDays: null },
    });
  });

  it("returns 200 when moderator bans user", async () => {
    mockGetSession.mockResolvedValue(sessionWith("mod-1", "moderator"));
    setupMockDb("user");
    const res = await POST(
      makeBanRequest("user-1", {}),
      makeParams("user-1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("calculates banExpires from expiresInDays", async () => {
    mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
    const { setFn } = setupMockDb("user");
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    const res = await POST(
      makeBanRequest("user-1", { expiresInDays: 7 }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(200);
    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({
        banExpires: new Date(now + 7 * 86400000),
      }),
    );

    vi.restoreAllMocks();
  });

  it("sets banExpires to null when no expiresInDays", async () => {
    mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
    const { setFn } = setupMockDb("user");
    const res = await POST(
      makeBanRequest("user-1", { reason: "permanent" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(200);
    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({ banExpires: null }),
    );
  });

  it("returns 500 on DB error", async () => {
    mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
    const fromFn = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ role: "user" }]),
    });
    mockSelect.mockReturnValue({ from: fromFn });
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error("DB failure")),
      }),
    });
    const res = await POST(
      makeBanRequest("user-1", {}),
      makeParams("user-1"),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("DB failure");
  });
});

// --- DELETE (unban) tests ---

describe("DELETE /api/users/[id]/ban", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await DELETE(makeUnbanRequest("user-1"), makeParams("user-1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for regular user", async () => {
    mockGetSession.mockResolvedValue(sessionWith("user-1", "user"));
    const res = await DELETE(makeUnbanRequest("user-2"), makeParams("user-2"));
    expect(res.status).toBe(403);
  });

  it("returns 403 on self-unban", async () => {
    mockGetSession.mockResolvedValue(sessionWith("mod-1", "moderator"));
    const res = await DELETE(makeUnbanRequest("mod-1"), makeParams("mod-1"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("yourself");
  });

  it("returns 200 when admin unbans", async () => {
    mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
    const whereFn = vi.fn().mockResolvedValue(undefined);
    const setFn = vi.fn().mockReturnValue({ where: whereFn });
    mockUpdate.mockReturnValue({ set: setFn });

    const res = await DELETE(
      makeUnbanRequest("user-1"),
      makeParams("user-1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({
        banned: false,
        banReason: null,
        banExpires: null,
      }),
    );
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      action: "user.unban",
      actorId: "admin-1",
      targetId: "user-1",
    });
  });

  it("returns 200 when moderator unbans", async () => {
    mockGetSession.mockResolvedValue(sessionWith("mod-1", "moderator"));
    const whereFn = vi.fn().mockResolvedValue(undefined);
    const setFn = vi.fn().mockReturnValue({ where: whereFn });
    mockUpdate.mockReturnValue({ set: setFn });

    const res = await DELETE(
      makeUnbanRequest("user-1"),
      makeParams("user-1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 500 on DB error", async () => {
    mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error("DB unban failure")),
      }),
    });
    const res = await DELETE(
      makeUnbanRequest("user-1"),
      makeParams("user-1"),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("DB unban failure");
  });
});
