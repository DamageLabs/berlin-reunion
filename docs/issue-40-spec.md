# Technical Specification for Issue #40

## Issue Summary

- **Title:** Encrypt sensitive fields in SQLite database
- **Description:** All data in the SQLite database is stored as plaintext (except bcrypt-hashed passwords). If the database file is accessed by an unauthorized party, sensitive user information is immediately readable.
- **Labels:** enhancement
- **Priority:** High — this is a data-at-rest security issue affecting PII and authentication tokens

## Problem Statement

The SQLite database stores sensitive data in plaintext: user emails, session tokens, OAuth tokens, invite tokens, and verification values. If the `.db` file is exfiltrated (server compromise, backup leak, or improper access controls), all PII and auth credentials are immediately readable.

Two challenges make this non-trivial:

1. **Queryable fields need blind indexes.** Fields like `user.email` and `inviteToken.token` are looked up with equality checks (`WHERE email = ?`). You can't query a ciphertext column with a plaintext value. Each queryable encrypted field needs a deterministic HMAC hash column for lookups.

2. **better-auth manages several sensitive fields internally.** It queries `user.email` during sign-in and `session.token` during session validation via its Drizzle adapter. The encryption layer must be transparent to better-auth — it cannot be bolted on with route-level code alone.

## Technical Approach

### Why Not "Drizzle Middleware" or "databaseHooks Alone"

The original spec proposed a Drizzle middleware or `databaseHooks`. Investigation of better-auth internals revealed these don't work:

- **Drizzle has no middleware/interceptor pattern.** There is no hook between a `.select()` call and the database.
- **`databaseHooks` only cover writes** (`create.before`, `update.before`, `delete.before`). There are no read hooks, so better-auth's internal `findUserByEmail()` and `findSession()` still see ciphertext.
- **Field transforms** (`transform.input`/`transform.output`) only apply during input parsing, not during where-clause construction. A `findOne({ where: [{ field: "email", value: "foo@bar.com" }] })` passes the plaintext value straight to the query.

### Chosen Approach: Adapter Wrapper + Explicit Application Code

better-auth's `drizzleAdapter()` returns a higher-order function `(options) => DBAdapter`. The `DBAdapter` interface exposes model-based CRUD methods (`findOne`, `findMany`, `create`, `update`, `delete`, etc.) where queries use `{ field, value, operator }` objects — not raw Drizzle column references. This abstraction layer is the right place to intercept.

**Two layers handle all encryption:**

| Layer | Scope | Handles |
|-------|-------|---------|
| **Adapter wrapper** (`src/lib/encrypted-adapter.ts`) | Tables managed by better-auth | `user.email`, `user.pendingEmail`, `session.token`, `session.ipAddress`, `verification.value` |
| **Explicit application code** | Tables managed by app code only | `inviteToken.token`, `inviteToken.email`, `emailVerificationCode.email`, `auditLog.targetEmail` |

**Additionally:** `account.accessToken` and `account.refreshToken` use better-auth's **built-in** `encryptOAuthTokens: true` option — zero custom code needed.

### Encryption Primitive

- **AES-256-GCM** via Node.js `crypto` module — authenticated encryption with unique IV per value
- Store as `iv:ciphertext:authTag` base64-encoded string in TEXT columns
- Key from `ENCRYPTION_KEY` env var (32-byte base64 string)

### Blind Indexes

- **HMAC-SHA256** using a separate `BLIND_INDEX_KEY` env var
- Normalized input (lowercase + trim for emails) before hashing
- Stored in dedicated `*Hash` columns with unique constraints replacing the original unique constraints on encrypted columns

### Fields by Strategy

