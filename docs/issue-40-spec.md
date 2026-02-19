# Technical Specification for Issue #40

## Issue Summary

- **Title:** Encrypt sensitive fields in SQLite database
- **Description:** All data in the SQLite database is stored as plaintext (except bcrypt-hashed passwords). If the database file is accessed by an unauthorized party, sensitive user information is immediately readable.
- **Labels:** enhancement
- **Priority:** High — this is a data-at-rest security issue affecting PII and authentication tokens

## Problem Statement

The SQLite database stores sensitive data in plaintext: user emails, session tokens, OAuth tokens, invite tokens, and verification values. If the `.db` file is exfiltrated (server compromise, backup leak, or improper access controls), all PII and auth credentials are immediately readable.

The core challenge is that some encrypted fields (notably `user.email`, `inviteToken.token`, `emailVerificationCode.email`) are **queried with equality checks** (`eq(field, value)`), so they need a lookup strategy — you can't do `WHERE email = 'foo@bar.com'` on a ciphertext column. Additionally, **better-auth reads/writes many of these fields directly** through its Drizzle adapter, so the encryption layer must be transparent to both application code and better-auth internals.

## Technical Approach

### Encryption Primitive
- **AES-256-GCM** via Node.js `crypto` module — authenticated encryption with unique IV per value
- Store as `iv:ciphertext:authTag` base64-encoded string in TEXT columns
- Key from `ENCRYPTION_KEY` env var (32-byte base64 string)

### Blind Indexes for Queryable Fields
Fields queried with `eq()` need a deterministic, non-reversible lookup column:
- Add `emailHash` column to `user` table (SHA-256 HMAC of normalized email using a separate `BLIND_INDEX_KEY`)
- Add `pendingEmailHash` column to `user` table
- Add `tokenHash` column to `inviteToken` table
- Add `emailHash` column to `emailVerificationCode` table
- All `eq(field, value)` queries switch to `eq(fieldHash, hmac(value))`

### Fields by Strategy

| Field | Table | Strategy | Needs Blind Index |
|-------|-------|----------|-------------------|
| `email` | user | Encrypt + blind index | **Yes** (5 query sites) |
| `pendingEmail` | user | Encrypt + blind index | **Yes** (2 query sites) |
| `token` | session | Encrypt only | No (better-auth manages via adapter) |
| `ipAddress` | session | Encrypt only | No (never queried) |
| `accessToken` | account | Encrypt only | No (no OAuth configured, no queries) |
| `refreshToken` | account | Encrypt only | No |
| `token` | inviteToken | Encrypt + blind index | **Yes** (2 query sites) |
| `email` | inviteToken | Encrypt + blind index | **Yes** (2 query sites) |
| `value` | verification | Encrypt only | No (unused by app, better-auth internal) |
| `email` | emailVerificationCode | Encrypt + blind index | **Yes** (5 query sites) |
| `targetEmail` | auditLog | Encrypt only | No (display only, not queried by value) |

### better-auth Integration
better-auth uses the Drizzle adapter directly, so encryption must happen at the adapter/utility layer — not in individual route handlers. Two options:

**Option A (Recommended): Encryption utility functions + wrapped adapter**
- Create `src/lib/crypto.ts` with `encrypt()`, `decrypt()`, `hmac()` functions
- Create a Drizzle middleware/wrapper that intercepts reads/writes for sensitive columns
- better-auth calls pass through the same Drizzle instance, getting transparent encryption

**Option B: Custom better-auth adapter hooks**
- better-auth supports `databaseHooks` in config for `user.create`, `user.update`, `session.create` etc.
- Encrypt in `create`/`update` hooks, but reads still return ciphertext — need a post-read layer

**Option A is cleaner** because it handles both application queries and better-auth queries uniformly.

## Implementation Plan

### Step 1: Create encryption utility (`src/lib/crypto.ts`)
- `encrypt(plaintext: string): string` — AES-256-GCM, returns `iv:ciphertext:tag` base64
- `decrypt(encrypted: string): string` — reverse
- `hmacHash(value: string): string` — HMAC-SHA256 for blind indexes
- `isEncrypted(value: string): boolean` — detect if a value is already encrypted (for migration)
- Export constants for env var names

### Step 2: Schema changes + migration
Add blind index columns:
- `user`: `emailHash`, `pendingEmailHash`
- `inviteToken`: `tokenHash`, `emailHash`
- `emailVerificationCode`: `emailHash`

Run `drizzle-kit generate` + `drizzle-kit push`.

### Step 3: Create encrypted field helpers (`src/lib/encrypted-fields.ts`)
- Define a map of `table.column` → `{ encrypt: true, blindIndex: 'hashColumnName' | null }`
- Helper functions: `encryptRow(table, data)`, `decryptRow(table, data)`, `addBlindIndexes(table, data)`

