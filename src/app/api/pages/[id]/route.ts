import { and, eq, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { page } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

const RESERVED_SLUGS = ["new", "admin", "api", "login", "register", "home", "profile"];

// GET /api/pages/[id] — Get a single page
export async function GET(_request: NextRequest, { params }: Params) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;
	const row = await db.select().from(page).where(eq(page.id, id));

	if (row.length === 0) {
		return NextResponse.json({ error: "Page not found" }, { status: 404 });
	}

	const role = (session.user as { role?: string }).role ?? "user";
	if (role !== "admin" && role !== "moderator") {
		// Regular users can only see published + public pages
		if (!row[0].published || row[0].visibility === "private") {
			return NextResponse.json({ error: "Page not found" }, { status: 404 });
		}
	}

	return NextResponse.json({ page: row[0] });
}

// PUT /api/pages/[id] — Update page (moderator+ only)
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
	const existing = await db.select().from(page).where(eq(page.id, id));
	if (existing.length === 0) {
		return NextResponse.json({ error: "Page not found" }, { status: 404 });
	}

	const body = await request.json();
	const { title, slug, content, published, visibility } = body as {
		title?: string;
		slug?: string;
		content?: string;
		published?: boolean;
		visibility?: string;
	};

	if (title !== undefined && (typeof title !== "string" || !title)) {
		return NextResponse.json(
			{ error: "title must be a non-empty string" },
			{ status: 400 },
		);
	}

	if (slug !== undefined) {
		if (typeof slug !== "string" || !slug) {
			return NextResponse.json(
				{ error: "slug must be a non-empty string" },
				{ status: 400 },
			);
		}
		if (RESERVED_SLUGS.includes(slug)) {
			return NextResponse.json(
				{ error: `"${slug}" is a reserved slug` },
				{ status: 400 },
			);
		}
		// Check uniqueness if slug changed
		if (slug !== existing[0].slug) {
			const dup = await db
				.select()
				.from(page)
				.where(and(eq(page.slug, slug), ne(page.id, id)));
			if (dup.length > 0) {
				return NextResponse.json(
					{ error: "A page with this slug already exists" },
					{ status: 400 },
				);
			}
		}
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
	if (slug !== undefined) updates.slug = slug;
	if (content !== undefined) updates.content = content;
	if (published !== undefined) updates.published = published;
	if (visibility !== undefined) updates.visibility = visibility;

	await db.update(page).set(updates).where(eq(page.id, id));

	await logAuditEvent({
		action: "page.update",
		actorId: session.user.id,
		targetId: id,
		detail: {
			fields: Object.keys(updates).filter(
				(k) => k !== "updatedBy" && k !== "updatedAt",
			),
		},
	});

	return NextResponse.json({ success: true });
}

// DELETE /api/pages/[id] — Delete page (moderator+ only)
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
	const existing = await db.select().from(page).where(eq(page.id, id));
	if (existing.length === 0) {
		return NextResponse.json({ error: "Page not found" }, { status: 404 });
	}

	await logAuditEvent({
		action: "page.delete",
		actorId: session.user.id,
		targetId: id,
		detail: { title: existing[0].title, slug: existing[0].slug },
	});

	await db.delete(page).where(eq(page.id, id));

	return NextResponse.json({ success: true });
}
