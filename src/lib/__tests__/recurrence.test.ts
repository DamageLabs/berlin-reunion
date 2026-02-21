import { describe, it, expect } from "vitest";
import { expandEvents, type EventRow } from "../recurrence";

function makeEvent(overrides: Partial<EventRow> = {}): EventRow {
	return {
		id: "evt-1",
		title: "Test Event",
		description: null,
		startAt: new Date("2025-03-15T10:00:00Z"),
		durationMinutes: 60,
		location: null,
		recurrenceType: null,
		recurrenceEndAt: null,
		createdBy: "user-1",
		updatedBy: null,
		createdAt: new Date("2025-03-01T00:00:00Z"),
		updatedAt: new Date("2025-03-01T00:00:00Z"),
		visibility: "public",
		...overrides,
	};
}

describe("expandEvents", () => {
	describe("one-time events", () => {
		it("includes event within range", () => {
			const events = [makeEvent()];
			const result = expandEvents(
				events,
				new Date("2025-03-01T00:00:00Z"),
				new Date("2025-04-01T00:00:00Z"),
			);
			expect(result).toHaveLength(1);
			expect(result[0].eventId).toBe("evt-1");
			expect(result[0].isRecurring).toBe(false);
		});

		it("excludes event outside range", () => {
			const events = [makeEvent()];
			const result = expandEvents(
				events,
				new Date("2025-04-01T00:00:00Z"),
				new Date("2025-05-01T00:00:00Z"),
			);
			expect(result).toHaveLength(0);
		});

		it("returns empty for empty input", () => {
			const result = expandEvents(
				[],
				new Date("2025-03-01T00:00:00Z"),
				new Date("2025-04-01T00:00:00Z"),
			);
			expect(result).toHaveLength(0);
		});
	});

	describe("daily recurrence", () => {
		it("expands daily events within range", () => {
			const events = [
				makeEvent({
					recurrenceType: "daily",
					startAt: new Date("2025-03-10T10:00:00Z"),
				}),
			];
			const result = expandEvents(
				events,
				new Date("2025-03-10T00:00:00Z"),
				new Date("2025-03-13T00:00:00Z"),
			);
			expect(result).toHaveLength(3);
			expect(result[0].startAt).toBe("2025-03-10T10:00:00.000Z");
			expect(result[1].startAt).toBe("2025-03-11T10:00:00.000Z");
			expect(result[2].startAt).toBe("2025-03-12T10:00:00.000Z");
		});

		it("respects recurrenceEndAt", () => {
			const events = [
				makeEvent({
					recurrenceType: "daily",
					startAt: new Date("2025-03-10T10:00:00Z"),
					recurrenceEndAt: new Date("2025-03-11T23:59:59Z"),
				}),
			];
			const result = expandEvents(
				events,
				new Date("2025-03-10T00:00:00Z"),
				new Date("2025-03-20T00:00:00Z"),
			);
			expect(result).toHaveLength(2);
		});
	});

	describe("weekly recurrence", () => {
		it("expands weekly events", () => {
			const events = [
				makeEvent({
					recurrenceType: "weekly",
					startAt: new Date("2025-03-03T18:00:00Z"),
				}),
			];
			const result = expandEvents(
				events,
				new Date("2025-03-01T00:00:00Z"),
				new Date("2025-04-01T00:00:00Z"),
			);
			// Mar 3, 10, 17, 24, 31
			expect(result).toHaveLength(5);
			expect(result.every((e) => e.isRecurring)).toBe(true);
		});
	});

	describe("biweekly recurrence", () => {
		it("expands biweekly events", () => {
			const events = [
				makeEvent({
					recurrenceType: "biweekly",
					startAt: new Date("2025-03-01T12:00:00Z"),
				}),
			];
			const result = expandEvents(
				events,
				new Date("2025-03-01T00:00:00Z"),
				new Date("2025-04-30T00:00:00Z"),
			);
			// Mar 1, Mar 15, Mar 29, Apr 12, Apr 26
			expect(result).toHaveLength(5);
		});
	});

	describe("monthly recurrence", () => {
		it("expands monthly events", () => {
			const events = [
				makeEvent({
					recurrenceType: "monthly",
					startAt: new Date("2025-01-15T10:00:00Z"),
				}),
			];
			const result = expandEvents(
				events,
				new Date("2025-01-01T00:00:00Z"),
				new Date("2025-06-01T00:00:00Z"),
			);
			expect(result).toHaveLength(5); // Jan, Feb, Mar, Apr, May
		});

		it("clamps day for short months (Jan 31 → Feb 28)", () => {
			const events = [
				makeEvent({
					recurrenceType: "monthly",
					startAt: new Date("2025-01-31T10:00:00Z"),
				}),
			];
			const result = expandEvents(
				events,
				new Date("2025-01-01T00:00:00Z"),
				new Date("2025-04-01T00:00:00Z"),
			);
			expect(result).toHaveLength(3);
			// Feb should clamp to 28
			const febEvent = result[1];
			const febDate = new Date(febEvent.startAt);
			expect(febDate.getUTCMonth()).toBe(1); // February
			expect(febDate.getUTCDate()).toBe(28);
		});
	});

	describe("yearly recurrence", () => {
		it("expands yearly events", () => {
			const events = [
				makeEvent({
					recurrenceType: "yearly",
					startAt: new Date("2023-06-15T10:00:00Z"),
				}),
			];
			const result = expandEvents(
				events,
				new Date("2023-01-01T00:00:00Z"),
				new Date("2026-12-31T00:00:00Z"),
			);
			expect(result).toHaveLength(4); // 2023, 2024, 2025, 2026
		});

		it("handles leap year (Feb 29 → Feb 28)", () => {
			const events = [
				makeEvent({
					recurrenceType: "yearly",
					startAt: new Date("2024-02-29T10:00:00Z"),
				}),
			];
			const result = expandEvents(
				events,
				new Date("2024-01-01T00:00:00Z"),
				new Date("2026-12-31T00:00:00Z"),
			);
			expect(result).toHaveLength(3);
			// 2025 should clamp to Feb 28
			const y2025 = result[1];
			const d = new Date(y2025.startAt);
			expect(d.getUTCFullYear()).toBe(2025);
			expect(d.getUTCMonth()).toBe(1);
			expect(d.getUTCDate()).toBe(28);
		});
	});

	describe("sorting", () => {
		it("returns events sorted by startAt", () => {
			const events = [
				makeEvent({
					id: "evt-b",
					startAt: new Date("2025-03-20T10:00:00Z"),
				}),
				makeEvent({
					id: "evt-a",
					startAt: new Date("2025-03-10T10:00:00Z"),
				}),
			];
			const result = expandEvents(
				events,
				new Date("2025-03-01T00:00:00Z"),
				new Date("2025-04-01T00:00:00Z"),
			);
			expect(result[0].eventId).toBe("evt-a");
			expect(result[1].eventId).toBe("evt-b");
		});
	});

	describe("edge cases", () => {
		it("does not emit events starting before range even if recurring", () => {
			const events = [
				makeEvent({
					recurrenceType: "weekly",
					startAt: new Date("2025-03-01T10:00:00Z"),
				}),
			];
			const result = expandEvents(
				events,
				new Date("2025-03-10T00:00:00Z"),
				new Date("2025-03-20T00:00:00Z"),
			);
			// Only Mar 15 should be in range (Mar 8 < rangeStart, Mar 22 >= rangeEnd)
			expect(result).toHaveLength(1);
			expect(result[0].startAt).toBe("2025-03-15T10:00:00.000Z");
		});

		it("handles no recurrence end with a large range (capped at 366)", () => {
			const events = [
				makeEvent({
					recurrenceType: "daily",
					startAt: new Date("2025-01-01T10:00:00Z"),
				}),
			];
			const result = expandEvents(
				events,
				new Date("2025-01-01T00:00:00Z"),
				new Date("2027-01-01T00:00:00Z"),
			);
			expect(result.length).toBeLessThanOrEqual(366);
		});
	});
});
