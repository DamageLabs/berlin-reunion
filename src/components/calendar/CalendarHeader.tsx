"use client";

const MONTH_NAMES = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];

interface CalendarHeaderProps {
	year: number;
	month: number;
	onPrev: () => void;
	onNext: () => void;
	onCreateEvent?: () => void;
	canManageEvents: boolean;
}

export default function CalendarHeader({
	year,
	month,
	onPrev,
	onNext,
	onCreateEvent,
	canManageEvents,
}: CalendarHeaderProps) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-3">
				<button
					onClick={onPrev}
					className="rounded-md border border-gold-dark/30 px-2 py-1 text-cream/60 hover:border-gold/50 hover:text-gold"
					aria-label="Previous month"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
						<path d="m15 18-6-6 6-6" />
					</svg>
				</button>
				<h2 className="font-[family-name:var(--font-oswald)] text-xl font-semibold uppercase tracking-wider text-gold">
					{MONTH_NAMES[month]} {year}
				</h2>
				<button
					onClick={onNext}
					className="rounded-md border border-gold-dark/30 px-2 py-1 text-cream/60 hover:border-gold/50 hover:text-gold"
					aria-label="Next month"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
						<path d="m9 18 6-6-6-6" />
					</svg>
				</button>
			</div>

			{canManageEvents && onCreateEvent && (
				<button
					onClick={onCreateEvent}
					className="rounded-md border border-gold-dark/40 bg-gold-dark/20 px-4 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-gold hover:border-gold/60 hover:bg-gold-dark/30"
				>
					+ Create Event
				</button>
			)}
		</div>
	);
}
