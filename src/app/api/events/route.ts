import { and, gte, lte } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { event } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { expandEvents } from "@/lib/recurrence";

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

// GET /api/events?start=ISO&end=ISO — List expanded events in range
export async function GET(request: NextRequest) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const url = new URL(request.url);
	const startParam = url.searchParams.get("start");
	const endParam = url.searchParams.get("end");

	if (!startParam || !endParam) {
		return NextResponse.json(
			{ error: "start and end query parameters are required" },
			{ status: 400 },
		);
	}

	const rangeStart = new Date(startParam);
	const rangeEnd = new Date(endParam);

	if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
		return NextResponse.json(
			{ error: "Invalid date format" },
			{ status: 400 },
		);
	}

	// Fetch events that could possibly occur in this range:
	// - One-time events with startAt in range
	// - Recurring events that started before rangeEnd
	const role = (session.user as { role?: string }).role ?? "user";

	const rows = await db
		.select()
		.from(event)
		.where(and(lte(event.startAt, rangeEnd)));

	// Filter out private events for regular users
	const visibleRows = role === "admin" || role === "moderator"
		? rows
		: rows.filter((r) => r.visibility === "public");

	const expanded = expandEvents(visibleRows, rangeStart, rangeEnd);

	return NextResponse.json({ events: expanded });
}

// POST /api/events — Create a new event (moderator+ only)
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
	const { title, description, startAt, durationMinutes, location, recurrenceType, recurrenceEndAt, visibility } = body as {
		title?: string;
		description?: string;
		startAt?: string;
		durationMinutes?: number;
		location?: string;
		recurrenceType?: string;
		recurrenceEndAt?: string;
		visibility?: string;
	};

	if (!title || typeof title !== "string") {
		return NextResponse.json(
			{ error: "title is required" },
			{ status: 400 },
		);
	}

	if (!startAt) {
		return NextResponse.json(
			{ error: "startAt is required" },
			{ status: 400 },
		);
	}

	const startDate = new Date(startAt);
	if (Number.isNaN(startDate.getTime())) {
		return NextResponse.json(
			{ error: "Invalid startAt date" },
			{ status: 400 },
		);
	}

	const duration = durationMinutes ?? 60;
	if (typeof duration !== "number" || duration < 1) {
		return NextResponse.json(
			{ error: "durationMinutes must be a positive number" },
			{ status: 400 },
		);
	}

	if (recurrenceType && !VALID_RECURRENCE_TYPES.includes(recurrenceType)) {
		return NextResponse.json(
			{ error: `Invalid recurrenceType. Must be one of: ${VALID_RECURRENCE_TYPES.join(", ")}` },
			{ status: 400 },
		);
	}

	const eventVisibility = visibility ?? "public";
	if (eventVisibility !== "public" && eventVisibility !== "private") {
		return NextResponse.json(
			{ error: 'visibility must be "public" or "private"' },
			{ status: 400 },
		);
	}

	const now = new Date();
	const id = crypto.randomUUID();

	await db.insert(event).values({
		id,
		title,
		description: description ?? null,
		startAt: startDate,
		durationMinutes: duration,
		location: location ?? null,
		recurrenceType: recurrenceType ?? null,
		recurrenceEndAt: recurrenceEndAt ? new Date(recurrenceEndAt) : null,
		visibility: eventVisibility,
		createdBy: session.user.id,
		updatedBy: null,
		createdAt: now,
		updatedAt: now,
	});

	await logAuditEvent({
		action: "event.create",
		actorId: session.user.id,
		targetId: id,
		detail: { title },
	});

	return NextResponse.json({ id, title, startAt: startDate.toISOString() }, { status: 201 });
}
