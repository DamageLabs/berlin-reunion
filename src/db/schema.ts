import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ─── User ───────────────────────────────────────────────────────────────────
// better-auth core + username plugin + admin plugin
export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull(),
	emailHash: text("email_hash").unique(),
	emailVerified: integer("email_verified", { mode: "boolean" })
		.notNull()
		.default(false),
	image: text("image"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	// username plugin
	username: text("username").unique(),
	displayUsername: text("display_username"),
	// admin plugin
	role: text("role").default("user"),
	banned: integer("banned", { mode: "boolean" }).default(false),
	banReason: text("ban_reason"),
	banExpires: integer("ban_expires", { mode: "timestamp" }),
	// profile
	location: text("location"),
	platoon: text("platoon"),
	yearsServed: text("years_served"),
	phone: text("phone"),
	phoneHash: text("phone_hash"),
	// email change
	pendingEmail: text("pending_email"),
	pendingEmailHash: text("pending_email_hash"),
	// profile visibility
	isProfilePublic: integer("is_profile_public", { mode: "boolean" }).default(
		false,
	),
	// password reset
	forcePasswordChange: integer("force_password_change", {
		mode: "boolean",
	}).default(false),
	// account lockout
	failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
	lockedUntil: integer("locked_until", { mode: "timestamp" }),
	lastFailedLoginAt: integer("last_failed_login_at", { mode: "timestamp" }),
});

// ─── Session ────────────────────────────────────────────────────────────────
// better-auth managed + admin plugin impersonatedBy
export const session = sqliteTable("session", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	token: text("token").notNull(),
	tokenHash: text("token_hash").unique(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	// admin plugin
	impersonatedBy: text("impersonated_by"),
});

// ─── Account ────────────────────────────────────────────────────────────────
// Auth provider credentials — password hash lives here
export const account = sqliteTable("account", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	accessTokenExpiresAt: integer("access_token_expires_at", {
		mode: "timestamp",
	}),
	refreshTokenExpiresAt: integer("refresh_token_expires_at", {
		mode: "timestamp",
	}),
	scope: text("scope"),
	idToken: text("id_token"),
	password: text("password"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ─── Verification ───────────────────────────────────────────────────────────
// Replaces email_verification_tokens from the original issue
export const verification = sqliteTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ─── Rate Limit ────────────────────────────────────────────────────────────
// better-auth database-backed rate limiting storage
export const rateLimit = sqliteTable("rate_limit", {
	id: text("id").primaryKey(),
	key: text("key"),
	count: integer("count"),
	lastRequest: integer("last_request"),
});

// ─── Email Verification Code ────────────────────────────────────────────────
// 8-digit alphanumeric code for email ownership proof
export const emailVerificationCode = sqliteTable("email_verification_code", {
	id: text("id").primaryKey(),
	email: text("email").notNull(),
	emailHash: text("email_hash"),
	codeHash: text("code_hash").notNull(),
	attempts: integer("attempts").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

// ─── Audit Log ─────────────────────────────────────────────────────────────
// Immutable record of admin and authentication events
export const auditLog = sqliteTable("audit_log", {
	id: text("id").primaryKey(),
	action: text("action").notNull(),
	actorId: text("actor_id").references(() => user.id),
	targetId: text("target_id"),
	targetEmail: text("target_email"),
	detail: text("detail"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ─── Event ──────────────────────────────────────────────────────────────────
// Calendar events with optional recurrence
export const event = sqliteTable("event", {
	id: text("id").primaryKey(),
	title: text("title").notNull(),
	description: text("description"),
	startAt: integer("start_at", { mode: "timestamp" }).notNull(),
	durationMinutes: integer("duration_minutes").notNull().default(60),
	location: text("location"),
	recurrenceType: text("recurrence_type"), // "daily"|"weekly"|"biweekly"|"monthly"|"yearly"|null
	recurrenceEndAt: integer("recurrence_end_at", { mode: "timestamp" }),
	createdBy: text("created_by").references(() => user.id),
	updatedBy: text("updated_by").references(() => user.id),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	visibility: text("visibility").notNull().default("public"), // "public" | "private"
});

// ─── Invite Token ───────────────────────────────────────────────────────────
// Custom table for the invitation system (not part of better-auth)
export const inviteToken = sqliteTable("invite_token", {
	id: text("id").primaryKey(),
	token: text("token").notNull(),
	tokenHash: text("token_hash").unique(),
	email: text("email"),
	emailHash: text("email_hash"),
	invitedBy: text("invited_by")
		.notNull()
		.references(() => user.id),
	role: text("role").notNull().default("user"),
	used: integer("used", { mode: "boolean" }).notNull().default(false),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});
