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

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDeleteFn = vi.fn();
vi.mock("@/db", () => ({
	db: {
		select: (...args: unknown[]) => mockSelect(...args),
		update: (...args: unknown[]) => mockUpdate(...args),
		delete: (...args: unknown[]) => mockDeleteFn(...args),
	},
}));

vi.mock("@/db/schema", () => ({
	event: { id: "event.id" },
}));

vi.mock("drizzle-orm", () => ({
	eq: (col: unknown, val: unknown) => ({ col, val }),
}));

const mockLogAuditEvent = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/audit", () => ({
	logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

import { GET, PUT, DELETE } from "../route";

// --- Helpers ---

function makeParams(id: string) {
	return { params: Promise.resolve({ id }) };
}

function makeRequest(id: string, method = "GET", body?: Record<string, unknown>) {
	const options: RequestInit = { method };
	if (body) {
		options.body = JSON.stringify(body);
		options.headers = { "Content-Type": "application/json" };
	}
	return new NextRequest(`http://localhost:3000/api/events/${id}`, options);
}

function adminSession() {
	return { user: { id: "admin-1", name: "Admin", role: "admin" } };
}

function userSession() {
	return { user: { id: "user-1", name: "User", role: "user" } };
}

function mockEventRow(overrides?: Record<string, unknown>) {
	return {
		id: "evt-1",
		title: "Test Event",
		description: null,
		startAt: new Date("2025-03-15T10:00:00Z"),
		durationMinutes: 60,
		location: null,
		recurrenceType: null,
		recurrenceEndAt: null,
		createdBy: "admin-1",
		updatedBy: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		visibility: "public",
		...overrides,
	};
}

// --- Tests ---

describe("GET /api/events/[id]", () => {
	beforeEach(() => vi.clearAllMocks());

	it("returns 401 when unauthenticated", async () => {
		mockGetSession.mockResolvedValue(null);
		const res = await GET(makeRequest("evt-1"), makeParams("evt-1"));
		expect(res.status).toBe(401);
	});

	it("returns 404 when event not found", async () => {
		mockGetSession.mockResolvedValue(userSession());
		mockSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([]),
			}),
		});
		const res = await GET(makeRequest("evt-999"), makeParams("evt-999"));
		expect(res.status).toBe(404);
	});

	it("returns event on success", async () => {
		mockGetSession.mockResolvedValue(userSession());
		mockSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([mockEventRow()]),
			}),
		});
		const res = await GET(makeRequest("evt-1"), makeParams("evt-1"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.event.title).toBe("Test Event");
	});

	it("returns 404 for private event when user is regular", async () => {
		mockGetSession.mockResolvedValue(userSession());
		mockSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([mockEventRow({ visibility: "private" })]),
			}),
		});
		const res = await GET(makeRequest("evt-1"), makeParams("evt-1"));
		expect(res.status).toBe(404);
	});

	it("returns private event for admin", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		mockSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([mockEventRow({ visibility: "private" })]),
			}),
		});
		const res = await GET(makeRequest("evt-1"), makeParams("evt-1"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.event.title).toBe("Test Event");
	});
});

describe("PUT /api/events/[id]", () => {
	beforeEach(() => vi.clearAllMocks());

	it("returns 401 when unauthenticated", async () => {
		mockGetSession.mockResolvedValue(null);
		const res = await PUT(
			makeRequest("evt-1", "PUT", { title: "Updated" }),
			makeParams("evt-1"),
		);
		expect(res.status).toBe(401);
	});

	it("returns 403 for regular user", async () => {
		mockGetSession.mockResolvedValue(userSession());
		const res = await PUT(
			makeRequest("evt-1", "PUT", { title: "Updated" }),
			makeParams("evt-1"),
		);
		expect(res.status).toBe(403);
	});

	it("returns 404 when event not found", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		mockSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([]),
			}),
		});
		const res = await PUT(
			makeRequest("evt-999", "PUT", { title: "Updated" }),
			makeParams("evt-999"),
		);
		expect(res.status).toBe(404);
	});

	it("returns 200 on success and audit logs", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		mockSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([mockEventRow()]),
			}),
		});
		mockUpdate.mockReturnValue({
			set: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue(undefined),
			}),
		});

		const res = await PUT(
			makeRequest("evt-1", "PUT", { title: "Updated Title" }),
			makeParams("evt-1"),
		);
		expect(res.status).toBe(200);
		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "event.update",
				actorId: "admin-1",
				targetId: "evt-1",
			}),
		);
	});
});

describe("DELETE /api/events/[id]", () => {
	beforeEach(() => vi.clearAllMocks());

	it("returns 401 when unauthenticated", async () => {
		mockGetSession.mockResolvedValue(null);
		const res = await DELETE(makeRequest("evt-1", "DELETE"), makeParams("evt-1"));
		expect(res.status).toBe(401);
	});

	it("returns 403 for regular user", async () => {
		mockGetSession.mockResolvedValue(userSession());
		const res = await DELETE(makeRequest("evt-1", "DELETE"), makeParams("evt-1"));
		expect(res.status).toBe(403);
	});

	it("returns 404 when event not found", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		mockSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([]),
			}),
		});
		const res = await DELETE(makeRequest("evt-999", "DELETE"), makeParams("evt-999"));
		expect(res.status).toBe(404);
	});

	it("returns 200 on success, audit logs before delete", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		mockSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([mockEventRow()]),
			}),
		});
		mockDeleteFn.mockReturnValue({
			where: vi.fn().mockResolvedValue(undefined),
		});

		const res = await DELETE(makeRequest("evt-1", "DELETE"), makeParams("evt-1"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "event.delete",
				actorId: "admin-1",
				targetId: "evt-1",
				detail: { title: "Test Event" },
			}),
		);
	});
});
