# MVP Roadmap

## Resolved Decisions

- **8-digit password**: 8 alphanumeric characters
- **Backend framework**: Next.js (fullstack)
- **Invite token flow**: A shareable token (emailable or textable) that grants access to register
- **Session management**: better-auth (cookie-based sessions with Drizzle adapter)
- **App purpose beyond auth**: Home dashboard with upcoming events, member directory, calendar

---

## Phase 1 — Project Scaffolding & Tooling (Complete)

**Goal:** Bootable project with dev tooling in place.

- [x] Initialize Next.js project with TypeScript
- [x] Configure dev scripts (dev, build, lint)
- [x] Add environment variable management (.env, dotenv)
- [x] Set up Resend API key and SQLite DB path as env vars

**Exit criteria:** `npm run dev` starts the Next.js app with no errors.

---

## Phase 2 — Data Layer (SQLite + Drizzle) (Complete)

**Goal:** Database schema, migrations, and seed data working.

- [x] Install and configure Drizzle ORM with SQLite driver (better-sqlite3)
- [x] Define schema:
  - `user` table with auth fields, profile fields, encryption columns
  - `session` table with token encryption and impersonation support
  - `account` table for OAuth provider credentials
  - `verification` table for email verification
  - `rateLimit` table for database-backed rate limiting
  - `emailVerificationCode` table for 8-digit codes
  - `auditLog` table for immutable action trail
  - `event` table with recurrence and visibility
  - `inviteToken` table with blind indexes
- [x] Generate and run initial migration
- [x] Create seed script that inserts default Admin user
- [x] Verify migration cycle works cleanly

**Exit criteria:** Schema created via migration, seed admin exists in DB, `drizzle-kit` commands work.

---

## Phase 3 — Authentication & RBAC (Complete)

**Goal:** Users can register, log in, log out, and are gated by role.

### 3a — Core Auth (via better-auth)
- [x] Install and configure better-auth with Drizzle adapter (SQLite)
- [x] Set up better-auth API route handler in Next.js
- [x] Configure email/password authentication with username plugin
- [x] Enforce printable ASCII password constraint at validation layer
- [x] Set up better-auth client for frontend session access
- [x] Rate limiting on auth endpoints (5 attempts/min sign-in, 3/min sign-up)

### 3b — RBAC
- [x] Define role hierarchy: Admin > Moderator > User (src/lib/authorization.ts)
- [x] Create authorization middleware that checks role on protected routes
- [x] Admin-only routes (user management, role changes, user deletion)
- [x] Moderator routes (event management, invite creation, limited admin)
- [x] User routes (profile, member directory, calendar viewing)

### 3c — Password Management
- [x] Authenticated endpoint for password change
- [x] Forgot/reset password flow via email
- [x] Admin password reset for users
- [x] Force password change flag

**Exit criteria:** Can register, log in, access role-gated endpoints, change password. All via API.

---

## Phase 4 — Email Integration (Resend) (Complete)

**Goal:** Email verification and invite tokens functional.

### 4a — Email Verification
- [x] Integrate Resend SDK (lazy-initialized)
- [x] On registration, generate 8-digit verification code and send email
- [x] Verification endpoint: validate code, mark user as email_verified
- [x] Block login for unverified users
- [x] Resend verification code endpoint (60s cooldown, 3 max attempts)

### 4b — Invite Tokens
- [x] Admin/Moderator endpoint: generate invite token for an email address
- [x] Send invite email via Resend with registration link containing token
- [x] Registration flow accepts invite token, pre-fills email, assigns role
- [x] Validate token on registration (not expired, not already used)
- [x] Mark token as used after successful registration
- [x] Invite revocation support

**Exit criteria:** Full flow works — invite sent, user registers via invite, verifies email, logs in.

---

## Phase 5 — React UI (Complete)

**Goal:** Frontend for all auth and invite flows.

- [x] Login page (username + password)
- [x] Registration page (with invite token param)
- [x] Email verification page (8-digit code entry)
- [x] Password change page (authenticated)
- [x] Forgot/reset password pages
- [x] Home dashboard (upcoming events, profile info, quick actions)
- [x] Admin dashboard:
  - User list with search, filter, sort, pagination
  - Role management, ban/unban, invite management
  - Audit log viewer
- [x] Profile page (edit name, location, platoon, photo, visibility)
- [x] Member directory with search
- [x] Session management page
- [x] Protected route wrappers (redirect to login if unauthenticated)
- [x] Role-based UI gating (hide admin features from regular users)

**Exit criteria:** All flows from Phases 3–4 are usable through the browser.

---

## Phase 6 — Security Hardening (Complete)

**Goal:** Encrypt PII at rest, add audit trail.

- [x] AES-256-GCM field encryption for emails, tokens, verification values
- [x] HMAC-SHA256 blind indexes for encrypted field lookups
- [x] Encrypted adapter wrapper for better-auth
- [x] Audit logging for all admin/security actions
- [x] Data migration script for encrypting existing plaintext data

---

## Phase 7 — Community Features (Complete)

**Goal:** Calendar, events, and member engagement.

- [x] Calendar page with monthly grid view
- [x] Event CRUD (create/read/update/delete) for moderators+
- [x] Recurring events (daily, weekly, biweekly, monthly, yearly)
- [x] Event visibility (public/private)
- [x] Upcoming events widget on home dashboard
- [x] Member directory page
- [x] Public user profile pages

---

## Dependency Graph

```
Phase 1 (Scaffolding)
  └── Phase 2 (Data Layer)
        └── Phase 3 (Auth & RBAC)
              ├── Phase 4 (Email / Resend)
              │     └── Phase 5 (React UI)
              ├── Phase 6 (Security Hardening)
              └── Phase 7 (Community Features)
```

All phases are complete. See `docs/implementation.md` for the roadmap of open enhancement issues (#82–#147).
