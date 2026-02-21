"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import EventDetailModal from "@/components/calendar/EventDetailModal";
import EventFormModal from "@/components/calendar/EventFormModal";
import type { ExpandedEvent, EventDetail, EventFormData } from "@/components/calendar/types";

export default function CalendarPage() {
	const router = useRouter();
	const { data: session, isPending } = useSession();

	const now = new Date();
	const [year, setYear] = useState(now.getFullYear());
	const [month, setMonth] = useState(now.getMonth());
	const [events, setEvents] = useState<ExpandedEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedEvent, setSelectedEvent] = useState<ExpandedEvent | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [editEvent, setEditEvent] = useState<EventDetail | null>(null);

	const role = session
		? ((session.user as { role?: string }).role ?? "user")
		: "user";
	const canManageEvents = role === "admin" || role === "moderator";

	const fetchEvents = useCallback(async () => {
		setLoading(true);
		const start = new Date(year, month, 1);
		const end = new Date(year, month + 1, 1);

		try {
			const res = await fetch(
				`/api/events?start=${start.toISOString()}&end=${end.toISOString()}`,
			);
			if (res.ok) {
				const data = await res.json();
				setEvents(data.events);
			}
		} finally {
			setLoading(false);
		}
	}, [year, month]);

	useEffect(() => {
		if (session) fetchEvents();
	}, [session, fetchEvents]);

	function handlePrev() {
		if (month === 0) {
			setMonth(11);
			setYear((y) => y - 1);
		} else {
			setMonth((m) => m - 1);
		}
	}

	function handleNext() {
		if (month === 11) {
			setMonth(0);
			setYear((y) => y + 1);
		} else {
			setMonth((m) => m + 1);
		}
	}

	async function handleSave(data: EventFormData, eventId?: string) {
		// Convert local datetime to UTC ISO string
		const startUtc = new Date(data.startAt).toISOString();
		const recurrenceEndUtc = data.recurrenceEndAt
			? new Date(data.recurrenceEndAt).toISOString()
			: null;

		const body = {
			title: data.title,
			description: data.description || null,
			startAt: startUtc,
			durationMinutes: data.durationMinutes,
			location: data.location || null,
			recurrenceType: data.recurrenceType || null,
			recurrenceEndAt: recurrenceEndUtc,
			visibility: data.visibility,
		};

		const url = eventId ? `/api/events/${eventId}` : "/api/events";
		const method = eventId ? "PUT" : "POST";

		const res = await fetch(url, {
			method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.error || "Failed to save event");
		}

		await fetchEvents();
	}

	async function handleDelete() {
		if (!selectedEvent) return;
		if (!confirm("Are you sure you want to delete this event?")) return;

		const res = await fetch(`/api/events/${selectedEvent.eventId}`, {
			method: "DELETE",
		});

		if (res.ok) {
			setSelectedEvent(null);
			await fetchEvents();
		}
	}

	async function handleEdit() {
		if (!selectedEvent) return;
		// Fetch the full event detail for the edit form
		const res = await fetch(`/api/events/${selectedEvent.eventId}`);
		if (res.ok) {
			const data = await res.json();
			setEditEvent(data.event);
			setSelectedEvent(null);
			setShowForm(true);
		}
	}

	if (isPending) {
		return (
			<div className="mx-auto max-w-5xl px-4 py-8">
				<div className="h-8 w-48 animate-pulse rounded bg-gold-dark/10" />
				<div className="mt-4 h-[500px] animate-pulse rounded-lg bg-gold-dark/10" />
			</div>
		);
	}

	if (!session) {
		router.push("/login");
		return null;
	}

	return (
		<div className="mx-auto max-w-5xl px-4 py-8">
			<CalendarHeader
				year={year}
				month={month}
				onPrev={handlePrev}
				onNext={handleNext}
				onCreateEvent={() => {
					setEditEvent(null);
					setShowForm(true);
				}}
				canManageEvents={canManageEvents}
			/>

			<div className="mt-4">
				{loading ? (
					<div className="h-[500px] animate-pulse rounded-lg border border-gold-dark/20 bg-gold-dark/5" />
				) : (
					<CalendarGrid
						year={year}
						month={month}
						events={events}
						onEventClick={setSelectedEvent}
					/>
				)}
			</div>

			{selectedEvent && (
				<EventDetailModal
					event={selectedEvent}
					onClose={() => setSelectedEvent(null)}
					onEdit={handleEdit}
					onDelete={handleDelete}
					canManageEvents={canManageEvents}
				/>
			)}

			{showForm && (
				<EventFormModal
					event={editEvent}
					onClose={() => {
						setShowForm(false);
						setEditEvent(null);
					}}
					onSave={handleSave}
				/>
			)}
		</div>
	);
}
