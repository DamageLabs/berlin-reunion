import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

const mockSignUpEmail = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      signUpEmail: (...args: unknown[]) => mockSignUpEmail(...args),
    },
  },
}));

const mockQueryFindFirst = vi.fn();
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

vi.mock("@/db", () => ({
  db: {
    query: {
      inviteToken: {
        findFirst: (...args: unknown[]) => mockQueryFindFirst(...args),
      },
    },
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  inviteToken: { token: "token", id: "id" },
  user: { id: "id" },
}));

// Import from the [token] route, not the parent
import { GET, POST } from "../../[token]/route";

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

  it("returns 201 on successful acceptance", async () => {
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
    expect(body.user.emailVerified).toBe(true);

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

    // Should have updated user (verify + role) and marked invite used
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
