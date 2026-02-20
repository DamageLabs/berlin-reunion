import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inviteToken, user } from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { encrypt, hmacHash, safeDecrypt } from "@/lib/crypto";
import { sendInviteEmail } from "@/lib/email";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ALLOWED_ROLES = ["user", "moderator", "admin"];

async function getSession() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	return session;
}

// POST /api/invites — Create an invite (moderator+ only)
export async function POST(request: NextRequest) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const currentUser = session.user;
	const currentRole = (currentUser as { role?: string }).role ?? "user";

	if (currentRole !== "admin" && currentRole !== "moderator") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const body = await request.json();
	const { email, role = "user" } = body as { email?: string; role?: string };

	if (!email || typeof email !== "string") {
		return NextResponse.json({ error: "email is required" }, { status: 400 });
	}

	if (!ALLOWED_ROLES.includes(role)) {
		return NextResponse.json(
			{ error: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(", ")}` },
			{ status: 400 },
		);
	}

	// Moderators can only invite "user" role
	if (currentRole === "moderator" && role !== "user") {
		return NextResponse.json(
			{ error: "Moderators can only invite users with the 'user' role" },
			{ status: 403 },
		);
	}

	// Check if user already exists (via blind index)
	const existingUser = await db.query.user.findFirst({
		where: eq(user.emailHash, hmacHash(email)),
	});
	if (existingUser) {
		return NextResponse.json(
			{ error: "A user with this email already exists" },
			{ status: 409 },
		);
	}

	const token = randomUUID();
	const now = new Date();
	const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);

	await db.insert(inviteToken).values({
		id: randomUUID(),
		token: encrypt(token),
		tokenHash: hmacHash(token),
		email: encrypt(email),
		emailHash: hmacHash(email),
		invitedBy: currentUser.id,
		role,
		used: false,
		createdAt: now,
		expiresAt,
	});

	await sendInviteEmail({
		to: email,
		inviterName: currentUser.name,
		token,
		role,
	});

	await logAuditEvent({
		action: "invite.create",
		actorId: currentUser.id,
		targetEmail: email,
		detail: { role, token },
	});

	return NextResponse.json({ token, email, role, expiresAt }, { status: 201 });
}

// GET /api/invites — List all invites (moderator+ only)
export async function GET() {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const currentRole = (session.user as { role?: string }).role ?? "user";

	if (currentRole !== "admin" && currentRole !== "moderator") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const invites = await db.query.inviteToken.findMany({
		orderBy: (t, { desc }) => desc(t.createdAt),
	});

	// Decrypt sensitive fields before returning
	return NextResponse.json(
		invites.map((inv) => ({
			...inv,
			token: inv.token ? safeDecrypt(inv.token) : inv.token,
			email: inv.email ? safeDecrypt(inv.email) : inv.email,
		})),
	);
}
