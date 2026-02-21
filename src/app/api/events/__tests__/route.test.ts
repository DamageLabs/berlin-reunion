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

const mockInsert = vi.fn();
const mockSelect = vi.fn();
vi.mock("@/db", () => ({
	db: {
		insert: (...args: unknown[]) => mockInsert(...args),
		select: (...args: unknown[]) => mockSelect(...args),
	},
}));

vi.mock("@/db/schema", () => ({
	event: { id: "event.id", startAt: "event.start_at" },
}));

vi.mock("drizzle-orm", () => ({
	and: (...args: unknown[]) => ({ and: args }),
	gte: (col: unknown, val: unknown) => ({ gte: { col, val } }),
	lte: (col: unknown, val: unknown) => ({ lte: { col, val } }),
}));

const mockLogAuditEvent = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/audit", () => ({
	logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

vi.mock("@/lib/recurrence", () => ({
	expandEvents: vi.fn().mockReturnValue([]),
}));

import { GET, POST } from "../route";

// --- Helpers ---

function makeGetRequest(start: string, end: string) {
	return new NextRequest(
		`http://localhost:3000/api/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
	);
}

function makePostRequest(body: Record<string, unknown>) {
	return new NextRequest("http://localhost:3000/api/events", {
		method: "POST",
		body: JSON.stringify(body),
		headers: { "Content-Type": "application/json" },
	});
}

function adminSession() {
	return { user: { id: "admin-1", name: "Admin", role: "admin" } };
}

function userSession() {
	return { user: { id: "user-1", name: "User", role: "user" } };
}

// --- Tests ---

describe("GET /api/events", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when unauthenticated", async () => {
		mockGetSession.mockResolvedValue(null);
		const res = await GET(
			makeGetRequest("2025-03-01", "2025-04-01"),
		);
		expect(res.status).toBe(401);
	});

	it("returns 400 when start/end missing", async () => {
		mockGetSession.mockResolvedValue(userSession());
		const res = await GET(
			new NextRequest("http://localhost:3000/api/events"),
		);
		expect(res.status).toBe(400);
	});

	it("returns events on success", async () => {
		mockGetSession.mockResolvedValue(userSession());
		mockSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([]),
			}),
		});

		const res = await GET(
			makeGetRequest("2025-03-01T00:00:00Z", "2025-04-01T00:00:00Z"),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveProperty("events");
	});
});

describe("POST /api/events", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when unauthenticated", async () => {
		mockGetSession.mockResolvedValue(null);
		const res = await POST(makePostRequest({ title: "Test" }));
		expect(res.status).toBe(401);
	});

	it("returns 403 for regular user", async () => {
		mockGetSession.mockResolvedValue(userSession());
		const res = await POST(makePostRequest({ title: "Test" }));
		expect(res.status).toBe(403);
	});

	it("returns 400 when title missing", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const res = await POST(makePostRequest({ startAt: "2025-03-15T10:00:00Z" }));
		expect(res.status).toBe(400);
	});

	it("returns 400 when startAt missing", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const res = await POST(makePostRequest({ title: "Test" }));
		expect(res.status).toBe(400);
	});

	it("returns 400 for invalid recurrenceType", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const res = await POST(
			makePostRequest({
				title: "Test",
				startAt: "2025-03-15T10:00:00Z",
				recurrenceType: "hourly",
			}),
		);
		expect(res.status).toBe(400);
	});

	it("returns 400 for invalid visibility", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		const res = await POST(
			makePostRequest({
				title: "Test",
				startAt: "2025-03-15T10:00:00Z",
				visibility: "secret",
			}),
		);
		expect(res.status).toBe(400);
	});

	it("returns 201 on success", async () => {
		mockGetSession.mockResolvedValue(adminSession());
		mockInsert.mockReturnValue({
			values: vi.fn().mockResolvedValue(undefined),
		});

		const res = await POST(
			makePostRequest({
				title: "Team Call",
				startAt: "2025-03-15T10:00:00Z",
				durationMinutes: 90,
			}),
		);
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.title).toBe("Team Call");
		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "event.create",
				actorId: "admin-1",
			}),
		);
	});
});
