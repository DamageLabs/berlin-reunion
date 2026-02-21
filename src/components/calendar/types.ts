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

export interface EventDetail {
	id: string;
	title: string;
	description: string | null;
	startAt: string; // ISO string (from DB timestamp)
	durationMinutes: number;
	location: string | null;
	recurrenceType: string | null;
	recurrenceEndAt: string | null;
	createdBy: string | null;
	updatedBy: string | null;
	createdAt: string;
	updatedAt: string;
	visibility: string;
}

export interface ICSEventData {
	id: string;
	title: string;
	description?: string | null;
	startAt: string;
	durationMinutes: number;
	location?: string | null;
	recurrenceType?: string | null;
	recurrenceEndAt?: string | null;
}

export interface EventFormData {
	title: string;
	description: string;
	startAt: string; // datetime-local value
	durationMinutes: number;
	location: string;
	recurrenceType: string; // "" for none
	recurrenceEndAt: string; // datetime-local value, "" for none
	visibility: string; // "public" | "private"
}
