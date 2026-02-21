import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { survey, surveyQuestion } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

// GET /api/surveys/[id] — Get survey with questions
export async function GET(_request: NextRequest, { params }: Params) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;
	const rows = await db.select().from(survey).where(eq(survey.id, id));
	if (rows.length === 0) {
		return NextResponse.json({ error: "Survey not found" }, { status: 404 });
	}

	const s = rows[0];
	const role = (session.user as { role?: string }).role ?? "user";
	const isMod = role === "admin" || role === "moderator";

	// Users can only see active surveys
	if (!isMod && s.status !== "active") {
		return NextResponse.json({ error: "Survey not found" }, { status: 404 });
	}

	const questions = await db
		.select()
		.from(surveyQuestion)
		.where(eq(surveyQuestion.surveyId, id))
		.orderBy(surveyQuestion.sortOrder);

	// Parse options JSON for choice questions
	const parsedQuestions = questions.map((q) => ({
		...q,
		options: q.options ? JSON.parse(q.options) : null,
	}));

	return NextResponse.json({ survey: s, questions: parsedQuestions });
}

// PUT /api/surveys/[id] — Update survey (moderator+ only)
export async function PUT(request: NextRequest, { params }: Params) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const role = (session.user as { role?: string }).role ?? "user";
	if (role !== "admin" && role !== "moderator") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const { id } = await params;
	const existing = await db.select().from(survey).where(eq(survey.id, id));
	if (existing.length === 0) {
		return NextResponse.json({ error: "Survey not found" }, { status: 404 });
	}

	const s = existing[0];
	const body = await request.json();
	const { title, description, status, questions } = body as {
		title?: string;
		description?: string;
		status?: string;
		questions?: {
			type: string;
			prompt: string;
			options?: string[];
			required?: boolean;
		}[];
	};

	// Status transition validation
	if (status !== undefined) {
		const validTransitions: Record<string, string[]> = {
			draft: ["active"],
			active: ["closed"],
			closed: [],
		};
		if (!validTransitions[s.status]?.includes(status)) {
			return NextResponse.json(
				{ error: `Cannot transition from ${s.status} to ${status}` },
				{ status: 400 },
			);
		}
	}

	// Only draft surveys can have content edited
	if (s.status !== "draft" && (title || description !== undefined || questions)) {
		return NextResponse.json(
			{ error: "Only draft surveys can be edited" },
			{ status: 400 },
		);
	}

	const updates: Record<string, unknown> = { updatedAt: new Date() };
	if (title !== undefined) updates.title = title;
	if (description !== undefined) updates.description = description;
	if (status !== undefined) updates.status = status;

	await db.update(survey).set(updates).where(eq(survey.id, id));

	// Replace questions if provided (draft only)
	if (questions && s.status === "draft") {
		// Delete existing questions (cascade handled by FK)
		await db
			.delete(surveyQuestion)
			.where(eq(surveyQuestion.surveyId, id));

		// Insert new questions
		for (let i = 0; i < questions.length; i++) {
			const q = questions[i];
			await db.insert(surveyQuestion).values({
				id: crypto.randomUUID(),
				surveyId: id,
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
	}

	await logAuditEvent({
		action: "survey.update",
		actorId: session.user.id,
		targetId: id,
		detail: {
			fields: Object.keys(updates).filter(
				(k) => k !== "updatedAt",
			),
		},
	});

	return NextResponse.json({ success: true });
}

// DELETE /api/surveys/[id] — Delete survey (moderator+ only, draft only)
export async function DELETE(_request: NextRequest, { params }: Params) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const role = (session.user as { role?: string }).role ?? "user";
	if (role !== "admin" && role !== "moderator") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const { id } = await params;
	const existing = await db.select().from(survey).where(eq(survey.id, id));
	if (existing.length === 0) {
		return NextResponse.json({ error: "Survey not found" }, { status: 404 });
	}

	if (existing[0].status !== "draft") {
		return NextResponse.json(
			{ error: "Only draft surveys can be deleted" },
			{ status: 400 },
		);
	}

	await logAuditEvent({
		action: "survey.delete",
		actorId: session.user.id,
		targetId: id,
		detail: { title: existing[0].title },
	});

	await db.delete(survey).where(eq(survey.id, id));

	return NextResponse.json({ success: true });
}
