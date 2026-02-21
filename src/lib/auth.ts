import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";
import { username } from "better-auth/plugins/username";
import { APIError } from "better-call";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { hmacHash } from "@/lib/crypto";
import { sendResetPasswordEmail, sendVerificationEmail } from "@/lib/email";
import {
	BLIND_INDEX_ADDITIONAL_FIELDS,
	createEncryptedAdapter,
} from "@/lib/encrypted-adapter";
import { PRINTABLE_RE } from "@/lib/password-rules";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const SIGN_IN_PATHS = ["/sign-in/email", "/sign-in/username"];

async function findUserByLoginBody(body: Record<string, unknown> | undefined) {
	if (!body) return null;
	const email = body.email as string | undefined;
	const uname = body.username as string | undefined;

	const conditions = [];
	if (email) conditions.push(eq(schema.user.emailHash, hmacHash(email)));
	if (uname) conditions.push(eq(schema.user.username, uname));

	if (conditions.length === 0) return null;
	const [found] = await db
		.select({
			id: schema.user.id,
			failedLoginAttempts: schema.user.failedLoginAttempts,
			lockedUntil: schema.user.lockedUntil,
		})
		.from(schema.user)
		.where(conditions.length === 1 ? conditions[0] : or(...conditions));
	return found ?? null;
}

const beforeGuard = createAuthMiddleware(async (ctx) => {
	const body = ctx.body as Record<string, unknown> | undefined;

	// Require a valid invite for signup
	if (ctx.path === "/sign-up/email") {
		const email = body?.email as string | undefined;
		if (email) {
			const invite = await db.query.inviteToken.findFirst({
				where: and(
					eq(schema.inviteToken.emailHash, hmacHash(email)),
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

	// Account lockout check on sign-in
	if (SIGN_IN_PATHS.includes(ctx.path)) {
		const found = await findUserByLoginBody(body);
		if (found?.lockedUntil && found.lockedUntil.getTime() > Date.now()) {
			const remainingMs = found.lockedUntil.getTime() - Date.now();
			const remainingMin = Math.ceil(remainingMs / 60_000);
			throw new APIError("TOO_MANY_REQUESTS", {
				message: `Account is locked due to too many failed login attempts. Try again in ${remainingMin} minute${remainingMin === 1 ? "" : "s"}.`,
			});
		}
	}
});

const loginAuditHook = createAuthMiddleware(async (ctx) => {
	if (!SIGN_IN_PATHS.includes(ctx.path)) return;

	const ipAddress =
		ctx.headers?.get("x-forwarded-for") ||
		ctx.headers?.get("x-client-ip") ||
		null;
	const userAgent = ctx.headers?.get("user-agent") || null;

	if (ctx.context.returned instanceof APIError) {
		const body = ctx.body as Record<string, unknown> | undefined;
		await logAuditEvent({
			action: "login.failure",
			targetEmail: (body?.email as string) ?? undefined,
			detail: {
				username: (body?.username as string) ?? undefined,
				ipAddress,
				userAgent,
				reason: ctx.context.returned.body?.message ?? "Unknown error",
			},
		});

		// Track failed login attempts for lockout
		const found = await findUserByLoginBody(body);
		if (found) {
			const newCount = found.failedLoginAttempts + 1;
			const updates: Record<string, unknown> = {
				failedLoginAttempts: newCount,
				lastFailedLoginAt: new Date(),
				updatedAt: new Date(),
			};
			if (newCount >= MAX_FAILED_ATTEMPTS) {
				updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
			}
			await db
				.update(schema.user)
				.set(updates)
				.where(eq(schema.user.id, found.id));

			if (newCount >= MAX_FAILED_ATTEMPTS) {
				const email = body?.email as string | undefined;
				await logAuditEvent({
					action: "user.lockout",
					targetId: found.id,
					targetEmail: email,
					detail: {
						failedAttempts: newCount,
						lockedUntilMs: LOCKOUT_DURATION_MS,
						ipAddress,
					},
				});
			}
		}
	} else if (ctx.context.newSession) {
		await logAuditEvent({
			action: "login.success",
			actorId: ctx.context.newSession.user.id,
			detail: { ipAddress, userAgent },
		});

		// Reset lockout counters on successful login
		await db
			.update(schema.user)
			.set({
				failedLoginAttempts: 0,
				lockedUntil: null,
				lastFailedLoginAt: null,
				updatedAt: new Date(),
			})
			.where(eq(schema.user.id, ctx.context.newSession.user.id));
	}
});

export const auth = betterAuth({
	baseURL: process.env.NEXT_PUBLIC_APP_URL,
	secret: process.env.BETTER_AUTH_SECRET,

	database: createEncryptedAdapter(drizzleAdapter)(db, {
		provider: "sqlite",
		schema,
	}),

	account: {
		encryptOAuthTokens: true,
	},

	user: {
		additionalFields: {
			...BLIND_INDEX_ADDITIONAL_FIELDS.user,
			forcePasswordChange: {
				type: "boolean" as const,
				required: false,
				defaultValue: false,
				input: false as const,
			},
		},
	},

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
					eq(schema.inviteToken.emailHash, hmacHash(user.email)),
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
		additionalFields: BLIND_INDEX_ADDITIONAL_FIELDS.session,
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
		before: beforeGuard,
		after: loginAuditHook,
	},
});

export type Session = typeof auth.$Infer.Session;
