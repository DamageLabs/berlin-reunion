import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
	user: {
		id: "id",
		name: "name",
		email: "email",
		emailVerified: "email_verified",
		image: "image",
		createdAt: "created_at",
		username: "username",
		role: "role",
		banned: "banned",
		banReason: "ban_reason",
		banExpires: "ban_expires",
		location: "location",
	},
}));

vi.mock("drizzle-orm", () => ({
	count: () => "count",
	desc: (col: unknown) => ({ desc: col }),
	asc: (col: unknown) => ({ asc: col }),
	and: (...args: unknown[]) => ({ and: args }),
	eq: (col: unknown, val: unknown) => ({ eq: [col, val] }),
	like: (col: unknown, val: unknown) => ({ like: [col, val] }),
	or: (...args: unknown[]) => ({ or: args }),
}));

import { GET } from "../route";

// --- Helpers ---

function makeRequest(query = "") {
	return new NextRequest(`http://localhost:3000/api/admin/users${query}`);
}

function adminSession() {
	return { user: { id: "admin-1", name: "Admin", role: "admin" } };
}

function setupMockChain(users: unknown[] = [], total = 0) {
	const offsetFn = vi.fn().mockResolvedValue(users);
	const limitFn = vi.fn().mockReturnValue({ offset: offsetFn });
	const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
	const dataWhereFn = vi.fn().mockReturnValue({ orderBy: orderByFn });

	const countResult = vi.fn().mockResolvedValue([{ value: total }]);
	const countWhereFn = vi.fn().mockImplementation(() => countResult());

	let callCount = 0;
	mockSelectFrom.mockImplementation(() => {
		callCount++;
		if (callCount % 2 === 1) {
			return { where: dataWhereFn };
		}
		return { where: countWhereFn };
	});

	return { orderByFn, limitFn, offsetFn, dataWhereFn, countWhereFn };
}

// --- Tests ---

