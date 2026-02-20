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

const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();
const mockDeleteFn = vi.fn();
const mockSet = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
const mockWhere = vi.fn().mockResolvedValue(undefined);

vi.mock("@/db", () => ({
  db: {
    query: {
      user: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
    },
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDeleteFn(...args),
  },
}));

const mockLogAuditEvent = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/audit", () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

vi.mock("@/db/schema", () => ({
  user: { id: "user.id" },
  auditLog: { actorId: "auditLog.actorId" },
  inviteToken: { invitedBy: "inviteToken.invitedBy" },
  emailVerificationCode: { emailHash: "emailVerificationCode.emailHash" },
}));

import { GET, DELETE } from "../route";

// --- Helpers ---

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(id: string) {
  return new NextRequest(`http://localhost:3000/api/users/${id}`);
}

function userSession(id = "user-1") {
  return { user: { id, name: "User", role: "user" } };
}

function adminSession(id = "admin-1") {
  return { user: { id, name: "Admin", role: "admin" } };
}

function moderatorSession(id = "mod-1") {
  return { user: { id, name: "Moderator", role: "moderator" } };
}

const sampleUser = {
  id: "user-2",
  name: "Alice",
  username: "alice",
  image: "/uploads/abc.jpg",
  location: "Berlin, Germany",
  platoon: "Alpha Company",
  yearsServed: "1985-1989",
  role: "user",
  createdAt: new Date("2025-01-15"),
  email: "alice@example.com",
  emailVerified: true,
  banned: false,
  banReason: null,
  pendingEmail: null,
  emailHash: "hash-alice",
};

// --- Tests ---

describe("GET /api/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest("user-2"), makeParams("user-2"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    mockGetSession.mockResolvedValue(userSession());
    mockFindFirst.mockResolvedValue(undefined);
    const res = await GET(makeRequest("no-one"), makeParams("no-one"));
    expect(res.status).toBe(404);
  });

  it("returns public fields only for non-owner", async () => {
    mockGetSession.mockResolvedValue(userSession());
    mockFindFirst.mockResolvedValue(sampleUser);

    const res = await GET(makeRequest("user-2"), makeParams("user-2"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      id: "user-2",
      name: "Alice",
      username: "alice",
      image: "/uploads/abc.jpg",
      location: "Berlin, Germany",
      platoon: "Alpha Company",
      yearsServed: "1985-1989",
      role: "user",
      createdAt: "2025-01-15T00:00:00.000Z",
    });

    // Sensitive fields must not be present
    expect(body.email).toBeUndefined();
    expect(body.pendingEmail).toBeUndefined();
    expect(body.emailVerified).toBeUndefined();
    expect(body.banned).toBeUndefined();
    expect(body.banReason).toBeUndefined();
  });

  it("includes email and pendingEmail for owner", async () => {
    mockGetSession.mockResolvedValue(userSession("user-2"));
    mockFindFirst.mockResolvedValue({
      ...sampleUser,
      pendingEmail: "newalice@example.com",
    });

    const res = await GET(makeRequest("user-2"), makeParams("user-2"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.email).toBe("alice@example.com");
    expect(body.pendingEmail).toBe("newalice@example.com");
  });

  it("includes email and pendingEmail for admin", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "admin-1", name: "Admin", role: "admin" },
    });
    mockFindFirst.mockResolvedValue(sampleUser);

    const res = await GET(makeRequest("user-2"), makeParams("user-2"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.email).toBe("alice@example.com");
    expect(body.pendingEmail).toBeNull();
  });
});

describe("DELETE /api/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: update().set().where() chain
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    // Default: delete().where() chain
    mockDeleteFn.mockReturnValue({ where: mockWhere });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await DELETE(makeRequest("user-2"), makeParams("user-2"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for regular user", async () => {
    mockGetSession.mockResolvedValue(userSession());
    const res = await DELETE(makeRequest("user-2"), makeParams("user-2"));
    expect(res.status).toBe(403);
  });

  it("returns 403 for moderator", async () => {
    mockGetSession.mockResolvedValue(moderatorSession());
    const res = await DELETE(makeRequest("user-2"), makeParams("user-2"));
    expect(res.status).toBe(403);
  });

  it("returns 403 when admin tries to delete self", async () => {
    mockGetSession.mockResolvedValue(adminSession("admin-1"));
    const res = await DELETE(makeRequest("admin-1"), makeParams("admin-1"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/own account/);
  });

  it("returns 404 when target user not found", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    mockFindFirst.mockResolvedValue(undefined);
    const res = await DELETE(makeRequest("no-one"), makeParams("no-one"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when admin tries to delete another admin", async () => {
    mockGetSession.mockResolvedValue(adminSession("admin-1"));
    mockFindFirst.mockResolvedValue({
      id: "admin-2",
      role: "admin",
      emailHash: "hash-admin2",
    });
    const res = await DELETE(makeRequest("admin-2"), makeParams("admin-2"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/equal or higher role/);
  });

  it("returns 200 when admin deletes a regular user", async () => {
    mockGetSession.mockResolvedValue(adminSession("admin-1"));
    mockFindFirst.mockResolvedValue({
      id: "user-2",
      role: "user",
      emailHash: "hash-alice",
    });

    const res = await DELETE(makeRequest("user-2"), makeParams("user-2"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    // Audit logged first
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      action: "user.delete",
      actorId: "admin-1",
      targetId: "user-2",
    });

    // Cascade cleanup calls
    expect(mockUpdate).toHaveBeenCalled(); // auditLog.actorId nullified
    expect(mockDeleteFn).toHaveBeenCalled(); // invites + verification codes + user deleted
  });

  it("returns 200 when admin deletes a moderator", async () => {
    mockGetSession.mockResolvedValue(adminSession("admin-1"));
    mockFindFirst.mockResolvedValue({
      id: "mod-1",
      role: "moderator",
      emailHash: "hash-mod",
    });

    const res = await DELETE(makeRequest("mod-1"), makeParams("mod-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 500 on database error", async () => {
    mockGetSession.mockResolvedValue(adminSession("admin-1"));
    mockFindFirst.mockResolvedValue({
      id: "user-2",
      role: "user",
      emailHash: "hash-alice",
    });
    mockLogAuditEvent.mockRejectedValueOnce(new Error("DB failure"));

    const res = await DELETE(makeRequest("user-2"), makeParams("user-2"));
    expect(res.status).toBe(500);
  });
});
