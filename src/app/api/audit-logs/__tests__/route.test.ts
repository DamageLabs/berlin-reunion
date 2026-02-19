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

const mockSelectFrom = vi.fn();
const mockSelect = vi.fn().mockReturnValue({
  from: (...args: unknown[]) => mockSelectFrom(...args),
});

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  auditLog: {
    id: "id",
    action: "action",
    actorId: "actor_id",
    targetId: "target_id",
    targetEmail: "target_email",
    detail: "detail",
    createdAt: "created_at",
  },
  user: { id: "user.id", name: "user.name" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
  desc: (col: unknown) => ({ desc: col }),
  and: (...args: unknown[]) => ({ and: args }),
  count: () => "count",
  aliasedTable: (table: unknown, alias: string) => ({ ...table as object, _alias: alias }),
}));

import { GET } from "../route";

// --- Helpers ---

function makeRequest(query = "") {
  return new NextRequest(`http://localhost:3000/api/audit-logs${query}`);
}

function adminSession() {
  return { user: { id: "admin-1", name: "Admin", role: "admin" } };
}

function setupMockChain(logs: unknown[] = [], total = 0) {
  const limitFn = vi.fn().mockReturnValue({
    offset: vi.fn().mockResolvedValue(logs),
  });
  const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
  const whereFnLogs = vi.fn().mockReturnValue({ orderBy: orderByFn });
  const secondLeftJoinFn = vi.fn().mockReturnValue({ where: whereFnLogs });
  const firstLeftJoinFn = vi.fn().mockReturnValue({ leftJoin: secondLeftJoinFn });

  const whereFnCount = vi.fn().mockResolvedValue([{ value: total }]);

  let callCount = 0;
  mockSelectFrom.mockImplementation(() => {
    callCount++;
    if (callCount % 2 === 1) {
      return { leftJoin: firstLeftJoinFn };
    }
    return { where: whereFnCount };
  });

  return { firstLeftJoinFn, whereFnLogs, limitFn };
}

// --- Tests ---

describe("GET /api/audit-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller is moderator", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "mod-1", name: "Mod", role: "moderator" },
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("returns 403 when caller is regular user", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u-1", name: "User", role: "user" },
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("returns 200 with logs for admin", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    const sampleLogs = [
      {
        id: "log-1",
        action: "role.change",
        actorId: "admin-1",
        actorName: "Admin",
        targetId: "user-1",
        targetName: "User One",
        targetEmail: null,
        detail: '{"oldRole":"user","newRole":"moderator"}',
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    setupMockChain(sampleLogs, 1);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.logs).toHaveLength(1);
    expect(body.logs[0].detail).toEqual({ oldRole: "user", newRole: "moderator" });
    expect(body.total).toBe(1);
    expect(body.page).toBe(0);
    expect(body.limit).toBe(50);
  });

  it("returns empty logs array when no entries", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    setupMockChain([], 0);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.logs).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("parses page and limit from query params", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    setupMockChain([], 0);

    const res = await GET(makeRequest("?page=2&limit=10"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.page).toBe(2);
    expect(body.limit).toBe(10);
  });

  it("handles null detail gracefully", async () => {
    mockGetSession.mockResolvedValue(adminSession());
    setupMockChain(
      [
        {
          id: "log-2",
          action: "user.unban",
          actorId: "admin-1",
          actorName: "Admin",
          targetId: "user-1",
          targetName: "User One",
          targetEmail: null,
          detail: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      1,
    );

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.logs[0].detail).toBeNull();
  });
});
