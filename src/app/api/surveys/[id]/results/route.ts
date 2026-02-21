import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
	survey,
	surveyAnswer,
	surveyQuestion,
	surveyResponse,
	user,
} from "@/db/schema";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

// GET /api/surveys/[id]/results — Aggregated results (moderator+ only)
export async function GET(_request: NextRequest, { params }: Params) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const role = (session.user as { role?: string }).role ?? "user";
	if (role !== "admin" && role !== "moderator") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const { id } = await params;
	const rows = await db.select().from(survey).where(eq(survey.id, id));
	if (rows.length === 0) {
		return NextResponse.json({ error: "Survey not found" }, { status: 404 });
	}

	// Total response count
	const countResult = await db
		.select({ count: sql<number>`count(*)`.as("count") })
		.from(surveyResponse)
		.where(eq(surveyResponse.surveyId, id));
	const totalResponses = countResult[0]?.count ?? 0;

	// Get questions
	const questions = await db
		.select()
		.from(surveyQuestion)
		.where(eq(surveyQuestion.surveyId, id))
		.orderBy(surveyQuestion.sortOrder);

	// Get all answers for this survey's questions
	const questionIds = questions.map((q) => q.id);
	const allAnswers =
		questionIds.length > 0
			? await db
					.select()
					.from(surveyAnswer)
					.where(
						sql`${surveyAnswer.questionId} IN (${sql.join(
							questionIds.map((qid) => sql`${qid}`),
							sql`, `,
						)})`,
					)
			: [];

	// Build per-question aggregation
	const questionResults = questions.map((q) => {
		const qAnswers = allAnswers.filter((a) => a.questionId === q.id);
		const options = q.options ? JSON.parse(q.options) as string[] : null;

		if (q.type === "single_choice" || q.type === "multiple_choice") {
			const optionCounts: Record<string, number> = {};
			for (const opt of options ?? []) {
				optionCounts[opt] = 0;
			}
			for (const a of qAnswers) {
				if (!a.value) continue;
				if (q.type === "multiple_choice") {
					// multiple_choice stores JSON array
					try {
						const selected = JSON.parse(a.value) as string[];
						for (const s of selected) {
							optionCounts[s] = (optionCounts[s] ?? 0) + 1;
						}
					} catch {
						// single value fallback
						optionCounts[a.value] = (optionCounts[a.value] ?? 0) + 1;
					}
				} else {
					optionCounts[a.value] = (optionCounts[a.value] ?? 0) + 1;
				}
			}

			const total = q.type === "multiple_choice"
				? Object.values(optionCounts).reduce((a, b) => a + b, 0)
				: qAnswers.length;

			return {
				questionId: q.id,
				prompt: q.prompt,
				type: q.type,
				options: (options ?? []).map((opt) => ({
					option: opt,
					count: optionCounts[opt] ?? 0,
					percentage: total > 0 ? Math.round(((optionCounts[opt] ?? 0) / total) * 100) : 0,
				})),
			};
		}

		if (q.type === "rating") {
			const values = qAnswers
				.map((a) => Number(a.value))
				.filter((v) => !Number.isNaN(v));
			const avg =
				values.length > 0
					? values.reduce((a, b) => a + b, 0) / values.length
					: 0;
			return {
				questionId: q.id,
				prompt: q.prompt,
				type: q.type,
				avg: Math.round(avg * 10) / 10,
				min: values.length > 0 ? Math.min(...values) : 0,
				max: values.length > 0 ? Math.max(...values) : 0,
				count: values.length,
			};
		}

		// text / textarea
		return {
			questionId: q.id,
			prompt: q.prompt,
			type: q.type,
			values: qAnswers.map((a) => a.value).filter(Boolean),
		};
	});

	// Per-user response breakdown
	const responseRows = await db
		.select({
			responseId: surveyResponse.id,
			userId: surveyResponse.userId,
			userName: user.name,
			displayUsername: user.displayUsername,
			submittedAt: surveyResponse.submittedAt,
		})
		.from(surveyResponse)
		.innerJoin(user, eq(surveyResponse.userId, user.id))
		.where(eq(surveyResponse.surveyId, id));

	const responseIds = responseRows.map((r) => r.responseId);
	const responseAnswers =
		responseIds.length > 0
			? await db
					.select({
						responseId: surveyAnswer.responseId,
						questionId: surveyAnswer.questionId,
						value: surveyAnswer.value,
					})
					.from(surveyAnswer)
					.where(
						sql`${surveyAnswer.responseId} IN (${sql.join(
							responseIds.map((rid) => sql`${rid}`),
							sql`, `,
						)})`,
					)
			: [];

	const responses = responseRows.map((r) => {
		const answers: Record<string, string | null> = {};
		for (const a of responseAnswers) {
			if (a.responseId === r.responseId) {
				answers[a.questionId] = a.value;
			}
		}
		return {
			userId: r.userId,
			userName: r.displayUsername || r.userName,
			submittedAt: r.submittedAt,
			answers,
		};
	});

	return NextResponse.json({
		survey: rows[0],
		totalResponses,
		questions: questionResults,
		responses,
	});
}
