import { describe, it, expect, vi, beforeEach } from "vitest";

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
vi.mock("@/db", () => ({
	db: {
		select: (...args: unknown[]) => mockSelect(...args),
	},
}));

vi.mock("@/db/schema", () => ({
	event: { startAt: "event.start_at" },
}));

vi.mock("drizzle-orm", () => ({
	lte: (col: unknown, val: unknown) => ({ lte: { col, val } }),
}));

const mockExpandEvents = vi.fn();
vi.mock("@/lib/recurrence", () => ({
	expandEvents: (...args: unknown[]) => mockExpandEvents(...args),
}));

import { GET } from "../route";

// --- Tests ---

describe("GET /api/events/upcoming", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when unauthenticated", async () => {
		mockGetSession.mockResolvedValue(null);
		const res = await GET();
		expect(res.status).toBe(401);
	});

	it("returns up to 5 upcoming events", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: "user-1", name: "User", role: "user" },
		});
		mockSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([]),
			}),
		});

		const mockEvents = Array.from({ length: 7 }, (_, i) => ({
			eventId: `evt-${i}`,
			title: `Event ${i}`,
			startAt: new Date(Date.now() + i * 86400000).toISOString(),
			durationMinutes: 60,
			isRecurring: false,
		}));
		mockExpandEvents.mockReturnValue(mockEvents);

		const res = await GET();
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.events).toHaveLength(5);
	});

	it("returns empty array when no events", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: "user-1", name: "User", role: "user" },
		});
		mockSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([]),
			}),
		});
		mockExpandEvents.mockReturnValue([]);

		const res = await GET();
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.events).toHaveLength(0);
	});
});
