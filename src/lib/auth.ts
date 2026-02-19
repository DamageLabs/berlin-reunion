import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { APIError } from "better-call";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins/username";
import { admin } from "better-auth/plugins/admin";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendVerificationEmail } from "@/lib/email";

const PRINTABLE_RE = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~ ]+$/;

const validatePassword = createAuthMiddleware(async (ctx) => {
  if (
    ctx.path !== "/sign-up/email" &&
    ctx.path !== "/change-password"
  ) {
    return;
  }

  const body = ctx.body as Record<string, unknown> | undefined;
  const password =
    (body?.password as string) ?? (body?.newPassword as string);

  if (password && !PRINTABLE_RE.test(password)) {
    throw new APIError("BAD_REQUEST", {
      message: "Password must contain only printable characters",
    });
  }
});

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    requireEmailVerification: true,
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600,
    async sendVerificationEmail({ user, url }) {
      // If there's an unused invite for this email, skip verification email
      const invite = await db.query.inviteToken.findFirst({
        where: and(
          eq(schema.inviteToken.email, user.email),
          eq(schema.inviteToken.used, false),
        ),
      });
      if (invite) return;

      await sendVerificationEmail({ email: user.email, url });
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  plugins: [
    username(),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    nextCookies(),
  ],

  hooks: {
    before: validatePassword,
  },
});

export type Session = typeof auth.$Infer.Session;
