# MVP Requirements — Status

All original MVP requirements have been implemented and shipped.

| # | Requirement | Status |
|---|------------|--------|
| 1 | Uses React | Done — React 19 via Next.js 16 |
| 2 | Uses SQLite as a data store | Done — better-sqlite3 + Drizzle ORM |
| 3 | SQLite must support migrations | Done — Drizzle Kit (generate/migrate/push) |
| 4 | RBAC with 3 roles (Admin, Moderator, User) | Done — role hierarchy enforced across all routes |
| 5 | All users logon with username and 8-digit password | Done — better-auth with username plugin |
| 6 | Users must verify email via Resend before logging in | Done — 8-digit verification code flow |
| 7 | Users can change their password | Done — change password + forgot/reset flow |
| 8 | Admin/Moderator can send invite tokens via Resend | Done — invite creation, email delivery, acceptance |

## Beyond MVP (Shipped)

Features implemented after the original MVP scope:

- **Encryption at rest** — AES-256-GCM field encryption with blind indexes for all PII
- **Audit logging** — immutable trail for all admin/security actions
- **Calendar & events** — recurring events, public/private visibility, CRUD with role gating
- **Member directory** — searchable list of public profiles
- **Profile management** — photo upload, location, platoon, years served, visibility toggle
- **Email change with re-verification** — 8-digit code flow for email updates
- **Admin tools** — ban/unban, role change, password reset, manual email verify, user deletion
- **Session management** — view and revoke active sessions
- **Home dashboard** — upcoming events, profile info, quick actions
- **Rate limiting** — database-backed rate limiting on auth endpoints
- **Confirmation dialogs** — styled modals for destructive actions
- **Invite revocation** — cancel pending invites
