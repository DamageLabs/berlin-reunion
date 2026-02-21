"use client";

import type { ExpandedEvent } from "./types";
import { formatEventTime } from "./utils";

interface EventChipProps {
	event: ExpandedEvent;
	onClick: (event: ExpandedEvent) => void;
}

export default function EventChip({ event, onClick }: EventChipProps) {
	const isPrivate = event.visibility === "private";

	return (
		<button
			onClick={() => onClick(event)}
			className={`flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-xs text-cream/80 hover:bg-gold-dark/30 ${
				isPrivate ? "bg-red-950/20 border border-red-900/20" : "bg-gold-dark/20"
			}`}
			title={`${event.title} - ${formatEventTime(event.startAt)}${isPrivate ? " (Private)" : ""}`}
		>
			{isPrivate && (
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 shrink-0 text-red-400/70">
					<path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
				</svg>
			)}
			{event.isRecurring && (
				<span className="shrink-0 text-gold/60">&#8634;</span>
			)}
			<span className="truncate">{event.title}</span>
		</button>
	);
}
