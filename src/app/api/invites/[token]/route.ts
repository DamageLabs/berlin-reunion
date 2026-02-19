import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { inviteToken, user, emailVerificationCode } from "@/db/schema";
import { generateVerificationCode, hashCode, EXPIRY_MS } from "@/lib/verification-code";
import { sendVerificationCodeEmail } from "@/lib/email";

type Params = { params: Promise<{ token: string }> };

function findInvite(token: string) {
  return db.query.inviteToken.findFirst({
    where: eq(inviteToken.token, token),
  });
}

// GET /api/invites/[token] — Validate invite (public)
export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params;
  const invite = await findInvite(token);

  if (!invite) {
    return NextResponse.json(
      { error: "Invite not found" },
      { status: 404 },
    );
  }

  if (invite.used) {
    return NextResponse.json(
      { error: "Invite has already been used" },
      { status: 410 },
    );
  }

  if (new Date() > invite.expiresAt) {
    return NextResponse.json(
      { error: "Invite has expired" },
      { status: 410 },
    );
  }

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
  });
}

// POST /api/invites/[token]/accept — Register via invite (public)
export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const invite = await findInvite(token);

  if (!invite) {
    return NextResponse.json(
      { error: "Invite not found" },
      { status: 404 },
    );
  }

  if (invite.used) {
    return NextResponse.json(
      { error: "Invite has already been used" },
      { status: 410 },
    );
  }

  if (new Date() > invite.expiresAt) {
    return NextResponse.json(
      { error: "Invite has expired" },
      { status: 410 },
    );
  }

  const body = await request.json();
  const { name, username: uname, password } = body as {
    name?: string;
    username?: string;
    password?: string;
  };

  if (!name || !uname || !password) {
    return NextResponse.json(
      { error: "name, username, and password are required" },
      { status: 400 },
    );
  }

  if (!invite.email) {
    return NextResponse.json(
      { error: "Invite has no associated email" },
      { status: 400 },
    );
  }

  // Create user through better-auth pipeline
  let signUpResult;
  try {
    signUpResult = await auth.api.signUpEmail({
      body: {
        email: invite.email,
        password,
        name,
        username: uname,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create account";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!signUpResult?.user) {
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 },
    );
  }

  // Set invited role (do NOT auto-verify email)
  await db
    .update(user)
    .set({ role: invite.role })
    .where(eq(user.id, signUpResult.user.id));

  // Generate and store verification code
  const code = generateVerificationCode();
  const now = new Date();
  await db.insert(emailVerificationCode).values({
    id: crypto.randomUUID(),
    email: invite.email,
    codeHash: hashCode(code),
    attempts: 0,
    createdAt: now,
    expiresAt: new Date(now.getTime() + EXPIRY_MS),
  });

  // Send verification code email
  await sendVerificationCodeEmail({ email: invite.email, code });

  // Mark invite as used
  await db
    .update(inviteToken)
    .set({ used: true })
    .where(eq(inviteToken.id, invite.id));

  return NextResponse.json(
    {
      user: {
        id: signUpResult.user.id,
        email: signUpResult.user.email,
        name: signUpResult.user.name,
        role: invite.role,
        emailVerified: false,
      },
    },
    { status: 201 },
  );
}
