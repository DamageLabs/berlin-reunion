"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import SurveyBuilder from "@/components/surveys/SurveyBuilder";

interface SurveyData {
	id: string;
	title: string;
	description: string | null;
	status: string;
}

interface Question {
	id: string;
	type: string;
	prompt: string;
	options: string[] | null;
	required: boolean | null;
	sortOrder: number;
}

export default function EditSurveyPage() {
	const router = useRouter();
	const { id } = useParams<{ id: string }>();
	const { data: session, isPending } = useSession();
	const [survey, setSurvey] = useState<SurveyData | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [loading, setLoading] = useState(true);

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
			if (data.survey.status !== "draft") {
				router.push(`/surveys/${id}`);
				return;
			}
			setSurvey(data.survey);
			setQuestions(data.questions);
		} finally {
			setLoading(false);
		}
	}, [id, router]);

	useEffect(() => {
		if (session) fetchSurvey();
	}, [session, fetchSurvey]);

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

	if (!survey) return null;

	async function handleSave(data: {
		title: string;
		description: string;
		questions: { type: string; prompt: string; options: string[]; required: boolean }[];
	}) {
		const res = await fetch(`/api/surveys/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.error || "Failed to update survey");
		}

		router.push(`/surveys/${id}`);
	}

	const initialQuestions = questions.map((q) => ({
		type: q.type,
		prompt: q.prompt,
		options: q.options ?? ["", ""],
		required: q.required !== false,
	}));

	return (
		<div className="mx-auto max-w-3xl px-4 py-8">
			<h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
				Edit Survey
			</h1>
			<div className="mt-6">
				<SurveyBuilder
					initialTitle={survey.title}
					initialDescription={survey.description ?? ""}
					initialQuestions={initialQuestions}
					onSave={handleSave}
					onCancel={() => router.push(`/surveys/${id}`)}
				/>
			</div>
		</div>
	);
}
