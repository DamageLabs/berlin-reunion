import type { ExpandedEvent } from "./types";

export interface CalendarDay {
	date: Date;
	isCurrentMonth: boolean;
	isToday: boolean;
}

/**
 * Returns an array of CalendarDay objects for a 6-row (42-cell) month grid.
 */
export function getCalendarDays(year: number, month: number): CalendarDay[] {
	const today = new Date();
	const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

	const firstDay = new Date(year, month, 1);
	const startOffset = firstDay.getDay(); // 0=Sun

	const days: CalendarDay[] = [];

	for (let i = 0; i < 42; i++) {
		const date = new Date(year, month, 1 - startOffset + i);
		const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
		days.push({
			date,
			isCurrentMonth: date.getMonth() === month,
			isToday: dateStr === todayStr,
		});
	}

	return days;
}

/**
 * Groups expanded events by day key (YYYY-MM-DD in local time).
 */
export function groupEventsByDay(
	events: ExpandedEvent[],
): Map<string, ExpandedEvent[]> {
	const map = new Map<string, ExpandedEvent[]>();

	for (const ev of events) {
		const d = new Date(ev.startAt);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		const existing = map.get(key);
		if (existing) {
			existing.push(ev);
		} else {
			map.set(key, [ev]);
		}
	}

	return map;
}

/**
 * Returns a day key string for a Date object.
 */
export function dayKey(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Formats event time for display in 24h format (e.g., "14:30").
 */
export function formatEventTime(isoString: string): string {
	const d = new Date(isoString);
	return d.toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}
