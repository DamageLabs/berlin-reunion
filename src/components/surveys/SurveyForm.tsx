"use client";

import { useState } from "react";

const inputClass =
	"mt-1 w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none";

interface Question {
	id: string;
	type: string;
	prompt: string;
	options: string[] | null;
	required: boolean | null;
	sortOrder: number;
}

interface SurveyFormProps {
	surveyId: string;
	questions: Question[];
	existingAnswers?: Record<string, string>;
	closed?: boolean;
	onSubmitted: () => void;
}

export default function SurveyForm({
	surveyId,
	questions,
	existingAnswers,
	closed,
	onSubmitted,
}: SurveyFormProps) {
	const isUpdate = !!existingAnswers;
	const [answers, setAnswers] = useState<Record<string, string>>(
		existingAnswers ?? {},
	);
	const [error, setError] = useState("");
	const [submitting, setSubmitting] = useState(false);

	function setAnswer(questionId: string, value: string) {
		setAnswers((prev) => ({ ...prev, [questionId]: value }));
	}

	function toggleMultiple(questionId: string, option: string) {
		setAnswers((prev) => {
			let selected: string[] = [];
			try {
				selected = JSON.parse(prev[questionId] || "[]");
			} catch { /* empty */ }
			const next = selected.includes(option)
				? selected.filter((s) => s !== option)
				: [...selected, option];
			return { ...prev, [questionId]: JSON.stringify(next) };
		});
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		// Validate required fields
		for (const q of questions) {
			if (q.required && (!answers[q.id] || answers[q.id].trim() === "")) {
				setError(`Please answer: "${q.prompt}"`);
				return;
			}
			if (
				q.required &&
				q.type === "multiple_choice"
			) {
				try {
					const selected = JSON.parse(answers[q.id] || "[]");
					if (selected.length === 0) {
						setError(`Please select at least one option for: "${q.prompt}"`);
						return;
					}
				} catch {
					setError(`Please answer: "${q.prompt}"`);
					return;
				}
			}
		}

		setSubmitting(true);
		try {
			const res = await fetch(`/api/surveys/${surveyId}/respond`, {
				method: isUpdate ? "PUT" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ answers }),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to submit");
			}

			onSubmitted();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to submit");
		} finally {
			setSubmitting(false);
		}
	}

	if (closed) {
		return (
			<div className="rounded-lg border border-gold-dark/20 bg-charcoal-light/50 p-6 text-center text-cream/50">
				This survey is closed and no longer accepting responses.
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{error && (
				<div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
					{error}
				</div>
			)}

			{isUpdate && (
				<div className="rounded-md border border-gold-dark/30 bg-gold-dark/10 px-4 py-3 text-sm text-gold/80">
					You have already responded. You can update your answers below.
				</div>
			)}

			{questions.map((q) => (
				<div key={q.id} className="space-y-2">
					<label className="text-sm font-medium text-cream/80">
						{q.prompt}
						{q.required && <span className="ml-1 text-gold">*</span>}
					</label>

					{q.type === "text" && (
						<input
							type="text"
							value={answers[q.id] ?? ""}
							onChange={(e) => setAnswer(q.id, e.target.value)}
							className={inputClass}
							placeholder="Your answer"
						/>
					)}

					{q.type === "textarea" && (
						<textarea
							value={answers[q.id] ?? ""}
							onChange={(e) => setAnswer(q.id, e.target.value)}
							className={`${inputClass} min-h-[100px]`}
							placeholder="Your answer"
						/>
					)}

					{q.type === "single_choice" && q.options && (
						<div className="space-y-1.5 pl-1">
							{q.options.map((opt) => (
								<label
									key={opt}
									className="flex items-center gap-2 text-sm text-cream/70 cursor-pointer"
								>
									<input
										type="radio"
										name={`q-${q.id}`}
										value={opt}
										checked={answers[q.id] === opt}
										onChange={() => setAnswer(q.id, opt)}
										className="accent-gold"
									/>
									{opt}
								</label>
							))}
						</div>
					)}

					{q.type === "multiple_choice" && q.options && (
						<div className="space-y-1.5 pl-1">
							{q.options.map((opt) => {
								let selected: string[] = [];
								try {
									selected = JSON.parse(answers[q.id] || "[]");
								} catch { /* empty */ }
								return (
									<label
										key={opt}
										className="flex items-center gap-2 text-sm text-cream/70 cursor-pointer"
									>
										<input
											type="checkbox"
											checked={selected.includes(opt)}
											onChange={() => toggleMultiple(q.id, opt)}
											className="accent-gold"
										/>
										{opt}
									</label>
								);
							})}
						</div>
					)}

					{q.type === "rating" && (
						<div className="flex items-center gap-3 pl-1">
							{[1, 2, 3, 4, 5].map((n) => (
								<label
									key={n}
									className="flex items-center gap-1 text-sm text-cream/70 cursor-pointer"
								>
									<input
										type="radio"
										name={`q-${q.id}`}
										value={String(n)}
										checked={answers[q.id] === String(n)}
										onChange={() => setAnswer(q.id, String(n))}
										className="accent-gold"
									/>
									{n}
								</label>
							))}
						</div>
					)}
				</div>
			))}

			<div className="pt-4 border-t border-gold-dark/20">
				<button
					type="submit"
					disabled={submitting}
					className="rounded-md border border-gold-dark/40 bg-gold-dark/20 px-4 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-gold hover:border-gold/60 hover:bg-gold-dark/30 disabled:opacity-50"
				>
					{submitting
						? "Submitting…"
						: isUpdate
							? "Update Response"
							: "Submit Response"}
				</button>
			</div>
		</form>
	);
}
