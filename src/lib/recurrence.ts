export type RecurrenceType =
	| "daily"
	| "weekly"
	| "biweekly"
	| "monthly"
	| "yearly";

export interface EventRow {
	id: string;
	title: string;
	description: string | null;
	startAt: Date;
	durationMinutes: number;
	location: string | null;
	recurrenceType: string | null;
	recurrenceEndAt: Date | null;
	createdBy: string;
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	visibility: string;
}

export interface ExpandedEvent {
	eventId: string;
	title: string;
	description: string | null;
	startAt: string; // ISO string
	durationMinutes: number;
	location: string | null;
	recurrenceType: string | null;
	isRecurring: boolean;
	visibility: string;
}

const MAX_ITERATIONS = 366;

function addInterval(date: Date, type: RecurrenceType): Date {
	const next = new Date(date);
	switch (type) {
		case "daily":
			next.setUTCDate(next.getUTCDate() + 1);
			break;
		case "weekly":
			next.setUTCDate(next.getUTCDate() + 7);
			break;
		case "biweekly":
			next.setUTCDate(next.getUTCDate() + 14);
			break;
		case "monthly": {
			const originalDay = date.getUTCDate();
			next.setUTCMonth(next.getUTCMonth() + 1);
			// Clamp day if the month doesn't have enough days
			if (next.getUTCDate() !== originalDay) {
				next.setUTCDate(0); // last day of previous month
			}
			break;
		}
		case "yearly": {
			const origDay = date.getUTCDate();
			next.setUTCFullYear(next.getUTCFullYear() + 1);
			// Handle Feb 29 → Feb 28 in non-leap years
			if (next.getUTCDate() !== origDay) {
				next.setUTCDate(0);
			}
			break;
		}
	}
	return next;
}

function toExpandedEvent(ev: EventRow, occurrenceStart: Date): ExpandedEvent {
	return {
		eventId: ev.id,
		title: ev.title,
		description: ev.description,
		startAt: occurrenceStart.toISOString(),
		durationMinutes: ev.durationMinutes,
		location: ev.location,
		recurrenceType: ev.recurrenceType,
		isRecurring: !!ev.recurrenceType,
		visibility: ev.visibility,
	};
}

export function expandEvents(
	events: EventRow[],
	rangeStart: Date,
	rangeEnd: Date,
): ExpandedEvent[] {
	const results: ExpandedEvent[] = [];

	for (const ev of events) {
		if (!ev.recurrenceType) {
			// One-time event: emit if startAt falls in range
			if (ev.startAt >= rangeStart && ev.startAt < rangeEnd) {
				results.push(toExpandedEvent(ev, ev.startAt));
			}
			continue;
		}

		const recType = ev.recurrenceType as RecurrenceType;
		let current = new Date(ev.startAt);
		let iterations = 0;

		while (iterations < MAX_ITERATIONS) {
			if (current >= rangeEnd) break;
			if (ev.recurrenceEndAt && current > ev.recurrenceEndAt) break;

			if (current >= rangeStart) {
				results.push(toExpandedEvent(ev, current));
			}

			current = addInterval(current, recType);
			iterations++;
		}
	}

	// Sort by startAt ascending
	results.sort(
		(a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
	);

	return results;
}
