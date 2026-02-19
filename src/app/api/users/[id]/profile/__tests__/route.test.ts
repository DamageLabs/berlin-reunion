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

const mockUpdate = vi.fn();
const mockWhere = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) }));
vi.mock("@/db", () => ({
  db: {
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

mockUpdate.mockReturnValue({ set: vi.fn().mockReturnValue({ where: mockWhere }) });

import { PATCH } from "../route";

// --- Helpers ---

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(id: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000/api/users/${id}/profile`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function userSession(id = "user-1") {
  return { user: { id, name: "User", role: "user" } };
}

function adminSession(id = "admin-1") {
  return { user: { id, name: "Admin", role: "admin" } };
}

// --- Tests ---

describe("PATCH /api/users/[id]/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: mockWhere }),
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await PATCH(
      makeRequest("user-1", { location: "Berlin" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when updating another user's profile", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    const res = await PATCH(
      makeRequest("user-2", { location: "Berlin" }),
      makeParams("user-2"),
    );
    expect(res.status).toBe(403);
  });

  it("allows admin to update another user's profile", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    const res = await PATCH(
      makeRequest("user-1", { location: "Berlin" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(200);
  });

  it("returns 400 when location is not a string", async () => {
    mockGetSession.mockResolvedValue(userSession());
    const res = await PATCH(
      makeRequest("user-1", { location: 123 }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when body has no valid fields", async () => {
    mockGetSession.mockResolvedValue(userSession());
    const res = await PATCH(
      makeRequest("user-1", { foo: "bar" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(400);
  });

  it("trims and updates location on success", async () => {
    mockGetSession.mockResolvedValue(userSession());
    const res = await PATCH(
      makeRequest("user-1", { location: "  Berlin, Germany  " }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.location).toBe("Berlin, Germany");
  });

  it("allows setting location to empty string (clearing it)", async () => {
    mockGetSession.mockResolvedValue(userSession());
    const res = await PATCH(
      makeRequest("user-1", { location: "" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(200);
  });

  it("updates platoon and yearsServed", async () => {
    mockGetSession.mockResolvedValue(userSession());
    const res = await PATCH(
      makeRequest("user-1", { platoon: "  Alpha Company  ", yearsServed: " 1985-1989 " }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.platoon).toBe("Alpha Company");
    expect(body.yearsServed).toBe("1985-1989");
  });

  it("returns 400 when platoon is not a string", async () => {
    mockGetSession.mockResolvedValue(userSession());
    const res = await PATCH(
      makeRequest("user-1", { platoon: 42 }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(400);
  });
});
