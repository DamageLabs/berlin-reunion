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
vi.mock("@/db", () => ({
  db: {
    query: {
      user: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
    },
  },
}));

import { GET } from "../route";

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