### Step 4: Update application queries
Replace all `eq(user.email, value)` with `eq(user.emailHash, hmacHash(value))` across:
- `src/app/api/invites/route.ts`
- `src/app/api/verify-code/route.ts`
- `src/app/api/verify-code/resend/route.ts`
- `src/app/api/users/[id]/email/route.ts`
- `src/app/api/users/[id]/email/confirm/route.ts`
- `src/lib/auth.ts` (signup guard invite check, email verification hook)

Add decrypt calls when reading sensitive fields for API responses or email sending.

### Step 5: Integrate with better-auth via `databaseHooks`
Use better-auth's `databaseHooks` config to encrypt on create/update for `user`, `session`, `account` tables. Add a post-query decryption layer by wrapping the db instance or using Drizzle's `$onSelect` pattern.

### Step 6: Data migration script (`scripts/migrate-encryption.ts`)
- Read all existing rows from affected tables
- Encrypt plaintext values, compute blind indexes
- Write back encrypted values + hashes
- Idempotent: skip already-encrypted values via `isEncrypted()` check

### Step 7: Update `.env.example` and docs
- Add `ENCRYPTION_KEY` and `BLIND_INDEX_KEY` to `.env.example`
- Add key generation instructions to deployment docs
- Document rotation strategy

### Step 8: Tests
- Unit tests for `crypto.ts` (encrypt/decrypt roundtrip, hmac determinism, IV uniqueness)
- Unit tests for `encrypted-fields.ts` (row encryption/decryption, blind index generation)
- Integration tests verifying queries still work with blind indexes
- Test migration script idempotency

## Test Plan

1. **Unit Tests** (`src/lib/__tests__/crypto.test.ts`):
   - encrypt/decrypt roundtrip produces original value
   - Different plaintexts produce different ciphertexts
   - Same plaintext produces different ciphertexts (unique IV)
   - hmacHash is deterministic (same input = same output)
   - hmacHash produces different output for different inputs
   - decrypt throws on tampered ciphertext (GCM auth)
   - Missing ENCRYPTION_KEY throws descriptive error

2. **Unit Tests** (`src/lib/__tests__/encrypted-fields.test.ts`):
   - encryptRow encrypts only mapped fields
   - decryptRow decrypts only mapped fields
   - addBlindIndexes computes correct hash columns
   - Non-sensitive fields pass through unchanged

3. **Integration Tests** (updated route tests):
   - Email uniqueness checks work via blind index
   - Invite token lookups work via blind index
   - Verification code email lookups work via blind index
   - API responses return decrypted values

