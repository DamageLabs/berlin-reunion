"use client";

import { useState } from "react";

const inputClass =
	"mt-1 w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none";

const QUESTION_TYPES = [
	{ value: "text", label: "Short Text" },
	{ value: "textarea", label: "Long Text" },
	{ value: "single_choice", label: "Single Choice" },
	{ value: "multiple_choice", label: "Multiple Choice" },
	{ value: "rating", label: "Rating (1–5)" },
] as const;

type QuestionDraft = {
	type: string;
	prompt: string;
	options: string[];
	required: boolean;
};

interface SurveyBuilderProps {
	initialTitle?: string;
	initialDescription?: string;
	initialQuestions?: QuestionDraft[];
	onSave: (data: {
		title: string;
		description: string;
		questions: QuestionDraft[];
	}) => Promise<void>;
	onCancel: () => void;
}

export default function SurveyBuilder({
	initialTitle = "",
	initialDescription = "",
	initialQuestions,
	onSave,
	onCancel,
}: SurveyBuilderProps) {
	const [title, setTitle] = useState(initialTitle);
	const [description, setDescription] = useState(initialDescription);
	const [questions, setQuestions] = useState<QuestionDraft[]>(
		initialQuestions ?? [
			{ type: "text", prompt: "", options: ["", ""], required: true },
		],
	);
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);

	function addQuestion() {
		setQuestions([
			...questions,
			{ type: "text", prompt: "", options: ["", ""], required: true },
		]);
	}

	function removeQuestion(index: number) {
		if (questions.length <= 1) return;
		setQuestions(questions.filter((_, i) => i !== index));
	}

	function updateQuestion(index: number, field: string, value: unknown) {
		const updated = [...questions];
		updated[index] = { ...updated[index], [field]: value };
		setQuestions(updated);
	}

	function moveQuestion(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= questions.length) return;
		const updated = [...questions];
		[updated[index], updated[target]] = [updated[target], updated[index]];
		setQuestions(updated);
	}

	function addOption(qIndex: number) {
		const updated = [...questions];
		updated[qIndex] = {
			...updated[qIndex],
			options: [...updated[qIndex].options, ""],
		};
		setQuestions(updated);
	}

	function removeOption(qIndex: number, oIndex: number) {
		const updated = [...questions];
		if (updated[qIndex].options.length <= 2) return;
		updated[qIndex] = {
			...updated[qIndex],
			options: updated[qIndex].options.filter((_, i) => i !== oIndex),
		};
		setQuestions(updated);
	}

	function updateOption(qIndex: number, oIndex: number, value: string) {
		const updated = [...questions];
		const opts = [...updated[qIndex].options];
		opts[oIndex] = value;
		updated[qIndex] = { ...updated[qIndex], options: opts };
		setQuestions(updated);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		if (!title.trim()) {
			setError("Title is required");
			return;
		}

		for (let i = 0; i < questions.length; i++) {
			const q = questions[i];
			if (!q.prompt.trim()) {
				setError(`Question ${i + 1} needs a prompt`);
				return;
			}
			if (q.type === "single_choice" || q.type === "multiple_choice") {
				const validOpts = q.options.filter((o) => o.trim());
				if (validOpts.length < 2) {
					setError(`Question ${i + 1} needs at least 2 options`);
					return;
				}
			}
		}

		setSaving(true);
		try {
			const cleanedQuestions = questions.map((q) => ({
				...q,
				options:
					q.type === "single_choice" || q.type === "multiple_choice"
						? q.options.filter((o) => o.trim())
						: [],
			}));
			await onSave({
				title: title.trim(),
				description: description.trim(),
				questions: cleanedQuestions,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setSaving(false);
		}
	}

	const isChoice = (type: string) =>
		type === "single_choice" || type === "multiple_choice";

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{error && (
				<div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
					{error}
				</div>
			)}

			<div>
				<label className="text-sm font-medium text-cream/70">Title</label>
				<input
					type="text"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					className={inputClass}
					placeholder="Survey title"
				/>
			</div>

			<div>
				<label className="text-sm font-medium text-cream/70">
					Description
				</label>
				<textarea
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					className={`${inputClass} min-h-[80px]`}
					placeholder="Optional description"
				/>
			</div>

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-gold">
						Questions
					</h3>
					<button
						type="button"
						onClick={addQuestion}
						className="rounded-md border border-gold-dark/40 bg-gold-dark/20 px-3 py-1 text-xs font-medium text-gold hover:border-gold/60"
					>
						+ Add Question
					</button>
				</div>

				{questions.map((q, qi) => (
					<div
						key={qi}
						className="rounded-lg border border-gold-dark/20 bg-charcoal-light/50 p-4 space-y-3"
					>
						<div className="flex items-center justify-between gap-2">
							<span className="text-xs font-medium text-cream/40">
								Q{qi + 1}
							</span>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => moveQuestion(qi, -1)}
									disabled={qi === 0}
									className="rounded px-1.5 py-0.5 text-xs text-cream/40 hover:text-cream/70 disabled:opacity-30"
								>
									↑
								</button>
								<button
									type="button"
									onClick={() => moveQuestion(qi, 1)}
									disabled={qi === questions.length - 1}
									className="rounded px-1.5 py-0.5 text-xs text-cream/40 hover:text-cream/70 disabled:opacity-30"
								>
									↓
								</button>
								<button
									type="button"
									onClick={() => removeQuestion(qi)}
									disabled={questions.length <= 1}
									className="rounded px-1.5 py-0.5 text-xs text-red-400/60 hover:text-red-400 disabled:opacity-30"
								>
									Remove
								</button>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="text-xs text-cream/50">Type</label>
								<select
									value={q.type}
									onChange={(e) =>
										updateQuestion(qi, "type", e.target.value)
									}
									className={inputClass}
								>
									{QUESTION_TYPES.map((t) => (
										<option key={t.value} value={t.value}>
											{t.label}
										</option>
									))}
								</select>
							</div>
							<div className="flex items-end">
								<label className="flex items-center gap-2 text-xs text-cream/50">
									<input
										type="checkbox"
										checked={q.required}
										onChange={(e) =>
											updateQuestion(qi, "required", e.target.checked)
										}
										className="accent-gold"
									/>
									Required
								</label>
							</div>
						</div>

						<div>
							<label className="text-xs text-cream/50">Prompt</label>
							<input
								type="text"
								value={q.prompt}
								onChange={(e) =>
									updateQuestion(qi, "prompt", e.target.value)
								}
								className={inputClass}
								placeholder="Enter your question"
							/>
						</div>

						{isChoice(q.type) && (
							<div className="space-y-2">
								<label className="text-xs text-cream/50">Options</label>
								{q.options.map((opt, oi) => (
									<div key={oi} className="flex items-center gap-2">
										<input
											type="text"
											value={opt}
											onChange={(e) =>
												updateOption(qi, oi, e.target.value)
											}
											className={`${inputClass} mt-0`}
											placeholder={`Option ${oi + 1}`}
										/>
										<button
											type="button"
											onClick={() => removeOption(qi, oi)}
											disabled={q.options.length <= 2}
											className="text-xs text-red-400/60 hover:text-red-400 disabled:opacity-30"
										>
											×
										</button>
									</div>
								))}
								<button
									type="button"
									onClick={() => addOption(qi)}
									className="text-xs text-gold/60 hover:text-gold"
								>
									+ Add option
								</button>
							</div>
						)}
					</div>
				))}
			</div>

			<div className="flex justify-end gap-3 pt-4 border-t border-gold-dark/20">
				<button
					type="button"
					onClick={onCancel}
					className="rounded-md border border-gold-dark/30 px-4 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-cream/60 hover:text-cream/80"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={saving}
					className="rounded-md border border-gold-dark/40 bg-gold-dark/20 px-4 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-gold hover:border-gold/60 hover:bg-gold-dark/30 disabled:opacity-50"
				>
					{saving ? "Saving…" : "Save Survey"}
				</button>
			</div>
		</form>
	);
}
