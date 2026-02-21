import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
	survey,
	surveyAnswer,
	surveyQuestion,
	surveyResponse,
} from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

function validateAnswers(
	answers: Record<string, string>,
	questions: { id: string; required: boolean | null; type: string }[],
): string | null {
	for (const q of questions) {
		if (q.required && (!answers[q.id] || answers[q.id].trim() === "")) {
			return `Answer required for question`;
		}
	}
	return null;
}

// POST /api/surveys/[id]/respond — Submit response
export async function POST(request: NextRequest, { params }: Params) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;
	const rows = await db.select().from(survey).where(eq(survey.id, id));
	if (rows.length === 0) {
		return NextResponse.json({ error: "Survey not found" }, { status: 404 });
	}

	if (rows[0].status !== "active") {
		return NextResponse.json(
			{ error: "Survey is not accepting responses" },
			{ status: 400 },
		);
	}

	// Check if user already responded
	const existing = await db
		.select()
		.from(surveyResponse)
		.where(
			and(
				eq(surveyResponse.surveyId, id),
				eq(surveyResponse.userId, session.user.id),
			),
		);

	if (existing.length > 0) {
		return NextResponse.json(
			{ error: "You have already responded to this survey. Use PUT to update." },
			{ status: 409 },
		);
	}

	const body = await request.json();
	const { answers } = body as { answers?: Record<string, string> };

	if (!answers || typeof answers !== "object") {
		return NextResponse.json(
			{ error: "answers object is required" },
			{ status: 400 },
		);
	}

	const questions = await db
		.select()
		.from(surveyQuestion)
		.where(eq(surveyQuestion.surveyId, id));

	const validationError = validateAnswers(answers, questions);
	if (validationError) {
		return NextResponse.json({ error: validationError }, { status: 400 });
	}

	const responseId = crypto.randomUUID();

	await db.insert(surveyResponse).values({
		id: responseId,
		surveyId: id,
		userId: session.user.id,
		submittedAt: new Date(),
	});

	for (const [questionId, value] of Object.entries(answers)) {
		if (!questions.some((q) => q.id === questionId)) continue;
		await db.insert(surveyAnswer).values({
			id: crypto.randomUUID(),
			responseId,
			questionId,
			value: String(value),
		});
	}

	await logAuditEvent({
		action: "survey.respond",
		actorId: session.user.id,
		targetId: id,
		detail: { responseId },
	});

	return NextResponse.json({ responseId }, { status: 201 });
}

// PUT /api/surveys/[id]/respond — Update existing response
export async function PUT(request: NextRequest, { params }: Params) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;
	const rows = await db.select().from(survey).where(eq(survey.id, id));
	if (rows.length === 0) {
		return NextResponse.json({ error: "Survey not found" }, { status: 404 });
	}

	if (rows[0].status !== "active") {
		return NextResponse.json(
			{ error: "Survey is not accepting responses" },
			{ status: 400 },
		);
	}

	const existing = await db
		.select()
		.from(surveyResponse)
		.where(
			and(
				eq(surveyResponse.surveyId, id),
				eq(surveyResponse.userId, session.user.id),
			),
		);

	if (existing.length === 0) {
		return NextResponse.json(
			{ error: "No existing response found. Use POST to submit." },
			{ status: 404 },
		);
	}

	const body = await request.json();
	const { answers } = body as { answers?: Record<string, string> };

	if (!answers || typeof answers !== "object") {
		return NextResponse.json(
			{ error: "answers object is required" },
			{ status: 400 },
		);
	}

	const questions = await db
		.select()
		.from(surveyQuestion)
		.where(eq(surveyQuestion.surveyId, id));

	const validationError = validateAnswers(answers, questions);
	if (validationError) {
		return NextResponse.json({ error: validationError }, { status: 400 });
	}

	const responseId = existing[0].id;

	// Delete old answers and insert new ones
	await db
		.delete(surveyAnswer)
		.where(eq(surveyAnswer.responseId, responseId));

	await db.update(surveyResponse).set({ submittedAt: new Date() }).where(eq(surveyResponse.id, responseId));

	for (const [questionId, value] of Object.entries(answers)) {
		if (!questions.some((q) => q.id === questionId)) continue;
		await db.insert(surveyAnswer).values({
			id: crypto.randomUUID(),
			responseId,
			questionId,
			value: String(value),
		});
	}

	await logAuditEvent({
		action: "survey.respond",
		actorId: session.user.id,
		targetId: id,
		detail: { responseId, updated: true },
	});

	return NextResponse.json({ success: true });
}
