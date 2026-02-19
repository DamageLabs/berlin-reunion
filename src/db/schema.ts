import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ─── User ───────────────────────────────────────────────────────────────────
// better-auth core + username plugin + admin plugin
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
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
});

// ─── Session ────────────────────────────────────────────────────────────────
// better-auth managed + admin plugin impersonatedBy
export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
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
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
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

// ─── Invite Token ───────────────────────────────────────────────────────────
// Custom table for the invitation system (not part of better-auth)
export const inviteToken = sqliteTable("invite_token", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  email: text("email"),
  invitedBy: text("invited_by")
    .notNull()
    .references(() => user.id),
  role: text("role").notNull().default("user"),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});
