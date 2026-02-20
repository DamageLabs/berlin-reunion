# E2E Tests (Playwright)

Browser-level end-to-end tests covering auth flows, registration, password management, and admin RBAC.

## Prerequisites

Install the Playwright browser binary (one-time):

```bash
npx playwright install chromium
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run a single spec file
npx playwright test e2e/auth.spec.ts

# Run tests matching a grep pattern
npx playwright test -g "login with valid"
```

## Headed Mode (visible browser)

Watch tests execute in a real browser window:

```bash
npx playwright test --headed
npx playwright test e2e/admin.spec.ts --headed
```

## UI Mode (interactive)

Opens Playwright's interactive test runner with time-travel debugging, DOM snapshots, and the ability to re-run individual tests:

```bash
npx playwright test --ui
```

## Debug Mode

Pauses execution at each step so you can inspect the browser:

```bash
npx playwright test --debug
npx playwright test e2e/registration.spec.ts --debug
```

## Viewing the HTML Report

After a test run, open the generated report:

```bash
npx playwright show-report
```

The report includes screenshots, traces, and error context for failed tests.

## Test Specs

| File | Tests | Covers |
|------|-------|--------|
| `auth.spec.ts` | 4 | Login, wrong password, auth guard redirect, logout |
| `registration.spec.ts` | 3 | No invite, invalid invite, full registration + email verification |
| `password.spec.ts` | 2 | Change password, wrong current password |
| `admin.spec.ts` | 5 | RBAC redirect, dashboard, send invite, role change, ban/unban |

## How It Works

### Test Database

Tests use a dedicated SQLite database (`data/test-e2e.db`) that is wiped and re-created on every run via `e2e/global-setup.ts`. Your development database is never touched.

### Dev Server

Playwright automatically starts a Next.js dev server on **port 3051** using the env vars from `.env.test`. It uses a separate build directory (`.next-test`) so it can run alongside your normal `npm run dev` server on port 3050.

If port 3051 is already occupied by a previous test run, Playwright reuses it (`reuseExistingServer: true` locally).

### Seeded Users

Global setup seeds three users for tests:

| Username | Password | Role | Email |
|----------|----------|------|-------|
| `admin` | `admin123` | admin | admin@test.com |
| `testuser` | `test1234` | user | testuser@test.com |
| `testmod` | `test1234` | moderator | testmod@test.com |

An unused invite token for `newuser@test.com` is also created for registration tests.

### Rate Limiting

Each test clears the `rate_limit` table before running to prevent cross-test throttling from better-auth's per-endpoint limits.

### Email

`.env.test` uses a fake Resend API key. Emails are "sent" (the Resend client initializes and makes an API call that returns an error) but never delivered. The verification code flow works by seeding a known code hash directly in the database.

## Troubleshooting

**Tests fail with "Too many requests"** -- Rate limit table wasn't cleared. This shouldn't happen with the `beforeEach` hooks, but you can manually clear it by deleting `data/test-e2e.db` and re-running.

**"Unable to acquire lock" error** -- Another Next.js dev server is using the same `.next-test` directory. Kill any stale `next dev` processes on port 3051:
```bash
lsof -ti:3051 | xargs kill
```

**Tests pass individually but fail together** -- Likely a rate limiting or state issue. Run with `--headed` to watch the flow and check for error messages on the login page.

**Browser not installed** -- Run `npx playwright install chromium`.