| Field | Table | Managed By | Strategy | Blind Index Column |
|-------|-------|------------|----------|-------------------|
| `email` | user | better-auth + app | Adapter wrapper: encrypt + blind index | `emailHash` |
| `pendingEmail` | user | app | Adapter wrapper: encrypt + blind index | `pendingEmailHash` |
| `token` | session | better-auth | Adapter wrapper: encrypt + blind index | `tokenHash` |
| `ipAddress` | session | better-auth | Adapter wrapper: encrypt only | — |
| `accessToken` | account | better-auth | **Built-in** `encryptOAuthTokens: true` | — |
| `refreshToken` | account | better-auth | **Built-in** `encryptOAuthTokens: true` | — |
| `value` | verification | better-auth | Adapter wrapper: encrypt only | — |
| `token` | inviteToken | app | Explicit: encrypt + blind index | `tokenHash` |
| `email` | inviteToken | app | Explicit: encrypt + blind index | `emailHash` |
| `email` | emailVerificationCode | app | Explicit: encrypt + blind index | `emailHash` |
| `targetEmail` | auditLog | app | Explicit: encrypt only | — |

### Adapter Wrapper Design

The wrapper intercepts the `DBAdapter` methods returned by `drizzleAdapter()`:

```
drizzleAdapter(db, config) → (options) → DBAdapter
                                            ↓
                              encryptedAdapter wraps this
                                            ↓
                              create:    encrypt fields + add blind indexes → delegate
                              update:    encrypt fields + add blind indexes → delegate
                              findOne:   rewrite where (field→hash) → delegate → decrypt result
                              findMany:  rewrite where (field→hash) → delegate → decrypt results
                              delete:    rewrite where (field→hash) → delegate
                              updateMany: encrypt + rewrite where → delegate
```

**Where clause rewriting example:**
```
Input:  { field: "email", value: "foo@bar.com" }
Output: { field: "emailHash", value: hmacHash("foo@bar.com") }
```

**Configuration map** drives the wrapper (no hardcoded logic per model):
```typescript
const ENCRYPTED_FIELDS = {
  user: {
    email:        { blindIndex: "emailHash" },
    pendingEmail: { blindIndex: "pendingEmailHash" },
  },
  session: {
    token:     { blindIndex: "tokenHash" },
    ipAddress: { blindIndex: null },
  },
  verification: {
    value: { blindIndex: null },
  },
};
```

## Implementation Plan

### Step 1: Create encryption utility (`src/lib/crypto.ts`)

- `encrypt(plaintext: string): string` — AES-256-GCM, returns `iv:ciphertext:tag` base64
- `decrypt(encrypted: string): string` — reverse
- `hmacHash(value: string): string` — HMAC-SHA256 for blind indexes
- `isEncrypted(value: string): boolean` — detect `iv:ciphertext:tag` format (for migration idempotency and graceful handling of pre-migration data)
- `safeDecrypt(value: string): string` — returns plaintext if not encrypted (migration transition)
- Throws descriptive error if `ENCRYPTION_KEY` or `BLIND_INDEX_KEY` env vars are missing

### Step 2: Schema changes + migration

Add blind index columns (TEXT, unique where applicable):
- `user`: `emailHash` (unique), `pendingEmailHash`
- `session`: `tokenHash` (unique)
- `inviteToken`: `tokenHash` (unique), `emailHash`
- `emailVerificationCode`: `emailHash`

Move unique constraints: `user.email` unique → `user.emailHash` unique. Same for `session.token` → `session.tokenHash`, `inviteToken.token` → `inviteToken.tokenHash`.

Run `drizzle-kit generate` + `drizzle-kit push`.

### Step 3: Create adapter wrapper (`src/lib/encrypted-adapter.ts`)

- Export `createEncryptedAdapter(baseAdapterFactory)` that returns a new adapter factory with the same signature
- Wraps all CRUD methods using the `ENCRYPTED_FIELDS` config map
- **create**: encrypt mapped fields, compute blind indexes, delegate to base adapter, decrypt return value
- **update / updateMany**: encrypt mapped fields in update payload, rewrite where clauses, delegate
- **findOne / findMany**: rewrite where clauses for blind-indexed fields, delegate, decrypt mapped fields in results
- **delete / deleteMany**: rewrite where clauses, delegate
- **count / transaction**: delegate directly (no sensitive data in count; transaction wraps the already-wrapped adapter)

### Step 4: Wire adapter into better-auth config (`src/lib/auth.ts`)