describe("GET /api/admin/users", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when unauthenticated", async () => {
		mockGetSession.mockResolvedValue(null);
		const res = await GET(makeRequest());
		expect(res.status).toBe(401);
	});

	it("returns 403 for regular users", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: "u-1", name: "User", role: "user" },
		});
		const res = await GET(makeRequest());
		expect(res.status).toBe(403);
	});

	it("returns 200 for moderator", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: "mod-1", name: "Mod", role: "moderator" },
		});
		setupMockChain([], 0);
		const res = await GET(makeRequest());
		expect(res.status).toBe(200);
	});

	it("returns 200 with users for admin", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const sampleUsers = [
			{
				id: "user-1",
				name: "Alice",
				email: "alice@example.com",
				emailVerified: true,
				image: null,
				createdAt: "2026-01-01T00:00:00.000Z",
				username: "alice",
				role: "user",
				banned: false,
				banReason: null,
				banExpires: null,
				location: "Berlin",
			},
		];
		setupMockChain(sampleUsers, 1);

		const res = await GET(makeRequest());
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.users).toHaveLength(1);
		expect(body.users[0].name).toBe("Alice");
		expect(body.total).toBe(1);
		expect(body.page).toBe(0);
		expect(body.limit).toBe(20);
	});

	it("parses page and limit from query params", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		setupMockChain([], 0);

		const res = await GET(makeRequest("?page=3&limit=10"));
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.page).toBe(3);
		expect(body.limit).toBe(10);
	});

	it("returns empty users array when no users exist", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		setupMockChain([], 0);

		const res = await GET(makeRequest());
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.users).toEqual([]);
		expect(body.total).toBe(0);
	});

	it("sorts by name asc by default", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const { orderByFn } = setupMockChain([], 0);

		const res = await GET(makeRequest());
		expect(res.status).toBe(200);
		expect(orderByFn).toHaveBeenCalledWith({ asc: "name" });
	});

	it("sorts by custom column and direction", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const { orderByFn } = setupMockChain([], 0);

		const res = await GET(makeRequest("?sort=role&dir=desc"));
		expect(res.status).toBe(200);
		expect(orderByFn).toHaveBeenCalledWith({ desc: "role" });
	});

	it("falls back to name for invalid sort column", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const { orderByFn } = setupMockChain([], 0);

		const res = await GET(makeRequest("?sort=invalid"));
		expect(res.status).toBe(200);
		expect(orderByFn).toHaveBeenCalledWith({ asc: "name" });
	});

	it("falls back to asc for invalid dir", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const { orderByFn } = setupMockChain([], 0);

		const res = await GET(makeRequest("?sort=email&dir=bogus"));
		expect(res.status).toBe(200);
		expect(orderByFn).toHaveBeenCalledWith({ asc: "email" });
	});

	it("applies search filter on name and username", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const { dataWhereFn, countWhereFn } = setupMockChain([], 0);

		const res = await GET(makeRequest("?search=alice"));
		expect(res.status).toBe(200);
		expect(dataWhereFn).toHaveBeenCalledWith({
			and: [
				{
					or: [
						{ like: ["name", "%alice%"] },
						{ like: ["username", "%alice%"] },
					],
				},
			],
		});
		expect(countWhereFn).toHaveBeenCalledWith(dataWhereFn.mock.calls[0][0]);
	});

	it("applies role filter", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const { dataWhereFn } = setupMockChain([], 0);

		const res = await GET(makeRequest("?role=admin"));
		expect(res.status).toBe(200);
		expect(dataWhereFn).toHaveBeenCalledWith({
			and: [{ eq: ["role", "admin"] }],
		});
	});

	it("applies verified=true filter", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const { dataWhereFn } = setupMockChain([], 0);

		const res = await GET(makeRequest("?verified=true"));
		expect(res.status).toBe(200);
		expect(dataWhereFn).toHaveBeenCalledWith({
			and: [{ eq: ["email_verified", true] }],
		});
	});

	it("applies verified=false filter", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const { dataWhereFn } = setupMockChain([], 0);

		const res = await GET(makeRequest("?verified=false"));
		expect(res.status).toBe(200);
		expect(dataWhereFn).toHaveBeenCalledWith({
			and: [{ eq: ["email_verified", false] }],
		});
	});

	it("applies status=banned filter", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const { dataWhereFn } = setupMockChain([], 0);

		const res = await GET(makeRequest("?status=banned"));
		expect(res.status).toBe(200);
		expect(dataWhereFn).toHaveBeenCalledWith({
			and: [{ eq: ["banned", true] }],
		});
	});

	it("applies status=active filter", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const { dataWhereFn } = setupMockChain([], 0);

		const res = await GET(makeRequest("?status=active"));
		expect(res.status).toBe(200);
		expect(dataWhereFn).toHaveBeenCalledWith({
			and: [{ eq: ["banned", false] }],
		});
	});

	it("combines multiple filters", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const { dataWhereFn } = setupMockChain([], 0);

		const res = await GET(makeRequest("?search=bob&role=user&status=active"));
		expect(res.status).toBe(200);
		const whereArg = dataWhereFn.mock.calls[0][0];
		expect(whereArg.and).toHaveLength(3);
		expect(whereArg.and[0]).toEqual({
			or: [{ like: ["name", "%bob%"] }, { like: ["username", "%bob%"] }],
		});
		expect(whereArg.and[1]).toEqual({ eq: ["role", "user"] });
		expect(whereArg.and[2]).toEqual({ eq: ["banned", false] });
	});

	it("ignores invalid role value", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const { dataWhereFn } = setupMockChain([], 0);

		const res = await GET(makeRequest("?role=superadmin"));
		expect(res.status).toBe(200);
		expect(dataWhereFn).toHaveBeenCalledWith(undefined);
	});

	it("ignores empty search string", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const { dataWhereFn } = setupMockChain([], 0);

		const res = await GET(makeRequest("?search="));
		expect(res.status).toBe(200);
		expect(dataWhereFn).toHaveBeenCalledWith(undefined);
	});

	it("applies where clause to count query", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const { dataWhereFn, countWhereFn } = setupMockChain([], 5);

		const res = await GET(makeRequest("?role=moderator"));
		expect(res.status).toBe(200);
		expect(countWhereFn).toHaveBeenCalledWith(dataWhereFn.mock.calls[0][0]);
	});
});
