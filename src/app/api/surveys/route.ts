import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { survey, surveyQuestion, surveyResponse } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { auth } from "@/lib/auth";

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

// GET /api/surveys — List surveys
export async function GET() {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const role = (session.user as { role?: string }).role ?? "user";
	const isMod = role === "admin" || role === "moderator";

	const rows = await db.select().from(survey).orderBy(survey.createdAt);

	// Filter: users only see active surveys; moderator+ sees all
	const visible = isMod ? rows : rows.filter((s) => s.status === "active");

	// Check which surveys this user has responded to
	const responses = await db
		.select({ surveyId: surveyResponse.surveyId })
		.from(surveyResponse)
		.where(eq(surveyResponse.userId, session.user.id));
	const respondedSet = new Set(responses.map((r) => r.surveyId));

	// Get response counts per survey
	const counts = await db
		.select({
			surveyId: surveyResponse.surveyId,
			count: sql<number>`count(*)`.as("count"),
		})
		.from(surveyResponse)
		.groupBy(surveyResponse.surveyId);
	const countMap = new Map(counts.map((c) => [c.surveyId, c.count]));

	const result = visible.map((s) => ({
		...s,
		hasResponded: respondedSet.has(s.id),
		responseCount: countMap.get(s.id) ?? 0,
	}));

	return NextResponse.json({ surveys: result });
}

// POST /api/surveys — Create survey (moderator+ only)
export async function POST(request: NextRequest) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const role = (session.user as { role?: string }).role ?? "user";
	if (role !== "admin" && role !== "moderator") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const body = await request.json();
	const { title, description, questions } = body as {
		title?: string;
		description?: string;
		questions?: {
			type: string;
			prompt: string;
			options?: string[];
			required?: boolean;
		}[];
	};

	if (!title || typeof title !== "string") {
		return NextResponse.json({ error: "title is required" }, { status: 400 });
	}

	if (!Array.isArray(questions) || questions.length === 0) {
		return NextResponse.json(
			{ error: "At least one question is required" },
			{ status: 400 },
		);
	}

	const validTypes = [
		"text",
		"textarea",
		"single_choice",
		"multiple_choice",
		"rating",
	];
	for (const q of questions) {
		if (!q.prompt || typeof q.prompt !== "string") {
			return NextResponse.json(
				{ error: "Each question must have a prompt" },
				{ status: 400 },
			);
		}
		if (!validTypes.includes(q.type)) {
			return NextResponse.json(
				{ error: `Invalid question type: ${q.type}` },
				{ status: 400 },
			);
		}
		if (
			(q.type === "single_choice" || q.type === "multiple_choice") &&
			(!Array.isArray(q.options) || q.options.length < 2)
		) {
			return NextResponse.json(
				{ error: "Choice questions require at least 2 options" },
				{ status: 400 },
			);
		}
	}

	const now = new Date();
	const surveyId = crypto.randomUUID();

	// Insert survey + questions
	await db.insert(survey).values({
		id: surveyId,
		title,
		description: description ?? null,
		status: "draft",
		createdBy: session.user.id,
		createdAt: now,
		updatedAt: now,
	});

	for (let i = 0; i < questions.length; i++) {
		const q = questions[i];
		await db.insert(surveyQuestion).values({
			id: crypto.randomUUID(),
			surveyId,
			type: q.type,
			prompt: q.prompt,
			options:
				q.type === "single_choice" || q.type === "multiple_choice"
					? JSON.stringify(q.options)
					: null,
			required: q.required !== false,
			sortOrder: i,
		});
	}

	await logAuditEvent({
		action: "survey.create",
		actorId: session.user.id,
		targetId: surveyId,
		detail: { title, questionCount: questions.length },
	});

	return NextResponse.json({ id: surveyId, title }, { status: 201 });
}
