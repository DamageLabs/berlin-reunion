# Implementation Order

Prioritized by security, core functionality, UX, and infrastructure readiness.

## Tier 1 — Security & Core Auth

| Order | Issue | Rationale |
|-------|-------|-----------|
| 1 | ~~**#36** Restrict registration to invite-only~~ | ~~The app is a closed community but registration is currently open to anyone. This is the most critical gap — everything else assumes a trusted user base.~~ |
| 2 | ~~**#29** Rate limiting on auth endpoints~~ | ~~Brute force protection. Should be in place before more users are onboarded.~~ |
| 2a | ~~**#44** Email verification via 8-digit code~~ | ~~Replace auto-verify on invite accept with an 8-digit alphanumeric code sent via email. Proves email ownership before granting access.~~ |
| 3 | ~~**#19** Forgot/reset password flow~~ | ~~Core auth flow. Without it, locked-out users have no recovery path. Blocks real usage.~~ |

## Tier 2 — Admin Essentials

| Order | Issue | Rationale |
|-------|-------|-----------|
| 4 | ~~**#22** Ban/unban users~~ | ~~Schema columns already exist. Admins need this to moderate once invite-only registration brings in real users.~~ |
| 5 | ~~**#21** Invite revocation~~ | ~~Now that invites are the only entry point (#36), admins need to cancel mistaken ones.~~ |
| 6 | ~~**#24** Confirmation dialogs~~ | ~~Protects the destructive actions just added (ban, revoke, role change). Low effort, high safety value.~~ |
| 7 | ~~**#32** Audit logging~~ | ~~With ban/revoke/role-change all live, an audit trail becomes important for accountability.~~ |
| 7a | **#45** Email change requires re-verification | Users who change their email must re-verify via the existing 8-digit code flow. Depends on #44. |

## Tier 3 — Scalability & Data Management

| Order | Issue | Rationale |
|-------|-------|-----------|
| 8 | **#23** Pagination | Foundation for scaling. Current hardcoded `limit: 100` won't hold. Should come before search. |
| 9 | **#26** User search and filtering | Builds on pagination. Admin productivity feature as user count grows. |
| 10 | **#28** Invite resend for expired invites | Quality-of-life for admins, pairs with revocation (#21). Small scope. |
| 11 | **#30** Session management UI | Users should see and revoke active sessions. Complements rate limiting (#29). |

## Tier 4 — UX Polish

| Order | Issue | Rationale |
|-------|-------|-----------|
| 12 | **#27** Loading skeletons | Perceived performance improvement. No dependencies, can slot in anytime. |
| 13 | **#25** Dark mode toggle | CSS custom properties already exist. Just needs a toggle + persistence. |
| 14 | **#41** React Email templates | Developer experience. Best done before adding more email templates but not user-facing urgent. |

## Tier 5 — Infrastructure (pre-launch)

| Order | Issue | Rationale |
|-------|-------|-----------|
| 15 | **#40** Encrypt sensitive fields | Important but complex (blind indexes, data migration). Better tackled once the schema is stable and all features are in. |
| 16 | **#31** Deployment configuration | Needed before go-live but not before feature work. Depends on knowing the final data persistence strategy. |
| 17 | **#33** E2E tests with Playwright | Best saved for last — features need to stabilize first or tests will churn constantly. Covers all the flows built above. |

## Dependency Chains

- ~~**#36**~~ → ~~**#21**~~ → **#28**: invite-only registration (done) makes revocation and resend meaningful
- ~~**#22**~~ + ~~**#21**~~ → ~~**#24**~~: confirmation dialogs protect the destructive actions they gate
- ~~**#22**~~ + ~~**#21**~~ → ~~**#32**~~: audit logging should capture the admin actions it tracks
- **#23 → #26**: search/filtering builds on paginated lists
- ~~**#44**~~ → **#45**: email change re-verification reuses the 8-digit code flow
- ~~**#41 before #19**~~ is nice-to-have (so the reset password email is a React Email component from the start) but not a hard blocker — #19 is now done