```typescript
import { createEncryptedAdapter } from "@/lib/encrypted-adapter";

database: createEncryptedAdapter(drizzleAdapter)(db, {
  provider: "sqlite",
  schema,
}),

account: {
  encryptOAuthTokens: true,
},
```

Update hooks in `auth.ts` that do direct Drizzle queries on better-auth-managed fields:
- `signupGuard`: `eq(schema.inviteToken.email, email)` → `eq(schema.inviteToken.emailHash, hmacHash(email))`
- `sendVerificationEmail` hook: `eq(schema.inviteToken.email, user.email)` → `eq(schema.inviteToken.emailHash, hmacHash(user.email))`

Note: `user.email` inside better-auth hooks is already decrypted by the adapter wrapper before reaching hook code.

### Step 5: Update application queries (app-managed tables)

For tables NOT managed by better-auth (inviteToken, emailVerificationCode, auditLog), add explicit encrypt/decrypt in route handlers:

**inviteToken** — 4 files:
- `src/app/api/invites/route.ts` — encrypt email on create; use `emailHash` for lookups; decrypt on list response
- `src/app/api/invites/[token]/route.ts` — use `tokenHash` for lookup; decrypt fields on response
- `src/app/api/invites/[token]/accept/route.ts` — use `tokenHash` for lookup; encrypt email when inserting verification code
- `src/lib/auth.ts` — signup guard and verification hook already updated in Step 4

**emailVerificationCode** — 5 files:
- `src/app/api/verify-code/route.ts` — use `emailHash` for lookup
- `src/app/api/verify-code/resend/route.ts` — use `emailHash` for lookup + delete; encrypt email on insert
- `src/app/api/users/[id]/email/route.ts` — use `emailHash` for uniqueness + delete; encrypt email on insert
- `src/app/api/users/[id]/email/confirm/route.ts` — use `emailHash` for lookup + delete
- `src/app/api/users/[id]/email/resend/route.ts` — use `emailHash` for delete; encrypt email on insert

**auditLog** — 2 files:
- `src/lib/audit.ts` — encrypt `targetEmail` on write
- `src/app/api/audit-logs/route.ts` — decrypt `targetEmail` on read

**user (app-level queries)** — these use direct Drizzle, NOT the adapter:
- `src/app/api/invites/route.ts` — `eq(user.email, email)` → `eq(user.emailHash, hmacHash(email))`
- `src/app/api/verify-code/route.ts` — same pattern
- `src/app/api/verify-code/resend/route.ts` — same pattern
- `src/app/api/users/[id]/email/route.ts` — switch `or(eq(user.email, ...), eq(user.pendingEmail, ...))` to use hash columns; encrypt `pendingEmail` on write; decrypt on read
- `src/app/api/users/[id]/email/confirm/route.ts` — switch to hash columns; encrypt `email` on commit; decrypt on read
- `src/app/api/users/[id]/email/resend/route.ts` — decrypt `pendingEmail` on read
- `src/app/api/users/[id]/route.ts` — decrypt `email`/`pendingEmail` on read (already exposed only to owner/admin)

### Step 6: Data migration script (`scripts/migrate-encryption.ts`)

- Read all rows from each affected table
- For each row: skip if `isEncrypted(value)` is true (idempotent)
- Encrypt plaintext values, compute blind indexes
- Write back in batches (100 rows per transaction)
- Print progress: `Migrated X/Y rows in table Z`
- Runnable via `npx tsx scripts/migrate-encryption.ts`

### Step 7: Update `.env.example` and docs

- Add `ENCRYPTION_KEY` and `BLIND_INDEX_KEY` to `.env.example` with generation instructions
- Add key generation commands to `docs/deployment.md`:
  ```bash
  openssl rand -base64 32  # ENCRYPTION_KEY
  openssl rand -base64 32  # BLIND_INDEX_KEY
  ```
- Document that keys must be set BEFORE running the migration script
- Document rotation strategy (re-encrypt all rows with new key, update blind indexes if BLIND_INDEX_KEY changes)

### Step 8: Tests

- Unit tests for `crypto.ts`
- Unit tests for `encrypted-adapter.ts` (mock base adapter, verify interception)
- Updated route tests with encryption env vars set
- Migration script idempotency tests

