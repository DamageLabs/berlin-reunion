import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

const mockGetSession = vi.fn();
const mockSetRole = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      setRole: (...args: unknown[]) => mockSetRole(...args),
    },
  },
}));

import { POST } from "../route";

// --- Helpers ---

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(id: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000/api/users/${id}/role`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function adminSession(id = "admin-1") {
  return {
    user: { id, name: "Admin", role: "admin" },
  };
}

// --- Tests ---

describe("POST /api/users/[id]/role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(
      makeRequest("user-1", { role: "moderator" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller is moderator", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "mod-1", name: "Mod", role: "moderator" },
    });
    const res = await POST(
      makeRequest("user-1", { role: "admin" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 403 when caller is regular user", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-1", name: "User", role: "user" },
    });
    const res = await POST(
      makeRequest("user-2", { role: "admin" }),
      makeParams("user-2"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 when admin tries to change own role", async () => {
    mockGetSession.mockResolvedValue(adminSession("admin-1"));
    const res = await POST(
      makeRequest("admin-1", { role: "user" }),
      makeParams("admin-1"),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("own role");
  });

  it("returns 400 for invalid role value", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    const res = await POST(
      makeRequest("user-1", { role: "superadmin" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid role");
  });

  it("returns 400 when role is missing", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    const res = await POST(makeRequest("user-1", {}), makeParams("user-1"));
    expect(res.status).toBe(400);
  });

  it("returns 200 on success and calls setRole", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    const updatedUser = {
      id: "user-1",
      name: "User",
      role: "moderator",
    };
    mockSetRole.mockResolvedValue({ user: updatedUser });

    const res = await POST(
      makeRequest("user-1", { role: "moderator" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.user).toEqual(updatedUser);

    expect(mockSetRole).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { userId: "user-1", role: "moderator" },
      }),
    );
  });

  it("returns 500 when setRole throws", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    mockSetRole.mockRejectedValue(new Error("User not found"));

    const res = await POST(
      makeRequest("user-1", { role: "admin" }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("User not found");
  });
});
