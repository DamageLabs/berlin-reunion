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
const mockSelectFrom = vi.fn();
const mockSelect = vi.fn().mockReturnValue({
  from: (...args: unknown[]) => mockSelectFrom(...args),
});
const mockInsert = vi.fn().mockReturnValue({
  values: vi.fn().mockResolvedValue(undefined),
});

vi.mock("@/db", () => ({
  db: {
    query: {
      user: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
    },
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  inviteToken: {
    id: "id",
    token: "token",
    email: "email",
    emailHash: "email_hash",
    invitedBy: "invited_by",
    role: "role",
    used: "used",
    createdAt: "created_at",
    expiresAt: "expires_at",
  },
  user: { email: "email", emailHash: "email_hash" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
  desc: (col: unknown) => ({ desc: col }),
  count: () => "count",
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

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/invites", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeGetRequest(query = "") {
  return new NextRequest(`http://localhost:3000/api/invites${query}`);
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

function setupGetMockChain(invites: unknown[] = [], total = 0) {
  const offsetFn = vi.fn().mockResolvedValue(invites);
  const limitFn = vi.fn().mockReturnValue({ offset: offsetFn });
  const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });

  const countResult = vi.fn().mockResolvedValue([{ value: total }]);

  let callCount = 0;
  mockSelectFrom.mockImplementation(() => {
    callCount++;
    if (callCount % 2 === 1) {
      return { orderBy: orderByFn };
    }
    return countResult();
  });

  return { orderByFn, limitFn, offsetFn };
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
    const res = await POST(makePostRequest({ email: "a@b.com" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is 'user'", async () => {
    mockGetSession.mockResolvedValue(userSession());
    const res = await POST(makePostRequest({ email: "a@b.com" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when email is missing", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("email");
  });

  it("returns 400 for invalid role", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    const res = await POST(makePostRequest({ email: "a@b.com", role: "superadmin" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid role");
  });

  it("returns 403 when moderator invites non-user role", async () => {
    mockGetSession.mockResolvedValue(moderatorSession());
    const res = await POST(
      makePostRequest({ email: "a@b.com", role: "admin" }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 409 when user already exists", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    mockFindFirst.mockResolvedValue({ id: "existing", email: "a@b.com" });
    const res = await POST(makePostRequest({ email: "a@b.com" }));
    expect(res.status).toBe(409);
  });

  it("returns 201 on success and creates invite", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    mockFindFirst.mockResolvedValue(undefined);

    const res = await POST(makePostRequest({ email: "new@b.com", role: "moderator" }));
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

    const res = await POST(makePostRequest({ email: "new@b.com" }));
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
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 for regular users", async () => {
    mockGetSession.mockResolvedValue(userSession());
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("returns 200 with paginated invites for admin", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    const invites = [
      { id: "1", email: "a@b.com", role: "user" },
      { id: "2", email: "c@d.com", role: "moderator" },
    ];
    setupGetMockChain(invites, 2);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invites).toEqual(invites);
    expect(body.total).toBe(2);
    expect(body.page).toBe(0);
    expect(body.limit).toBe(20);
  });

  it("returns 200 with invites for moderator", async () => {
    mockGetSession.mockResolvedValue(moderatorSession());
    setupGetMockChain([], 0);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invites).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("parses page and limit from query params", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    setupGetMockChain([], 0);

    const res = await GET(makeGetRequest("?page=2&limit=10"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.page).toBe(2);
    expect(body.limit).toBe(10);
  });
});
