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
import { sendVerificationEmail, sendResetPasswordEmail } from "@/lib/email";
import { PRINTABLE_RE } from "@/lib/password-rules";

const signupGuard = createAuthMiddleware(async (ctx) => {
  const body = ctx.body as Record<string, unknown> | undefined;

  // Require a valid invite for signup
  if (ctx.path === "/sign-up/email") {
    const email = body?.email as string | undefined;
    if (email) {
      const invite = await db.query.inviteToken.findFirst({
        where: and(
          eq(schema.inviteToken.email, email),
          eq(schema.inviteToken.used, false),
        ),
      });
      if (!invite) {
        throw new APIError("FORBIDDEN", {
          message: "Registration requires a valid invite",
        });
      }
    }
  }

  // Validate password on signup, password change, and password reset
  if (
    ctx.path === "/sign-up/email" ||
    ctx.path === "/change-password" ||
    ctx.path === "/reset-password"
  ) {
    const password =
      (body?.password as string) ?? (body?.newPassword as string);
    if (password && !PRINTABLE_RE.test(password)) {
      throw new APIError("BAD_REQUEST", {
        message: "Password must contain only printable characters",
      });
    }
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
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail({ email: user.email, url });
    },
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

  rateLimit: {
    enabled: true,
    window: Number(process.env.RATE_LIMIT_WINDOW ?? 60),
    max: Number(process.env.RATE_LIMIT_MAX ?? 10),
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-in/username": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/change-password": { window: 60, max: 3 },
      "/forget-password": { window: 60, max: 3 },
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
    before: signupGuard,
  },
});

export type Session = typeof auth.$Infer.Session;
