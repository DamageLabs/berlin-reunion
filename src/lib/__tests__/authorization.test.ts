import { describe, it, expect, vi, beforeEach } from "vitest";

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

import {
  getServerSession,
  requireAuth,
  requireRole,
} from "../authorization";

describe("authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getServerSession", () => {
    it("returns session when authenticated", async () => {
      const session = { user: { id: "1", name: "Alice", role: "user" } };
      mockGetSession.mockResolvedValue(session);
      const result = await getServerSession();
      expect(result).toEqual(session);
    });

    it("returns null when not authenticated", async () => {
      mockGetSession.mockResolvedValue(null);
      const result = await getServerSession();
      expect(result).toBeNull();
    });
  });

  describe("requireAuth", () => {
    it("returns session when authenticated", async () => {
      const session = { user: { id: "1", name: "Alice", role: "user" } };
      mockGetSession.mockResolvedValue(session);
      const result = await requireAuth();
      expect(result).toEqual(session);
    });

    it("throws 'Unauthorized' when not authenticated", async () => {
      mockGetSession.mockResolvedValue(null);
      await expect(requireAuth()).rejects.toThrow("Unauthorized");
    });
  });

  describe("requireRole", () => {
    it("allows admin to access admin routes", async () => {
      const session = { user: { id: "1", name: "Admin", role: "admin" } };
      mockGetSession.mockResolvedValue(session);
      const result = await requireRole("admin");
      expect(result).toEqual(session);
    });

    it("allows admin to access moderator routes", async () => {
      const session = { user: { id: "1", name: "Admin", role: "admin" } };
      mockGetSession.mockResolvedValue(session);
      const result = await requireRole("moderator");
      expect(result).toEqual(session);
    });

    it("allows admin to access user routes", async () => {
      const session = { user: { id: "1", name: "Admin", role: "admin" } };
      mockGetSession.mockResolvedValue(session);
      const result = await requireRole("user");
      expect(result).toEqual(session);
    });

    it("allows moderator to access moderator routes", async () => {
      const session = {
        user: { id: "2", name: "Mod", role: "moderator" },
      };
      mockGetSession.mockResolvedValue(session);
      const result = await requireRole("moderator");
      expect(result).toEqual(session);
    });

    it("allows moderator to access user routes", async () => {
      const session = {
        user: { id: "2", name: "Mod", role: "moderator" },
      };
      mockGetSession.mockResolvedValue(session);
      const result = await requireRole("user");
      expect(result).toEqual(session);
    });

    it("denies moderator access to admin routes", async () => {
      const session = {
        user: { id: "2", name: "Mod", role: "moderator" },
      };
      mockGetSession.mockResolvedValue(session);
      await expect(requireRole("admin")).rejects.toThrow("Forbidden");
    });

    it("allows user to access user routes", async () => {
      const session = { user: { id: "3", name: "User", role: "user" } };
      mockGetSession.mockResolvedValue(session);
      const result = await requireRole("user");
      expect(result).toEqual(session);
    });

    it("denies user access to moderator routes", async () => {
      const session = { user: { id: "3", name: "User", role: "user" } };
      mockGetSession.mockResolvedValue(session);
      await expect(requireRole("moderator")).rejects.toThrow("Forbidden");
    });

    it("denies user access to admin routes", async () => {
      const session = { user: { id: "3", name: "User", role: "user" } };
      mockGetSession.mockResolvedValue(session);
      await expect(requireRole("admin")).rejects.toThrow("Forbidden");
    });

    it("treats missing role as 'user'", async () => {
      const session = { user: { id: "4", name: "NoRole" } };
      mockGetSession.mockResolvedValue(session);
      await expect(requireRole("moderator")).rejects.toThrow("Forbidden");
    });

    it("throws 'Unauthorized' when no session exists", async () => {
      mockGetSession.mockResolvedValue(null);
      await expect(requireRole("user")).rejects.toThrow("Unauthorized");
    });
  });
});
