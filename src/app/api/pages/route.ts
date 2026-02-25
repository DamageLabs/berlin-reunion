import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { page } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { auth } from "@/lib/auth";

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

const RESERVED_SLUGS = ["new", "admin", "api", "login", "register", "home", "profile"];

// GET /api/pages — List pages
export async function GET() {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const role = (session.user as { role?: string }).role ?? "user";
	const isMod = role === "admin" || role === "moderator";

	const rows = await db.select().from(page).orderBy(page.title);

	// Moderator+ sees all; regular users see only published + public pages
	const visible = isMod
		? rows
		: rows.filter((p) => p.published && p.visibility === "public");

	return NextResponse.json({ pages: visible });
}

// POST /api/pages — Create page (moderator+ only)
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
	const { title, slug, content, published, visibility } = body as {
		title?: string;
		slug?: string;
		content?: string;
		published?: boolean;
		visibility?: string;
	};

	if (!title || typeof title !== "string") {
		return NextResponse.json({ error: "title is required" }, { status: 400 });
	}

	if (!slug || typeof slug !== "string") {
		return NextResponse.json({ error: "slug is required" }, { status: 400 });
	}

	if (RESERVED_SLUGS.includes(slug)) {
		return NextResponse.json(
			{ error: `"${slug}" is a reserved slug` },
			{ status: 400 },
		);
	}

	const pageVisibility = visibility ?? "public";
	if (pageVisibility !== "public" && pageVisibility !== "private") {
		return NextResponse.json(
			{ error: 'visibility must be "public" or "private"' },
			{ status: 400 },
		);
	}

	// Check slug uniqueness
	const existing = await db.select().from(page).where(eq(page.slug, slug));
	if (existing.length > 0) {
		return NextResponse.json(
			{ error: "A page with this slug already exists" },
			{ status: 400 },
		);
	}

	const now = new Date();
	const id = crypto.randomUUID();

	await db.insert(page).values({
		id,
		slug,
		title,
		content: content ?? "",
		published: published ?? false,
		visibility: pageVisibility,
		createdBy: session.user.id,
		updatedBy: null,
		createdAt: now,
		updatedAt: now,
	});

	await logAuditEvent({
		action: "page.create",
		actorId: session.user.id,
		targetId: id,
		detail: { title, slug, visibility: pageVisibility },
	});

	return NextResponse.json({ id, title, slug }, { status: 201 });
}
