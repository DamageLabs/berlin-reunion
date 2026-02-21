"use client";

import type { ExpandedEvent } from "./types";
import { getCalendarDays, groupEventsByDay, dayKey } from "./utils";
import EventChip from "./EventChip";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarGridProps {
	year: number;
	month: number;
	events: ExpandedEvent[];
	onEventClick: (event: ExpandedEvent) => void;
}

export default function CalendarGrid({
	year,
	month,
	events,
	onEventClick,
}: CalendarGridProps) {
	const days = getCalendarDays(year, month);
	const eventsByDay = groupEventsByDay(events);

	return (
		<div className="overflow-hidden rounded-lg border border-gold-dark/20">
			{/* Day-of-week header */}
			<div className="grid grid-cols-7 border-b border-gold-dark/20 bg-charcoal-light">
				{DAY_LABELS.map((label) => (
					<div
						key={label}
						className="px-2 py-2 text-center font-[family-name:var(--font-oswald)] text-xs font-medium uppercase tracking-wider text-cream/50"
					>
						{label}
					</div>
				))}
			</div>

			{/* Calendar cells */}
			<div className="grid grid-cols-7">
				{days.map((day, i) => {
					const key = dayKey(day.date);
					const dayEvents = eventsByDay.get(key) ?? [];

					return (
						<div
							key={i}
							className={`min-h-[80px] border-b border-r border-gold-dark/10 p-1 ${
								!day.isCurrentMonth
									? "bg-charcoal-light/50"
									: "bg-charcoal"
							}`}
						>
							<div
								className={`mb-1 text-right text-xs ${
									day.isToday
										? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-gold text-charcoal font-bold float-right"
										: day.isCurrentMonth
											? "text-cream/60"
											: "text-cream/25"
								}`}
							>
								{day.date.getDate()}
							</div>
							<div className="clear-both space-y-0.5">
								{dayEvents.slice(0, 3).map((ev, j) => (
									<EventChip
										key={`${ev.eventId}-${j}`}
										event={ev}
										onClick={onEventClick}
									/>
								))}
								{dayEvents.length > 3 && (
									<div className="px-1 text-xs text-cream/40">
										+{dayEvents.length - 3} more
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
