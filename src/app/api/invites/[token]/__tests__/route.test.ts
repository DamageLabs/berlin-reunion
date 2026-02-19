import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

const mockGetSession = vi.fn();
const mockSignUpEmail = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signUpEmail: (...args: unknown[]) => mockSignUpEmail(...args),
    },
  },
}));

const mockQueryFindFirst = vi.fn();
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

vi.mock("@/db", () => ({
  db: {
    query: {
      inviteToken: {
        findFirst: (...args: unknown[]) => mockQueryFindFirst(...args),
      },
    },
    update: (...args: unknown[]) => mockUpdate(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  inviteToken: { token: "token", id: "id" },
  user: { id: "id" },
  emailVerificationCode: {},
}));

vi.mock("@/lib/verification-code", () => ({
  generateVerificationCode: () => "ABCD1234",
  hashCode: (code: string) => `hash_${code}`,
  EXPIRY_MS: 15 * 60 * 1000,
}));

const mockSendVerificationCodeEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email", () => ({
  sendVerificationCodeEmail: (...args: unknown[]) =>
    mockSendVerificationCodeEmail(...args),
}));

const mockLogAuditEvent = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/audit", () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

// Import from the [token] route, not the parent
import { GET, POST, DELETE } from "../../[token]/route";

// --- Helpers ---

function makeParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

function makeGetRequest(token: string) {
  return new NextRequest(
    `http://localhost:3000/api/invites/${token}`,
    { method: "GET" },
  );
}

function makePostRequest(
  token: string,
  body: Record<string, unknown>,
) {
  return new NextRequest(
    `http://localhost:3000/api/invites/${token}`,
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    },
  );
}

function validInvite(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    token: "valid-token",
    email: "invitee@example.com",
    role: "user",
    used: false,
    expiresAt: new Date(Date.now() + 86400000), // tomorrow
    ...overrides,
  };
}

// --- GET tests ---

