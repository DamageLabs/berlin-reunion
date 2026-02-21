"use client";

interface ChoiceOption {
	option: string;
	count: number;
	percentage: number;
}

interface ChoiceResult {
	questionId: string;
	prompt: string;
	type: "single_choice" | "multiple_choice";
	options: ChoiceOption[];
}

interface RatingResult {
	questionId: string;
	prompt: string;
	type: "rating";
	avg: number;
	min: number;
	max: number;
	count: number;
}

interface TextResult {
	questionId: string;
	prompt: string;
	type: "text" | "textarea";
	values: string[];
}

type QuestionResult = ChoiceResult | RatingResult | TextResult;

interface UserResponse {
	userId: string;
	userName: string;
	submittedAt: string;
	answers: Record<string, string | null>;
}

interface QuestionMeta {
	questionId: string;
	prompt: string;
	type: string;
}

interface SurveyResultsProps {
	totalResponses: number;
	questions: QuestionResult[];
	responses?: UserResponse[];
	questionMeta?: QuestionMeta[];
}

export default function SurveyResults({
	totalResponses,
	questions,
	responses,
	questionMeta,
}: SurveyResultsProps) {
	return (
		<div className="space-y-6">
			<div className="rounded-lg border border-gold-dark/20 bg-charcoal-light/50 p-4 text-center">
				<span className="text-3xl font-bold text-gold">{totalResponses}</span>
				<p className="mt-1 text-sm text-cream/50">
					{totalResponses === 1 ? "Response" : "Responses"}
				</p>
			</div>

			{questions.map((q) => (
				<div
					key={q.questionId}
					className="rounded-lg border border-gold-dark/20 bg-charcoal-light/50 p-4 space-y-3"
				>
					<h3 className="text-sm font-medium text-cream/80">{q.prompt}</h3>
					<span className="text-xs text-cream/40">
						{q.type.replace("_", " ")}
					</span>

					{(q.type === "single_choice" || q.type === "multiple_choice") &&
						renderChoiceResult(q)}

					{q.type === "rating" && renderRatingResult(q)}

					{(q.type === "text" || q.type === "textarea") &&
						renderTextResult(q)}
				</div>
			))}

			{questions.length === 0 && (
				<p className="text-center text-sm text-cream/40">
					No questions in this survey.
				</p>
			)}

			{responses && responses.length > 0 && questionMeta && (
				<div className="space-y-3">
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-gold">
						Per-User Responses
					</h2>
					<div className="overflow-x-auto rounded-lg border border-gold-dark/20">
						<table className="w-full text-left text-sm">
							<thead>
								<tr className="border-b border-gold-dark/20 bg-charcoal-light/50">
									<th className="whitespace-nowrap px-3 py-2 font-medium text-cream/70">
										User
									</th>
									<th className="whitespace-nowrap px-3 py-2 font-medium text-cream/70">
										Submitted
									</th>
									{questionMeta.map((qm) => (
										<th
											key={qm.questionId}
											className="whitespace-nowrap px-3 py-2 font-medium text-cream/70"
											title={qm.prompt}
										>
											{qm.prompt.length > 30
												? `${qm.prompt.slice(0, 30)}...`
												: qm.prompt}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{responses.map((r) => (
									<tr
										key={r.userId}
										className="border-b border-gold-dark/10 hover:bg-charcoal-light/30"
									>
										<td className="whitespace-nowrap px-3 py-2 text-cream/80">
											{r.userName}
										</td>
										<td className="whitespace-nowrap px-3 py-2 text-cream/50">
											{new Date(r.submittedAt).toLocaleDateString()}
										</td>
										{questionMeta.map((qm) => (
											<td
												key={qm.questionId}
												className="px-3 py-2 text-cream/60"
											>
												{formatAnswerValue(
													r.answers[qm.questionId],
													qm.type,
												)}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}

function renderChoiceResult(q: ChoiceResult) {
	return (
		<div className="space-y-2">
			{q.options.map((opt) => (
				<div key={opt.option} className="space-y-1">
					<div className="flex items-center justify-between text-xs text-cream/60">
						<span>{opt.option}</span>
						<span>
							{opt.count} ({opt.percentage}%)
						</span>
					</div>
					<div className="h-2 rounded-full bg-charcoal overflow-hidden">
						<div
							className="h-full rounded-full bg-gold transition-all"
							style={{ width: `${opt.percentage}%` }}
						/>
					</div>
				</div>
			))}
		</div>
	);
}

function renderRatingResult(q: RatingResult) {
	return (
		<div className="flex items-center gap-6">
			<div className="text-center">
				<span className="text-3xl font-bold text-gold">{q.avg}</span>
				<p className="text-xs text-cream/40">Average</p>
			</div>
			<div className="flex gap-4 text-center">
				<div>
					<span className="text-lg font-medium text-cream/70">{q.min}</span>
					<p className="text-xs text-cream/40">Min</p>
				</div>
				<div>
					<span className="text-lg font-medium text-cream/70">{q.max}</span>
					<p className="text-xs text-cream/40">Max</p>
				</div>
				<div>
					<span className="text-lg font-medium text-cream/70">{q.count}</span>
					<p className="text-xs text-cream/40">Rated</p>
				</div>
			</div>
		</div>
	);
}

function renderTextResult(q: TextResult) {
	if (q.values.length === 0) {
		return <p className="text-xs text-cream/40">No responses yet.</p>;
	}
	return (
		<div className="max-h-48 overflow-y-auto space-y-2">
			{q.values.map((v, i) => (
				<div
					key={i}
					className="rounded border border-gold-dark/10 bg-charcoal px-3 py-2 text-sm text-cream/70"
				>
					{v}
				</div>
			))}
		</div>
	);
}

function formatAnswerValue(
	value: string | null | undefined,
	questionType: string,
): string {
	if (value == null || value === "") return "—";
	if (questionType === "multiple_choice") {
		try {
			const parsed = JSON.parse(value) as string[];
			return parsed.join(", ");
		} catch {
			return value;
		}
	}
	return value;
}