4. **Migration Tests** (`scripts/__tests__/migrate-encryption.test.ts`):
   - Plaintext rows are encrypted after migration
   - Already-encrypted rows are skipped (idempotent)
   - Blind indexes are populated correctly

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/crypto.ts` | AES-256-GCM encrypt/decrypt + HMAC blind index functions |
| `src/lib/encrypted-fields.ts` | Table/column encryption mapping and row-level helpers |
| `src/lib/__tests__/crypto.test.ts` | Tests for encryption primitives |
| `src/lib/__tests__/encrypted-fields.test.ts` | Tests for field-level encryption helpers |
| `scripts/migrate-encryption.ts` | One-time data migration script |
| `scripts/__tests__/migrate-encryption.test.ts` | Migration idempotency tests |

## Files to Modify

| File | Changes |
|------|---------|
| `src/db/schema.ts` | Add `emailHash`, `pendingEmailHash` to user; `tokenHash`, `emailHash` to inviteToken; `emailHash` to emailVerificationCode |
| `src/lib/auth.ts` | Add `databaseHooks` for encrypt-on-write; update signup guard and email verification hook to use blind indexes |
| `src/app/api/invites/route.ts` | Switch `eq(inviteToken.email, ...)` to blind index; decrypt on read |
| `src/app/api/invites/[token]/route.ts` | Switch `eq(inviteToken.token, ...)` to blind index; decrypt on read |
| `src/app/api/invites/[token]/accept/route.ts` | Switch token lookup to blind index; encrypt email on code insert |
| `src/app/api/verify-code/route.ts` | Switch `eq(user.email, ...)` to blind index |
| `src/app/api/verify-code/resend/route.ts` | Switch email lookups to blind index |
| `src/app/api/users/[id]/route.ts` | Decrypt email/pendingEmail before returning |
| `src/app/api/users/[id]/email/route.ts` | Use blind indexes for uniqueness checks; encrypt pendingEmail on write |
| `src/app/api/users/[id]/email/confirm/route.ts` | Use blind indexes; encrypt email on commit |
| `src/app/api/users/[id]/email/resend/route.ts` | Use blind index for code lookup |
| `src/app/api/audit-logs/route.ts` | Decrypt targetEmail on read |
| `.env.example` | Add `ENCRYPTION_KEY` and `BLIND_INDEX_KEY` |
| `docs/deployment.md` | Add key generation + rotation instructions |

## Existing Utilities to Leverage

- `src/lib/verification-code.ts` — `hashCode()` uses SHA-256 already; similar pattern for HMAC
- `src/db/index.ts` — single Drizzle instance; encryption wrapper goes here or in a middleware layer
- `drizzle-kit` — for schema migrations
- Node.js `crypto` — built-in, no new dependencies needed

## Sensitive Field Usage Audit

### user.email

**Queries (5 sites):**
- `src/app/api/invites/route.ts:62` — `eq(user.email, email)`
- `src/app/api/verify-code/resend/route.ts:27` — `eq(user.email, email)`
- `src/app/api/users/[id]/email/route.ts:70` — `or(eq(user.email, trimmedEmail), eq(user.pendingEmail, trimmedEmail))`
- `src/app/api/users/[id]/email/confirm/route.ts:60` — `or(eq(user.email, pendingEmail), eq(user.pendingEmail, pendingEmail))`
- `src/app/api/verify-code/route.ts:68` — `eq(user.email, email)`

**Selects:**
- `src/app/api/users/[id]/email/route.ts:49-50` — `.select({ email: user.email, pendingEmail: user.pendingEmail })`
- `src/app/api/users/[id]/email/confirm/route.ts:41-42` — same pattern
- `src/app/api/users/[id]/email/resend/route.ts:36` — `.select({ pendingEmail: user.pendingEmail })`

**Writes:**
- `src/app/api/users/[id]/email/route.ts:100-103` — `.set({ pendingEmail: trimmedEmail })`
- `src/app/api/users/[id]/email/confirm/route.ts:116-124` — `.set({ email: pendingEmail, pendingEmail: null })`

**API exposures (owner/admin only):**
- `src/app/api/users/[id]/route.ts:48` — `response.email = found.email`
- `src/app/hello/page.tsx:41` — `{user.email}` in client component

**better-auth interactions:**
- `src/lib/auth.ts:66,84` — `user.email` passed to email functions
- `src/lib/auth.ts:78` — `eq(schema.inviteToken.email, user.email)` in verification hook
- `src/lib/auth.ts:23` — `eq(schema.inviteToken.email, email)` in signup guard

### session.token / session.ipAddress
- No explicit application queries — better-auth manages via drizzle adapter
- `src/app/api/users/[id]/ban/route.ts:85` — deletes sessions by userId (not by token)

### account.accessToken / account.refreshToken
- Schema definition only — no OAuth providers configured, no application queries

### inviteToken.token
- `src/app/api/invites/[token]/route.ts:13` — `eq(inviteToken.token, token)`
- `src/app/api/invites/[token]/accept/route.ts:13` — `eq(inviteToken.token, token)`
- `src/app/api/invites/route.ts:100` — token exposed in creation response
- `src/app/api/invites/route.ts:121` — all invites returned to admins

### inviteToken.email
- `src/lib/auth.ts:23` — `eq(schema.inviteToken.email, email)` in signup guard
- `src/lib/auth.ts:78` — `eq(schema.inviteToken.email, user.email)` in verification hook
- `src/app/api/invites/route.ts:62` — `eq(user.email, email)` uniqueness check

### emailVerificationCode.email (5 query sites)
- `src/app/api/verify-code/route.ts:22`
- `src/app/api/verify-code/resend/route.ts:43`
- `src/app/api/users/[id]/email/route.ts:86`
- `src/app/api/users/[id]/email/confirm/route.ts:75`
- `src/app/api/users/[id]/email/resend/route.ts:54`

### auditLog.targetEmail
- Written by `src/lib/audit.ts:24`
- Exposed in `src/app/api/audit-logs/route.ts:52` and `src/app/admin/audit/page.tsx:176`

## Success Criteria

- [ ] All fields listed in the issue are encrypted at rest
- [ ] Queries using blind indexes return correct results
- [ ] better-auth sign-up, sign-in, password reset, and session management still work
- [ ] Email change flow (initiate/confirm/resend) still works
- [ ] Invite creation, acceptance, and revocation still work
- [ ] Migration script encrypts all existing plaintext data
- [ ] Migration script is idempotent (safe to run multiple times)
- [ ] `npm run build` succeeds
- [ ] `npm test` — all existing + new tests pass
- [ ] `ENCRYPTION_KEY` and `BLIND_INDEX_KEY` documented in `.env.example`

## Out of Scope

- **Key rotation mechanism** — document the strategy but don't build automated rotation tooling for MVP
- **Encrypting `username`** — intentionally left plaintext per the issue (public-facing identifier with unique constraint)
- **Encrypting `password`** — already bcrypt-hashed by better-auth
- **Full-text search on encrypted fields** — only equality lookups supported via blind indexes
- **Database-level encryption (SQLCipher)** — issue specifies application-level encryption
- **Encrypting `auditLog.action`, `auditLog.detail`** — not PII, needed for admin visibility
