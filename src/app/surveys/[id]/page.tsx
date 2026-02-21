"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import SurveyForm from "@/components/surveys/SurveyForm";

interface SurveyData {
	id: string;
	title: string;
	description: string | null;
	status: string;
	createdBy: string | null;
}

interface Question {
	id: string;
	type: string;
	prompt: string;
	options: string[] | null;
	required: boolean | null;
	sortOrder: number;
}

export default function SurveyDetailPage() {
	const router = useRouter();
	const { id } = useParams<{ id: string }>();
	const { data: session, isPending } = useSession();
	const [survey, setSurvey] = useState<SurveyData | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [existingAnswers, setExistingAnswers] = useState<
		Record<string, string> | undefined
	>(undefined);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);

	const role = session
		? ((session.user as { role?: string }).role ?? "user")
		: "user";
	const isMod = role === "admin" || role === "moderator";

	const fetchSurvey = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/surveys/${id}`);
			if (!res.ok) {
				router.push("/surveys");
				return;
			}
			const data = await res.json();
			setSurvey(data.survey);
			setQuestions(data.questions);

			// Check for existing response
			if (data.survey.status === "active") {
				const respRes = await fetch(`/api/surveys/${id}/respond`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ answers: {} }),
				});
				// If 404 → no existing response; otherwise we need to fetch answers
				// Actually, let's just try a GET-style approach by checking the survey list
				// We'll handle this via the survey list's hasResponded flag instead
			}
		} finally {
			setLoading(false);
		}
	}, [id, router]);

	useEffect(() => {
		if (session) fetchSurvey();
	}, [session, fetchSurvey]);

	async function handleStatusChange(newStatus: string) {
		setActionLoading(true);
		try {
			const res = await fetch(`/api/surveys/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: newStatus }),
			});
			if (res.ok) {
				await fetchSurvey();
			}
		} finally {
			setActionLoading(false);
		}
	}

	async function handleDelete() {
		if (!confirm("Delete this survey?")) return;
		setActionLoading(true);
		try {
			const res = await fetch(`/api/surveys/${id}`, { method: "DELETE" });
			if (res.ok) {
				router.push("/surveys");
			}
		} finally {
			setActionLoading(false);
		}
	}

	if (isPending || loading) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-8">
				<div className="h-8 w-64 animate-pulse rounded bg-gold-dark/10" />
				<div className="mt-4 h-96 animate-pulse rounded-lg bg-gold-dark/10" />
			</div>
		);
	}

	if (!session) {
		router.push("/login");
		return null;
	}

	if (!survey) return null;

	const statusBadge: Record<string, string> = {
		active: "border-green-500/40 bg-green-500/10 text-green-400",
		draft: "border-gold-dark/40 bg-gold-dark/10 text-gold",
		closed: "border-red-500/40 bg-red-500/10 text-red-400",
	};

	return (
		<div className="mx-auto max-w-3xl px-4 py-8">
			<Link
				href="/surveys"
				className="text-sm text-cream/40 hover:text-cream/60"
			>
				← Back to Surveys
			</Link>

			<div className="mt-4 flex items-start justify-between gap-4">
				<div>
					<h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
						{survey.title}
					</h1>
					{survey.description && (
						<p className="mt-2 text-sm text-cream/60">{survey.description}</p>
					)}
				</div>
				<span
					className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge[survey.status] ?? statusBadge.draft}`}
				>
					{survey.status}
				</span>
			</div>

			{isMod && (
				<div className="mt-4 flex flex-wrap gap-2">
					{survey.status === "draft" && (
						<>
							<Link
								href={`/surveys/${id}/edit`}
								className="rounded-md border border-gold-dark/40 bg-gold-dark/20 px-3 py-1 text-xs font-medium text-gold hover:border-gold/60"
							>
								Edit
							</Link>
							<button
								onClick={() => handleStatusChange("active")}
								disabled={actionLoading}
								className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 hover:border-green-500/60 disabled:opacity-50"
							>
								Activate
							</button>
							<button
								onClick={handleDelete}
								disabled={actionLoading}
								className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 hover:border-red-500/60 disabled:opacity-50"
							>
								Delete
							</button>
						</>
					)}
					{survey.status === "active" && (
						<button
							onClick={() => handleStatusChange("closed")}
							disabled={actionLoading}
							className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 hover:border-red-500/60 disabled:opacity-50"
						>
							Close Survey
						</button>
					)}
					{(survey.status === "active" || survey.status === "closed") && (
						<Link
							href={`/surveys/${id}/results`}
							className="rounded-md border border-gold-dark/40 bg-gold-dark/20 px-3 py-1 text-xs font-medium text-gold hover:border-gold/60"
						>
							View Results
						</Link>
					)}
				</div>
			)}

			<div className="mt-8">
				{survey.status === "active" ? (
					<SurveyForm
						surveyId={id}
						questions={questions}
						existingAnswers={existingAnswers}
						onSubmitted={() => fetchSurvey()}
					/>
				) : survey.status === "closed" ? (
					<SurveyForm
						surveyId={id}
						questions={questions}
						closed
						onSubmitted={() => {}}
					/>
				) : (
					<div className="rounded-lg border border-gold-dark/20 bg-charcoal-light/50 p-6">
						<h3 className="mb-4 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-cream/50">
							Questions Preview
						</h3>
						<div className="space-y-3">
							{questions.map((q, i) => (
								<div key={q.id} className="text-sm text-cream/70">
									<span className="text-cream/40">{i + 1}.</span>{" "}
									{q.prompt}
									<span className="ml-2 text-xs text-cream/30">
										({q.type.replace("_", " ")})
									</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