## Test Plan

1. **Unit Tests** (`src/lib/__tests__/crypto.test.ts`):
   - encrypt/decrypt roundtrip produces original value
   - Different plaintexts produce different ciphertexts
   - Same plaintext produces different ciphertexts (unique IV)
   - hmacHash is deterministic (same input = same output)
   - hmacHash produces different output for different inputs
   - decrypt throws on tampered ciphertext (GCM auth tag failure)
   - isEncrypted correctly identifies encrypted vs plaintext values
   - safeDecrypt returns plaintext strings unchanged
   - Missing ENCRYPTION_KEY throws descriptive error

2. **Unit Tests** (`src/lib/__tests__/encrypted-adapter.test.ts`):
   - create: encrypts mapped fields, adds blind indexes, decrypts return value
   - findOne: rewrites where clause for blind-indexed field, decrypts result
   - findMany: rewrites where clauses, decrypts all results
   - update: encrypts update payload, rewrites where clause
   - delete: rewrites where clause for blind-indexed field
   - Non-sensitive fields pass through unchanged
   - Non-mapped models pass through unchanged

3. **Integration Tests** (updated route tests):
   - Email uniqueness checks work via blind index
   - Invite token lookups work via blind index
   - Verification code email lookups work via blind index
   - API responses return decrypted values (not ciphertext)
   - better-auth sign-in works (email lookup via adapter wrapper)
   - better-auth session validation works (token lookup via adapter wrapper)

