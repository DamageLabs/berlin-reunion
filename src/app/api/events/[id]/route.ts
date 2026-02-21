import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { event } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

const VALID_RECURRENCE_TYPES = [
	"daily",
	"weekly",
	"biweekly",
	"monthly",
	"yearly",
];

// GET /api/events/[id] — Get a single event (for edit form)
export async function GET(_request: NextRequest, { params }: Params) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;
	const row = await db.select().from(event).where(eq(event.id, id));

	if (row.length === 0) {
		return NextResponse.json({ error: "Event not found" }, { status: 404 });
	}

	// Hide private events from regular users
	const role = (session.user as { role?: string }).role ?? "user";
	if (row[0].visibility === "private" && role !== "admin" && role !== "moderator") {
		return NextResponse.json({ error: "Event not found" }, { status: 404 });
	}

	return NextResponse.json({ event: row[0] });
}

// PUT /api/events/[id] — Update an event (moderator+ only)
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
	const existing = await db.select().from(event).where(eq(event.id, id));
	if (existing.length === 0) {
		return NextResponse.json({ error: "Event not found" }, { status: 404 });
	}

	const body = await request.json();
	const { title, description, startAt, durationMinutes, location, recurrenceType, recurrenceEndAt, visibility } = body as {
		title?: string;
		description?: string;
		startAt?: string;
		durationMinutes?: number;
		location?: string;
		recurrenceType?: string | null;
		recurrenceEndAt?: string | null;
		visibility?: string;
	};

	if (title !== undefined && (typeof title !== "string" || !title)) {
		return NextResponse.json(
			{ error: "title must be a non-empty string" },
			{ status: 400 },
		);
	}

	if (startAt !== undefined) {
		const d = new Date(startAt);
		if (Number.isNaN(d.getTime())) {
			return NextResponse.json(
				{ error: "Invalid startAt date" },
				{ status: 400 },
			);
		}
	}

	if (durationMinutes !== undefined && (typeof durationMinutes !== "number" || durationMinutes < 1)) {
		return NextResponse.json(
			{ error: "durationMinutes must be a positive number" },
			{ status: 400 },
		);
	}

	if (recurrenceType !== undefined && recurrenceType !== null && !VALID_RECURRENCE_TYPES.includes(recurrenceType)) {
		return NextResponse.json(
			{ error: `Invalid recurrenceType. Must be one of: ${VALID_RECURRENCE_TYPES.join(", ")}` },
			{ status: 400 },
		);
	}

	if (visibility !== undefined && visibility !== "public" && visibility !== "private") {
		return NextResponse.json(
			{ error: 'visibility must be "public" or "private"' },
			{ status: 400 },
		);
	}

	const updates: Record<string, unknown> = {
		updatedBy: session.user.id,
		updatedAt: new Date(),
	};
	if (title !== undefined) updates.title = title;
	if (description !== undefined) updates.description = description;
	if (startAt !== undefined) updates.startAt = new Date(startAt);
	if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes;
	if (location !== undefined) updates.location = location;
	if (recurrenceType !== undefined) updates.recurrenceType = recurrenceType;
	if (recurrenceEndAt !== undefined) {
		updates.recurrenceEndAt = recurrenceEndAt ? new Date(recurrenceEndAt) : null;
	}
	if (visibility !== undefined) updates.visibility = visibility;

	await db.update(event).set(updates).where(eq(event.id, id));

	await logAuditEvent({
		action: "event.update",
		actorId: session.user.id,
		targetId: id,
		detail: { fields: Object.keys(updates).filter((k) => k !== "updatedBy" && k !== "updatedAt") },
	});

	return NextResponse.json({ success: true });
}

// DELETE /api/events/[id] — Delete an event (moderator+ only)
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
	const existing = await db.select().from(event).where(eq(event.id, id));
	if (existing.length === 0) {
		return NextResponse.json({ error: "Event not found" }, { status: 404 });
	}

	await logAuditEvent({
		action: "event.delete",
		actorId: session.user.id,
		targetId: id,
		detail: { title: existing[0].title },
	});

	await db.delete(event).where(eq(event.id, id));

	return NextResponse.json({ success: true });
}
