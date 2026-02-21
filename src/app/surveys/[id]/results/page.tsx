"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import SurveyResults from "@/components/surveys/SurveyResults";

interface ResultsData {
	survey: { id: string; title: string; status: string };
	totalResponses: number;
	questions: Array<{
		questionId: string;
		prompt: string;
		type: string;
		options?: Array<{ option: string; count: number; percentage: number }>;
		avg?: number;
		min?: number;
		max?: number;
		count?: number;
		values?: string[];
	}>;
	responses: Array<{
		userId: string;
		userName: string;
		submittedAt: string;
		answers: Record<string, string | null>;
	}>;
}

function escapeCsv(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

function exportCsv(data: ResultsData) {
	const questions = data.questions;
	const headers = [
		"User",
		"Submitted",
		...questions.map((q) => q.prompt),
	];

	const rows = data.responses.map((r) => {
		const answCells = questions.map((q) => {
			const val = r.answers[q.questionId];
			if (val == null || val === "") return "";
			if (q.type === "multiple_choice") {
				try {
					return (JSON.parse(val) as string[]).join("; ");
				} catch {
					return val;
				}
			}
			return val;
		});
		return [
			r.userName,
			new Date(r.submittedAt).toLocaleDateString(),
			...answCells,
		];
	});

	const csv = [headers, ...rows]
		.map((row) => row.map((c) => escapeCsv(c)).join(","))
		.join("\n");

	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${data.survey.title.replace(/[^a-zA-Z0-9]/g, "_")}_results.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

export default function SurveyResultsPage() {
	const router = useRouter();
	const { id } = useParams<{ id: string }>();
	const { data: session, isPending } = useSession();
	const [data, setData] = useState<ResultsData | null>(null);
	const [loading, setLoading] = useState(true);

	const role = session
		? ((session.user as { role?: string }).role ?? "user")
		: "user";
	const isMod = role === "admin" || role === "moderator";

	const fetchResults = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/surveys/${id}/results`);
			if (!res.ok) {
				router.push("/surveys");
				return;
			}
			setData(await res.json());
		} finally {
			setLoading(false);
		}
	}, [id, router]);

	useEffect(() => {
		if (session && isMod) fetchResults();
	}, [session, isMod, fetchResults]);

	if (isPending || loading) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-8">
				<div className="h-8 w-48 animate-pulse rounded bg-gold-dark/10" />
				<div className="mt-4 h-96 animate-pulse rounded-lg bg-gold-dark/10" />
			</div>
		);
	}

	if (!session || !isMod) {
		router.push("/surveys");
		return null;
	}

	if (!data) return null;

	return (
		<div className="mx-auto max-w-3xl px-4 py-8">
			<Link
				href={`/surveys/${id}`}
				className="text-sm text-cream/40 hover:text-cream/60"
			>
				← Back to Survey
			</Link>

			<div className="mt-4 flex items-center justify-between gap-4">
				<h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
					Results: {data.survey.title}
				</h1>
				{data.responses.length > 0 && (
					<button
						type="button"
						onClick={() => exportCsv(data)}
						className="shrink-0 rounded-md border border-gold-dark/30 bg-charcoal-light/50 px-3 py-1.5 text-sm text-cream/70 hover:bg-charcoal-light hover:text-cream transition-colors"
					>
						Export CSV
					</button>
				)}
			</div>

			<div className="mt-6">
				{/* biome-ignore lint/suspicious/noExplicitAny: results API returns union types */}
				<SurveyResults
					totalResponses={data.totalResponses}
					questions={data.questions as any}
					responses={data.responses}
					questionMeta={data.questions.map((q) => ({
						questionId: q.questionId,
						prompt: q.prompt,
						type: q.type,
					}))}
				/>
			</div>
		</div>
	);
}
