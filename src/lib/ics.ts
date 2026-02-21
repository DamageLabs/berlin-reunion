import type { ICSEventData } from "@/components/calendar/types";

function formatUTCDate(date: Date): string {
	const y = date.getUTCFullYear();
	const m = String(date.getUTCMonth() + 1).padStart(2, "0");
	const d = String(date.getUTCDate()).padStart(2, "0");
	const h = String(date.getUTCHours()).padStart(2, "0");
	const min = String(date.getUTCMinutes()).padStart(2, "0");
	const s = String(date.getUTCSeconds()).padStart(2, "0");
	return `${y}${m}${d}T${h}${min}${s}Z`;
}

function escapeText(text: string): string {
	return text
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\r?\n/g, "\\n");
}

function buildRRule(recurrenceType: string, recurrenceEndAt?: string | null): string {
	const freqMap: Record<string, string> = {
		daily: "FREQ=DAILY",
		weekly: "FREQ=WEEKLY",
		biweekly: "FREQ=WEEKLY;INTERVAL=2",
		monthly: "FREQ=MONTHLY",
		yearly: "FREQ=YEARLY",
	};

	const freq = freqMap[recurrenceType];
	if (!freq) return "";

	let rrule = freq;
	if (recurrenceEndAt) {
		rrule += `;UNTIL=${formatUTCDate(new Date(recurrenceEndAt))}`;
	}

	return rrule;
}

export function generateICS(event: ICSEventData): string {
	const startDate = new Date(event.startAt);
	const endDate = new Date(startDate.getTime() + event.durationMinutes * 60000);
	const now = new Date();

	const lines: string[] = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Berlin Reunion//Calendar//EN",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"BEGIN:VEVENT",
		`UID:${event.id}@berlin-reunion`,
		`DTSTAMP:${formatUTCDate(now)}`,
		`DTSTART:${formatUTCDate(startDate)}`,
		`DTEND:${formatUTCDate(endDate)}`,
		`SUMMARY:${escapeText(event.title)}`,
	];

	if (event.description) {
		lines.push(`DESCRIPTION:${escapeText(event.description)}`);
	}

	if (event.location) {
		lines.push(`LOCATION:${escapeText(event.location)}`);
	}

	if (event.recurrenceType) {
		const rrule = buildRRule(event.recurrenceType, event.recurrenceEndAt);
		if (rrule) {
			lines.push(`RRULE:${rrule}`);
		}
	}

	lines.push("END:VEVENT", "END:VCALENDAR");

	return lines.join("\r\n");
}

export function downloadICS(filename: string, icsContent: string): void {
	const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
