"use client";

import { useState } from "react";
import type { ExpandedEvent, ICSEventData } from "./types";
import { formatEventTime } from "./utils";
import { generateICS, downloadICS } from "@/lib/ics";
import ModalOverlay from "@/components/ModalOverlay";

interface EventDetailModalProps {
	event: ExpandedEvent;
	onClose: () => void;
	onEdit?: () => void;
	onDelete?: () => void;
	canManageEvents: boolean;
}

const RECURRENCE_LABELS: Record<string, string> = {
	daily: "Daily",
	weekly: "Weekly",
	biweekly: "Every 2 weeks",
	monthly: "Monthly",
	yearly: "Yearly",
};

export default function EventDetailModal({
	event,
	onClose,
	onEdit,
	onDelete,
	canManageEvents,
}: EventDetailModalProps) {
	const [downloading, setDownloading] = useState(false);
	const startDate = new Date(event.startAt);
	const endDate = new Date(startDate.getTime() + event.durationMinutes * 60000);

	async function handleAddToCalendar() {
		setDownloading(true);
		try {
			let icsData: ICSEventData = {
				id: event.eventId,
				title: event.title,
				description: event.description,
				startAt: event.startAt,
				durationMinutes: event.durationMinutes,
				location: event.location,
			};

			if (event.isRecurring) {
				const res = await fetch(`/api/events/${event.eventId}`);
				if (res.ok) {
					const detail = await res.json();
					icsData = {
						...icsData,
						recurrenceType: detail.recurrenceType,
						recurrenceEndAt: detail.recurrenceEndAt,
					};
				}
			}

			const ics = generateICS(icsData);
			const slug = event.title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "");
			downloadICS(`${slug}.ics`, ics);
		} finally {
			setDownloading(false);
		}
	}

	return (
		<ModalOverlay open={true} onClose={onClose} panelClassName="w-full max-w-md">
			{(labelId) => (
				<>
					{/* Header */}
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-2">
							<h3
								id={labelId}
								className="font-[family-name:var(--font-oswald)] text-xl font-semibold uppercase tracking-wider text-gold"
							>
								{event.title}
							</h3>
							{event.visibility === "private" && (
								<span className="rounded border border-red-900/40 bg-red-950/20 px-1.5 py-0.5 font-[family-name:var(--font-oswald)] text-xs font-medium uppercase tracking-wider text-red-400">
									Private
								</span>
							)}
						</div>
						<button
							onClick={onClose}
							className="text-cream/40 hover:text-cream/70"
							aria-label="Close"
						>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</button>
					</div>

					{/* Details */}
					<dl className="mt-4 space-y-3 text-sm">
						<div>
							<dt className="text-cream/50">Date</dt>
							<dd className="text-cream/80">
								{startDate.toLocaleDateString(undefined, {
									weekday: "long",
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							</dd>
						</div>
						<div>
							<dt className="text-cream/50">Time</dt>
							<dd className="text-cream/80">
								{formatEventTime(event.startAt)} &ndash;{" "}
								{endDate.toLocaleTimeString(undefined, {
									hour: "2-digit",
									minute: "2-digit",
									hour12: false,
								})}
								<span className="ml-2 text-cream/40">
									({event.durationMinutes} min)
								</span>
							</dd>
						</div>
						{event.location && (
							<div>
								<dt className="text-cream/50">Location</dt>
								<dd className="text-cream/80">{event.location}</dd>
							</div>
						)}
						{event.recurrenceType && (
							<div>
								<dt className="text-cream/50">Recurrence</dt>
								<dd className="text-cream/80">
									{RECURRENCE_LABELS[event.recurrenceType] ?? event.recurrenceType}
								</dd>
							</div>
						)}
						{event.description && (
							<div>
								<dt className="text-cream/50">Description</dt>
								<dd className="whitespace-pre-wrap text-cream/80">
									{event.description}
								</dd>
							</div>
						)}
					</dl>

					{/* Actions */}
					<div className="mt-6 flex justify-end gap-2">
						{canManageEvents && (
							<>
								<button
									onClick={onEdit}
									className="rounded-md border border-gold-dark/40 bg-charcoal-light px-3 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-gold hover:border-gold/60 hover:bg-gold-dark/20"
								>
									Edit
								</button>
								<button
									onClick={onDelete}
									className="rounded-md border border-red-900/40 bg-red-950/20 px-3 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-red-400 hover:border-red-700/60 hover:bg-red-950/40"
								>
									Delete
								</button>
							</>
						)}
						<button
							onClick={handleAddToCalendar}
							disabled={downloading}
							className="flex items-center gap-1.5 rounded-md border border-gold-dark/40 bg-charcoal-light px-3 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-gold hover:border-gold/60 hover:bg-gold-dark/20 disabled:opacity-50"
						>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
							</svg>
							{downloading ? "Downloading..." : "Add to Calendar"}
						</button>
						<button
							onClick={onClose}
							className="rounded-md border border-gold-dark/30 px-3 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-cream/60 hover:text-cream/80"
						>
							Close
						</button>
					</div>
				</>
			)}
		</ModalOverlay>
	);
}
