# MVP Roadmap

## Resolved Decisions

- **8-digit password**: 8 alphanumeric characters
- **Backend framework**: Next.js (fullstack)
- **Invite token flow**: A shareable token (emailable or textable) that grants access to register
- **Session management**: better-auth (cookie-based sessions with Drizzle adapter)
- **App purpose beyond auth**: Hello page for now (post-login landing)

---

## Phase 1 — Project Scaffolding & Tooling

**Goal:** Bootable project with dev tooling in place.

- [ ] Initialize Next.js project with TypeScript
- [ ] Configure dev scripts (dev, build, lint)
- [ ] Add environment variable management (.env, dotenv)
- [ ] Set up Resend API key and SQLite DB path as env vars

**Exit criteria:** `npm run dev` starts the Next.js app with no errors.

---

## Phase 2 — Data Layer (SQLite + Drizzle)

**Goal:** Database schema, migrations, and seed data working.

- [ ] Install and configure Drizzle ORM with SQLite driver (better-sqlite3 or libsql)
- [ ] Define schema:
  - `users` table: id, username, email, password_hash, role (admin/moderator/user), email_verified, created_at, updated_at
  - `invite_tokens` table: id, token, email, invited_by (FK to users), role, used, created_at, expires_at
  - `email_verification_tokens` table: id, token, user_id (FK to users), created_at, expires_at
  - `sessions` table (managed by better-auth): id, user_id, token, expires_at
- [ ] Generate and run initial migration
- [ ] Create seed script that inserts a default Admin user
- [ ] Verify migration up/down cycle works cleanly

**Exit criteria:** Schema created via migration, seed admin exists in DB, `drizzle-kit` commands work.

---

## Phase 3 — Authentication & RBAC

**Goal:** Users can register, log in, log out, and are gated by role.

### 3a — Core Auth (via better-auth)
- [ ] Install and configure better-auth with Drizzle adapter (SQLite)
- [ ] Set up better-auth API route handler in Next.js
- [ ] Configure email/password authentication plugin
- [ ] Enforce 8-character alphanumeric password constraint at validation layer
- [ ] Set up better-auth client for frontend session access

### 3b — RBAC
- [ ] Define role hierarchy: Admin > Moderator > User
- [ ] Create authorization middleware that checks role on protected routes
- [ ] Admin-only routes (e.g., user management)
- [ ] Moderator routes (limited admin functionality — define scope)
- [ ] User routes (standard access)

### 3c — Password Change
- [ ] Authenticated endpoint for password change (requires current password)
- [ ] Validate new password meets 8-digit constraint

**Exit criteria:** Can register, log in, access role-gated endpoints, change password. All via API.

---

## Phase 4 — Email Integration (Resend)

**Goal:** Email verification and invite tokens functional.

### 4a — Email Verification
- [ ] Integrate Resend SDK
- [ ] On registration, generate verification token and send email
- [ ] Verification endpoint: validate token, mark user as `email_verified`
- [ ] Block login for unverified users
- [ ] Resend verification email endpoint

### 4b — Invite Tokens
- [ ] Admin/Moderator endpoint: generate invite token for an email address
- [ ] Send invite email via Resend with a registration link containing the token
- [ ] Registration flow accepts invite token, pre-fills email, optionally pre-assigns role
- [ ] Validate token on registration (not expired, not already used)
- [ ] Mark token as used after successful registration

**Exit criteria:** Full flow works — invite sent, user registers via invite, verifies email, logs in.

---

## Phase 5 — React UI

**Goal:** Frontend for all auth and invite flows.

- [ ] Login page (username + password)
- [ ] Registration page (with optional invite token param)
- [ ] Email verification page (handles token from email link)
- [ ] Password change page (authenticated)
- [ ] Post-login hello page (authenticated landing)
- [ ] Admin/Moderator dashboard:
  - User list with roles
  - Send invite form (email + role)
- [ ] Protected route wrappers (redirect to login if unauthenticated)
- [ ] Role-based UI gating (hide admin features from regular users)

**Exit criteria:** All flows from Phases 3–4 are usable through the browser. Authenticated users land on a hello page.

---

## Dependency Graph

```
Phase 1 (Scaffolding)
  └── Phase 2 (Data Layer)
        └── Phase 3 (Auth & RBAC)
              └── Phase 4 (Email / Resend)
                    └── Phase 5 (React UI)
```

Each phase is testable independently via API before the UI is built. Phase 5 wires everything together into a usable product.
