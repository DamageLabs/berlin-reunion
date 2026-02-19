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

const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockInsert = vi.fn().mockReturnValue({
  values: vi.fn().mockResolvedValue(undefined),
});

vi.mock("@/db", () => ({
  db: {
    query: {
      user: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
      inviteToken: {
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
    },
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  inviteToken: { email: "email", token: "token" },
  user: { email: "email" },
}));

const mockSendInviteEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email", () => ({
  sendInviteEmail: (...args: unknown[]) => mockSendInviteEmail(...args),
}));

// Stable UUID for testing
vi.mock("crypto", async () => {
  const actual = await vi.importActual<typeof import("crypto")>("crypto");
  return {
    ...actual,
    randomUUID: () => "test-uuid-1234",
  };
});

const mockLogAuditEvent = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/audit", () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

import { POST, GET } from "../route";

// --- Helpers ---

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/invites", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function adminSession() {
  return {
    user: { id: "u1", name: "Admin", role: "admin" },
  };
}

function moderatorSession() {
  return {
    user: { id: "u2", name: "Mod", role: "moderator" },
  };
}

function userSession() {
  return {
    user: { id: "u3", name: "User", role: "user" },
  };
}

// --- Tests ---

describe("POST /api/invites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ email: "a@b.com" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is 'user'", async () => {
    mockGetSession.mockResolvedValue(userSession());
    const res = await POST(makeRequest({ email: "a@b.com" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when email is missing", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("email");
  });

  it("returns 400 for invalid role", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    const res = await POST(makeRequest({ email: "a@b.com", role: "superadmin" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid role");
  });

  it("returns 403 when moderator invites non-user role", async () => {
    mockGetSession.mockResolvedValue(moderatorSession());
    const res = await POST(
      makeRequest({ email: "a@b.com", role: "admin" }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 409 when user already exists", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    mockFindFirst.mockResolvedValue({ id: "existing", email: "a@b.com" });
    const res = await POST(makeRequest({ email: "a@b.com" }));
    expect(res.status).toBe(409);
  });

  it("returns 201 on success and creates invite", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    mockFindFirst.mockResolvedValue(undefined);

    const res = await POST(makeRequest({ email: "new@b.com", role: "moderator" }));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.token).toBe("test-uuid-1234");
    expect(body.email).toBe("new@b.com");
    expect(body.role).toBe("moderator");

    expect(mockInsert).toHaveBeenCalled();
    expect(mockSendInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "new@b.com",
        inviterName: "Admin",
        token: "test-uuid-1234",
        role: "moderator",
      }),
    );
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      action: "invite.create",
      actorId: "u1",
      targetEmail: "new@b.com",
      detail: { role: "moderator", token: "test-uuid-1234" },
    });
  });

  it("defaults role to 'user' when not specified", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    mockFindFirst.mockResolvedValue(undefined);

    const res = await POST(makeRequest({ email: "new@b.com" }));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.role).toBe("user");
  });
});

describe("GET /api/invites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 for regular users", async () => {
    mockGetSession.mockResolvedValue(userSession());
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 200 with invites for admin", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    const invites = [
      { id: "1", email: "a@b.com", role: "user" },
      { id: "2", email: "c@d.com", role: "moderator" },
    ];
    mockFindMany.mockResolvedValue(invites);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(invites);
  });

  it("returns 200 with invites for moderator", async () => {
    mockGetSession.mockResolvedValue(moderatorSession());
    mockFindMany.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
  });
});
