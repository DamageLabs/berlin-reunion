"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { ExpandedEvent } from "./types";
import { formatEventTime } from "./utils";

export default function UpcomingEvents() {
	const [events, setEvents] = useState<ExpandedEvent[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/events/upcoming")
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (data?.events) setEvents(data.events);
			})
			.finally(() => setLoading(false));
	}, []);

	return (
		<div className="rounded-lg border border-gold-dark/20 p-6">
			<div className="flex items-center justify-between">
				<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-cream/80">
					Upcoming Events
				</h2>
				<Link
					href="/calendar"
					className="text-sm font-medium text-gold hover:text-gold-light"
				>
					View Calendar &rarr;
				</Link>
			</div>

			{loading ? (
				<div className="mt-3 space-y-2">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							className="h-12 animate-pulse rounded-md bg-gold-dark/10"
						/>
					))}
				</div>
			) : events.length === 0 ? (
				<p className="mt-3 text-sm text-cream/40">
					No upcoming events scheduled.
				</p>
			) : (
				<ul className="mt-3 space-y-2">
					{events.map((ev, i) => {
						const d = new Date(ev.startAt);
						return (
							<li
								key={`${ev.eventId}-${i}`}
								className="flex items-start gap-3 rounded-md border border-gold-dark/10 p-3"
							>
								<div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-gold-dark/20 text-center">
									<span className="text-xs font-medium uppercase text-gold/70">
										{d.toLocaleDateString(undefined, { month: "short" })}
									</span>
									<span className="text-sm font-bold leading-none text-gold">
										{d.getDate()}
									</span>
								</div>
								<div className="min-w-0">
									<div className="flex items-center gap-1.5">
										<p className="truncate text-sm font-medium text-cream/80">
											{ev.title}
										</p>
										{ev.visibility === "private" && (
											<span className="shrink-0 rounded border border-red-900/40 bg-red-950/20 px-1 py-0.5 text-[10px] font-medium uppercase leading-none text-red-400">
												Private
											</span>
										)}
									</div>
									<p className="text-xs text-cream/40">
										{formatEventTime(ev.startAt)}
										{ev.location && ` \u00B7 ${ev.location}`}
										{ev.isRecurring && " \u00B7 Recurring"}
									</p>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
