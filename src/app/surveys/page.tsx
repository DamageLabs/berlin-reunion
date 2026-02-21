"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";

interface SurveyListItem {
	id: string;
	title: string;
	description: string | null;
	status: string;
	createdAt: string;
	hasResponded: boolean;
	responseCount: number;
}

const statusBadge: Record<string, string> = {
	active: "border-green-500/40 bg-green-500/10 text-green-400",
	draft: "border-gold-dark/40 bg-gold-dark/10 text-gold",
	closed: "border-red-500/40 bg-red-500/10 text-red-400",
};

export default function SurveysPage() {
	const router = useRouter();
	const { data: session, isPending } = useSession();
	const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
	const [loading, setLoading] = useState(true);

	const role = session
		? ((session.user as { role?: string }).role ?? "user")
		: "user";
	const isMod = role === "admin" || role === "moderator";

	const fetchSurveys = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/surveys");
			if (res.ok) {
				const data = await res.json();
				setSurveys(data.surveys);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (session) fetchSurveys();
	}, [session, fetchSurveys]);

	if (isPending) {
		return (
			<div className="mx-auto max-w-5xl px-4 py-8">
				<div className="h-8 w-48 animate-pulse rounded bg-gold-dark/10" />
				<div className="mt-4 h-64 animate-pulse rounded-lg bg-gold-dark/10" />
			</div>
		);
	}

	if (!session) {
		router.push("/login");
		return null;
	}

	return (
		<div className="mx-auto max-w-5xl px-4 py-8">
			<div className="flex items-center justify-between">
				<h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
					Surveys
				</h1>
				{isMod && (
					<Link
						href="/surveys/new"
						className="rounded-md border border-gold-dark/40 bg-gold-dark/20 px-4 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-gold hover:border-gold/60 hover:bg-gold-dark/30"
					>
						New Survey
					</Link>
				)}
			</div>

			<div className="mt-6 space-y-4">
				{loading ? (
					<div className="h-48 animate-pulse rounded-lg border border-gold-dark/20 bg-gold-dark/5" />
				) : surveys.length === 0 ? (
					<div className="rounded-lg border border-gold-dark/20 bg-charcoal-light/50 p-8 text-center text-cream/40">
						No surveys available.
					</div>
				) : (
					surveys.map((s) => (
						<Link
							key={s.id}
							href={`/surveys/${s.id}`}
							className="block rounded-lg border border-gold-dark/20 bg-charcoal-light/50 p-4 transition-colors hover:border-gold-dark/40 hover:bg-charcoal-light/70"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<h2 className="font-[family-name:var(--font-oswald)] text-lg font-medium text-cream">
											{s.title}
										</h2>
										{s.hasResponded && (
											<span className="rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
												Completed
											</span>
										)}
									</div>
									{s.description && (
										<p className="mt-1 text-sm text-cream/50 line-clamp-2">
											{s.description}
										</p>
									)}
									<p className="mt-2 text-xs text-cream/30">
										{s.responseCount}{" "}
										{s.responseCount === 1 ? "response" : "responses"}
									</p>
								</div>
								<span
									className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge[s.status] ?? statusBadge.draft}`}
								>
									{s.status}
								</span>
							</div>
						</Link>
					))
				)}
			</div>
		</div>
	);
}
