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

vi.mock("@/db", () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:crypto", () => ({
  randomUUID: () => "test-uuid-1234",
}));

import { POST } from "../route";

// --- Helpers ---

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function userSession(id = "user-1") {
  return { user: { id, name: "User", role: "user" } };
}

function adminSession(id = "admin-1") {
  return { user: { id, name: "Admin", role: "admin" } };
}

function makeUploadRequest(
  id: string,
  file?: { name: string; type: string; content: Uint8Array },
) {
  const formData = new FormData();
  if (file) {
    const blob = new Blob([file.content], { type: file.type });
    formData.append("photo", blob, file.name);
  }
  return new NextRequest(`http://localhost:3000/api/users/${id}/photo`, {
    method: "POST",
    body: formData,
  });
}

const TINY_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

// --- Tests ---

describe("POST /api/users/[id]/photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(
      makeUploadRequest("user-1", {
        name: "photo.png",
        type: "image/png",
        content: TINY_PNG,
      }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when updating another user's photo", async () => {
    mockGetSession.mockResolvedValue(userSession("user-1"));
    const res = await POST(
      makeUploadRequest("user-2", {
        name: "photo.png",
        type: "image/png",
        content: TINY_PNG,
      }),
      makeParams("user-2"),
    );
    expect(res.status).toBe(403);
  });

  it("allows admin to upload for another user", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    const res = await POST(
      makeUploadRequest("user-1", {
        name: "photo.png",
        type: "image/png",
        content: TINY_PNG,
      }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.image).toBe("/uploads/test-uuid-1234.png");
  });

  it("returns 400 when no file is provided", async () => {
    mockGetSession.mockResolvedValue(userSession());
    const res = await POST(
      makeUploadRequest("user-1"),
      makeParams("user-1"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for unsupported file type", async () => {
    mockGetSession.mockResolvedValue(userSession());
    const formData = new FormData();
    const blob = new Blob([TINY_PNG], { type: "image/gif" });
    formData.append("photo", blob, "photo.gif");
    const req = new NextRequest("http://localhost:3000/api/users/user-1/photo", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req, makeParams("user-1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("File type");
  });

  it("returns 400 when file exceeds 2MB", async () => {
    mockGetSession.mockResolvedValue(userSession());
    const largeContent = new Uint8Array(2 * 1024 * 1024 + 1);
    const res = await POST(
      makeUploadRequest("user-1", {
        name: "big.png",
        type: "image/png",
        content: largeContent,
      }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("2MB");
  });

  it("returns 200 and image path on success", async () => {
    mockGetSession.mockResolvedValue(userSession());
    const res = await POST(
      makeUploadRequest("user-1", {
        name: "avatar.jpg",
        type: "image/jpeg",
        content: TINY_PNG,
      }),
      makeParams("user-1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.image).toBe("/uploads/test-uuid-1234.jpeg");
  });
});
