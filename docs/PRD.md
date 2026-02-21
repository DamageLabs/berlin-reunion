# Product Requirements Document — Berlin Reunion

## Overview

Berlin Reunion is a private web application for veterans of the US Army's 502nd Infantry Regiment who served in Berlin, Germany. It serves as a community hub for reconnecting members, organizing events, and managing reunion planning ahead of the 2029 reunion.

The platform is **invite-only** — only existing members (admin/moderator) can invite new users via email. All users must verify their email before gaining access.

## Target Users

- **Veterans** (regular users): Browse member directory, view events, manage their profile
- **Moderators**: All user capabilities plus event management, invite creation, limited user administration
- **Admins**: Full control — user management, role assignment, bans, audit log access, event management

## Core Features

### Authentication & Authorization
- Email + password authentication via better-auth
- Username-based login (alphanumeric usernames)
- Invite-only registration with email verification (8-digit code)
- Forgot/reset password flow
- Force password change (admin-triggered)
- Role-based access control: user < moderator < admin
- Session management with 7-day expiry
- Rate limiting on auth endpoints (5 attempts/min sign-in, 3/min sign-up)

### User Profiles
- Profile fields: name, username, location, platoon, years served, profile photo
- Public/private profile visibility toggle
- Profile photo upload (stored in public/uploads/)
- Email change with re-verification
- Editable by owner; viewable by others based on visibility setting

### Member Directory
- Searchable list of members with public profiles
- Filter by platoon, location
- Links to individual public profile pages

### Calendar & Events
- Monthly calendar grid view
- Event creation/editing by moderators and admins
- Recurring events: daily, weekly, biweekly, monthly, yearly
- Event visibility: public (all users) or private (moderator+ only)
- Upcoming events widget on home dashboard
- Event detail modal with edit/delete actions
- Styled delete confirmation for events (with recurring series warning)

### Invite System
- Admins and moderators create invite tokens sent via email
- Tokens are single-use, expirable
- Pre-assigns role and email to registration
- Invite revocation support

### Email Integration
- Transactional email via Resend SDK
- Email types: verification code, email change verification, password reset, admin password reset, invite
- Lazy-initialized to avoid build errors when API key is empty

### Admin Panel
- User management: list, search, filter, sort
- Role changes (admin only)
- Ban/unban with reason and optional expiry
- Password reset for users
- Manual email verification
- User deletion with cascade
- Audit log viewer

### Audit Logging
- Immutable audit trail for all admin/security actions
- Tracked events: role changes, bans, invites, email changes, password resets, login attempts, user deletions, event CRUD
- Encrypted target email field for privacy

### Security
- AES-256-GCM field-level encryption for PII at rest
- HMAC-SHA256 blind indexes for encrypted field lookups
- Encrypted fields: user email, session tokens, invite tokens, verification values, audit target emails
- Rate limiting (database-backed)
- Content Security via Next.js proxy

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19 + Tailwind CSS v4 |
| Database | SQLite via better-sqlite3 |
| ORM | Drizzle ORM |
| Auth | better-auth (username + admin plugins) |
| Email | Resend SDK |
| Encryption | Node.js crypto (AES-256-GCM + HMAC-SHA256) |
| Testing | Vitest (unit/component) + Playwright (E2E) |
| Deployment | GCP VM + Nginx + Let's Encrypt |

## Database Schema

11 tables: user, session, account, verification, rateLimit, emailVerificationCode, auditLog, event, inviteToken, plus Drizzle migration metadata.

## Non-Functional Requirements

- **Privacy**: All sensitive data encrypted at rest; profile visibility controlled by user
- **Performance**: SQLite with WAL mode; server-side rendering where possible
- **Accessibility**: Keyboard-navigable; screen-reader-compatible (ongoing improvement)
- **Mobile**: Responsive design (ongoing improvement for header/tables)
- **Security**: Invite-only registration, rate limiting, encrypted PII, audit trail