4. **Migration Tests** (`scripts/__tests__/migrate-encryption.test.ts`):
   - Plaintext rows are encrypted after migration
   - Already-encrypted rows are skipped (idempotent)
   - Blind indexes are populated correctly
   - Unique constraints hold on hash columns

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/crypto.ts` | AES-256-GCM encrypt/decrypt + HMAC blind index functions |
| `src/lib/encrypted-adapter.ts` | Adapter wrapper factory — intercepts better-auth's DB calls |
| `src/lib/__tests__/crypto.test.ts` | Tests for encryption primitives |
| `src/lib/__tests__/encrypted-adapter.test.ts` | Tests for adapter wrapper interception |
| `scripts/migrate-encryption.ts` | One-time data migration script |
| `scripts/__tests__/migrate-encryption.test.ts` | Migration idempotency tests |

## Files to Modify

| File | Changes |
|------|---------|
| `src/db/schema.ts` | Add `emailHash`, `pendingEmailHash` to user; `tokenHash` to session; `tokenHash`, `emailHash` to inviteToken; `emailHash` to emailVerificationCode. Move unique constraints from encrypted columns to hash columns. |
| `src/lib/auth.ts` | Use `createEncryptedAdapter` wrapper; add `encryptOAuthTokens: true`; update signup guard and verification hook to use blind indexes on inviteToken |
| `src/app/api/invites/route.ts` | Encrypt email/token on create; use blind indexes for lookups; decrypt on list response |
| `src/app/api/invites/[token]/route.ts` | Use `tokenHash` for lookup; decrypt fields |
| `src/app/api/invites/[token]/accept/route.ts` | Use `tokenHash` for lookup; encrypt email on verification code insert |
| `src/app/api/verify-code/route.ts` | Use `emailHash` for user and code lookups |
| `src/app/api/verify-code/resend/route.ts` | Use `emailHash` for lookups; encrypt email on insert |
| `src/app/api/users/[id]/route.ts` | Decrypt email/pendingEmail before returning |
| `src/app/api/users/[id]/email/route.ts` | Use hash columns for uniqueness; encrypt pendingEmail/email on write; decrypt on read |
| `src/app/api/users/[id]/email/confirm/route.ts` | Use hash columns; encrypt email on commit; decrypt on read |
| `src/app/api/users/[id]/email/resend/route.ts` | Use `emailHash` for code lookup; decrypt pendingEmail |
| `src/lib/audit.ts` | Encrypt `targetEmail` on write |
| `src/app/api/audit-logs/route.ts` | Decrypt `targetEmail` on read |
| `.env.example` | Add `ENCRYPTION_KEY` and `BLIND_INDEX_KEY` with generation instructions |
| `docs/deployment.md` | Add key generation + rotation documentation |

## Sensitive Field Usage Audit

### user.email (adapter-wrapped)

**better-auth internal queries (handled by adapter wrapper):**
- Sign-in: `findOne({ model: "user", where: [{ field: "email", value }] })` → wrapper rewrites to emailHash
- Sign-up: `create({ model: "user", data: { email, ... } })` → wrapper encrypts + adds emailHash
- Password reset: `findOne` by email → wrapper rewrites

**Application direct Drizzle queries (explicit code changes):**
- `src/app/api/invites/route.ts:62` — `eq(user.email, email)` → `eq(user.emailHash, hmacHash(email))`
- `src/app/api/verify-code/resend/route.ts:27` — same pattern
- `src/app/api/users/[id]/email/route.ts:70` — `or(eq(user.email, ...), eq(user.pendingEmail, ...))` → use hash columns
- `src/app/api/users/[id]/email/confirm/route.ts:60` — same pattern
- `src/app/api/verify-code/route.ts:68` — same pattern

**Reads requiring decryption:**
- `src/app/api/users/[id]/email/route.ts:49-50` — select email/pendingEmail → decrypt
- `src/app/api/users/[id]/email/confirm/route.ts:41-42` — same
- `src/app/api/users/[id]/email/resend/route.ts:36` — select pendingEmail → decrypt
- `src/app/api/users/[id]/route.ts:48` — response.email → decrypt
- `src/app/hello/page.tsx:41` — `{user.email}` from session (adapter decrypts before session is created)

**better-auth hook interactions:**
- `src/lib/auth.ts:66,84` — `user.email` passed to email functions (already decrypted by adapter)
- `src/lib/auth.ts:78` — `eq(schema.inviteToken.email, user.email)` → use `emailHash` + `hmacHash()`
- `src/lib/auth.ts:23` — `eq(schema.inviteToken.email, email)` → use `emailHash` + `hmacHash()`

### session.token / session.ipAddress (adapter-wrapped)

- All managed by better-auth via adapter — wrapper handles transparently
- `src/app/api/users/[id]/ban/route.ts:85` — deletes sessions by userId (not by token) — no change needed

### account.accessToken / account.refreshToken (built-in)

- Handled by `encryptOAuthTokens: true` — no custom code needed

### inviteToken.token / inviteToken.email (explicit app code)

- `src/app/api/invites/[token]/route.ts:13` — `eq(inviteToken.token, token)` → `eq(inviteToken.tokenHash, hmacHash(token))`
- `src/app/api/invites/[token]/accept/route.ts:13` — same
- `src/app/api/invites/route.ts:100` — token in creation response → decrypt
- `src/app/api/invites/route.ts:121` — all invites listed → decrypt email/token
- `src/lib/auth.ts:23,78` — inviteToken.email lookups → use emailHash (covered in Step 4)

### emailVerificationCode.email (explicit app code)

- `src/app/api/verify-code/route.ts:22` — `eq(emailVerificationCode.email, email)` → use emailHash
- `src/app/api/verify-code/resend/route.ts:43` — same
- `src/app/api/users/[id]/email/route.ts:86` — same
- `src/app/api/users/[id]/email/confirm/route.ts:75` — same
- `src/app/api/users/[id]/email/resend/route.ts:54` — same

### verification.value (adapter-wrapped)

- better-auth internal only — adapter wrapper handles transparently

### auditLog.targetEmail (explicit app code)

- `src/lib/audit.ts:24` — encrypt on write
- `src/app/api/audit-logs/route.ts:52` — decrypt on read
- `src/app/admin/audit/page.tsx:176` — displays value from API (already decrypted by route)

## Existing Utilities to Leverage

- `src/lib/verification-code.ts` — `hashCode()` uses SHA-256; similar pattern for HMAC
- `src/db/index.ts` — single Drizzle instance shared by app code and adapter
- `drizzle-kit` — for schema migrations
- Node.js `crypto` — built-in, no new dependencies needed
- better-auth `encryptOAuthTokens` — built-in OAuth token encryption

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