describe("GET /api/invites/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when invite not found", async () => {
    mockQueryFindFirst.mockResolvedValue(undefined);
    const res = await GET(makeGetRequest("missing"), makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("returns 410 when invite is already used", async () => {
    mockQueryFindFirst.mockResolvedValue(validInvite({ used: true }));
    const res = await GET(makeGetRequest("used"), makeParams("used"));
    expect(res.status).toBe(410);
  });

  it("returns 410 when invite is expired", async () => {
    mockQueryFindFirst.mockResolvedValue(
      validInvite({ expiresAt: new Date(Date.now() - 1000) }),
    );
    const res = await GET(makeGetRequest("expired"), makeParams("expired"));
    expect(res.status).toBe(410);
  });

  it("returns 200 with invite data for valid token", async () => {
    const invite = validInvite();
    mockQueryFindFirst.mockResolvedValue(invite);
    const res = await GET(
      makeGetRequest("valid-token"),
      makeParams("valid-token"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe("invitee@example.com");
    expect(body.role).toBe("user");
    expect(body.expiresAt).toBeDefined();
  });
});

// --- POST tests ---

describe("POST /api/invites/[token] (accept)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateWhere.mockResolvedValue(undefined);
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockInsertValues.mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockInsertValues });
  });

  it("returns 404 when invite not found", async () => {
    mockQueryFindFirst.mockResolvedValue(undefined);
    const res = await POST(
      makePostRequest("missing", {
        name: "Bob",
        username: "bob",
        password: "Password1!",
      }),
      makeParams("missing"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 410 when invite is used", async () => {
    mockQueryFindFirst.mockResolvedValue(validInvite({ used: true }));
    const res = await POST(
      makePostRequest("used", {
        name: "Bob",
        username: "bob",
        password: "Password1!",
      }),
      makeParams("used"),
    );
    expect(res.status).toBe(410);
  });

  it("returns 410 when invite is expired", async () => {
    mockQueryFindFirst.mockResolvedValue(
      validInvite({ expiresAt: new Date(Date.now() - 1000) }),
    );
    const res = await POST(
      makePostRequest("expired", {
        name: "Bob",
        username: "bob",
        password: "Password1!",
      }),
      makeParams("expired"),
    );
    expect(res.status).toBe(410);
  });

  it("returns 400 when required fields are missing", async () => {
    mockQueryFindFirst.mockResolvedValue(validInvite());
    const res = await POST(
      makePostRequest("valid-token", { name: "Bob" }),
      makeParams("valid-token"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("required");
  });

  it("returns 201 on successful acceptance with emailVerified false", async () => {
    mockQueryFindFirst.mockResolvedValue(validInvite());
    mockSignUpEmail.mockResolvedValue({
      user: { id: "new-user-1", email: "invitee@example.com", name: "Bob" },
    });

    const res = await POST(
      makePostRequest("valid-token", {
        name: "Bob",
        username: "bob",
        password: "Password1!",
      }),
      makeParams("valid-token"),
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.user.email).toBe("invitee@example.com");
    expect(body.user.role).toBe("user");
    expect(body.user.emailVerified).toBe(false);

    // Should have called signUpEmail
    expect(mockSignUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          email: "invitee@example.com",
          name: "Bob",
          username: "bob",
        }),
      }),
    );

    // Should have inserted a verification code
    expect(mockInsert).toHaveBeenCalledTimes(1);

    // Should have sent verification code email
    expect(mockSendVerificationCodeEmail).toHaveBeenCalledWith({
      email: "invitee@example.com",
      code: "ABCD1234",
    });

    // Should have updated user (role) and marked invite used
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it("returns 400 when signUpEmail throws", async () => {
    mockQueryFindFirst.mockResolvedValue(validInvite());
    mockSignUpEmail.mockRejectedValue(new Error("Username already taken"));

    const res = await POST(
      makePostRequest("valid-token", {
        name: "Bob",
        username: "bob",
        password: "Password1!",
      }),
      makeParams("valid-token"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Username already taken");
  });
});

// --- DELETE (revoke) tests ---

function makeDeleteRequest(token: string) {
  return new NextRequest(`http://localhost:3000/api/invites/${token}`, {
    method: "DELETE",
  });
}

describe("DELETE /api/invites/[token] (revoke)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateWhere.mockResolvedValue(undefined);
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await DELETE(
      makeDeleteRequest("some-token"),
      makeParams("some-token"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for regular user", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u1", name: "User", role: "user" },
    });
    const res = await DELETE(
      makeDeleteRequest("some-token"),
      makeParams("some-token"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when invite not found", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "a1", name: "Admin", role: "admin" },
    });
    mockQueryFindFirst.mockResolvedValue(undefined);
    const res = await DELETE(
      makeDeleteRequest("missing"),
      makeParams("missing"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when invite already used", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "a1", name: "Admin", role: "admin" },
    });
    mockQueryFindFirst.mockResolvedValue(validInvite({ used: true }));
    const res = await DELETE(
      makeDeleteRequest("used-token"),
      makeParams("used-token"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("already used");
  });

  it("returns 400 when invite already expired", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "a1", name: "Admin", role: "admin" },
    });
    mockQueryFindFirst.mockResolvedValue(
      validInvite({ expiresAt: new Date(Date.now() - 1000) }),
    );
    const res = await DELETE(
      makeDeleteRequest("expired-token"),
      makeParams("expired-token"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("already expired");
  });

  it("returns 200 when admin revokes pending invite", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "a1", name: "Admin", role: "admin" },
    });
    mockQueryFindFirst.mockResolvedValue(validInvite());
    const res = await DELETE(
      makeDeleteRequest("valid-token"),
      makeParams("valid-token"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith({ used: true });
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      action: "invite.revoke",
      actorId: "a1",
      targetEmail: "invitee@example.com",
      detail: { token: "valid-token", role: "user" },
    });
  });

  it("returns 200 when moderator revokes pending invite", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "m1", name: "Mod", role: "moderator" },
    });
    mockQueryFindFirst.mockResolvedValue(validInvite());
    const res = await DELETE(
      makeDeleteRequest("valid-token"),
      makeParams("valid-token"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
