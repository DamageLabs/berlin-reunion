# Implementation Plan

Prioritized roadmap of open enhancement issues. All original MVP and post-MVP work is complete (see `MVP-Roadmap.md`).

## Completed Work

All original issues (#19–#61) are closed. Key completed features:

- Invite-only registration (#36)
- Rate limiting (#29)
- Email verification via 8-digit code (#44)
- Forgot/reset password (#19)
- Ban/unban users (#22)
- Invite revocation (#21)
- Confirmation dialogs (#24)
- Audit logging (#32)
- Email change re-verification (#45)
- Admin password reset (#54)
- Login attempt logging (#55)
- Manual email verification (#56)
- User deletion (#57)
- Field encryption (#40)
- Deployment configuration (#31)
- Calendar with recurring events (#58)
- Home dashboard improvements (#59)
- Profile completion prompt (#60)
- Event visibility — public/private
- Styled delete confirmation modal (#80)
- Member directory with search
- Terms of Service page (#88)
- Custom 404 not-found page (#89)
- Error boundary for client/server errors (#90)
- Site footer with links (#91)
- Account lockout after failed login attempts (#99)
- Notification toasts for user actions (#101)
- Account self-deletion for users (#110)
- Calendar export — iCal/ICS download (#111)
- Focus trap in modal dialogs (#114)
- Global search / command palette (#117)
- Sticky header on scroll (#118)
- Privacy policy page (#87)

---

## Pre-existing Issues

| Issue | Title | Status |
|-------|-------|--------|
| ~~**#23**~~ | ~~Pagination~~ | ~~Closed — implemented for admin users, invites, audit logs, members~~ |
| ~~**#25**~~ | ~~Dark mode toggle~~ | ~~Closed~~ |
| ~~**#26**~~ | ~~User search and filtering~~ | ~~Closed — admin + member directory~~ |
| ~~**#27**~~ | ~~Loading skeletons~~ | ~~Closed~~ |
| ~~**#28**~~ | ~~Invite resend for expired invites~~ | ~~Closed~~ |
| ~~**#30**~~ | ~~Session management UI~~ | ~~Closed — page at /sessions~~ |
| ~~**#33**~~ | ~~E2E tests with Playwright~~ | ~~Closed~~ |
| ~~**#41**~~ | ~~React Email templates~~ | ~~Closed~~ |
| ~~**#61**~~ | ~~Card treatment for hello page~~ | ~~Closed~~ |
| **#82** | Google Maps integration for user locations | Open |
| **#83** | Automated database backups (JSON export/restore) | Open |
| **#84** | User surveys (admin/moderator created) | Open |
| **#85** | Phone number on user profile (admin/moderator only) | Open |
| ~~**#86**~~ | ~~502nd Infantry Regiment crest as favicon~~ | ~~Closed — shipped in PR #148~~ |
| ~~**#88**~~ | ~~Terms of Service page~~ | ~~Closed~~ |
| ~~**#87**~~ | ~~Privacy policy page~~ | ~~Closed~~ |

---

## Tier 1 — Critical (Legal, Security, Core UX)

These should be addressed before public launch.

| Issue | Title | Category |
|-------|-------|----------|
| ~~**#87**~~ | ~~Privacy policy page~~ | ~~Legal — Closed~~ |
| ~~**#88**~~ | ~~Terms of Service page~~ | ~~Legal — Closed~~ |
| ~~**#89**~~ | ~~Custom 404 not-found page~~ | ~~UX — Closed~~ |
| ~~**#90**~~ | ~~Error boundary for client/server errors~~ | ~~Reliability — Closed~~ |
| ~~**#91**~~ | ~~Site footer with links~~ | ~~UX — Closed~~ |
| **#92** | Mobile hamburger menu for header | UX |
| **#93** | Content Security Policy headers | Security |
| **#94** | Unsubscribe links in emails | Legal/Email |
| **#95** | Health check API endpoint | Infrastructure |
| **#96** | ARIA live regions for success/error messages | Accessibility |
| **#97** | Skip to main content link | Accessibility |

---

## Tier 2 — High Priority (Security Hardening, Reliability, Significant UX)

| Issue | Title | Category |
|-------|-------|----------|
| **#98** | Two-factor authentication for admin accounts | Security |
| ~~**#99**~~ | ~~Account lockout after failed login attempts~~ | ~~Security — Closed~~ |
| **#100** | Event RSVP and attendance tracking | Feature |
| ~~**#101**~~ | ~~Notification toasts for user actions~~ | ~~UX — Closed~~ |
| **#102** | Client-side form validation | UX |
| **#103** | Environment variable validation at startup | Reliability |
| **#104** | Structured logging | Infrastructure |
| **#105** | Email bounce/spam webhook handling (Resend) | Email |
| **#106** | Welcome email after registration | Email |
| **#108** | Search and filter in audit log viewer | Admin |
| ~~**#110**~~ | ~~Account self-deletion for users~~ | ~~Privacy — Closed~~ |
| **#112** | Automated ban expiry | Admin |
| ~~**#114**~~ | ~~Focus trap in modal dialogs~~ | ~~Accessibility — Closed~~ |
| **#116** | Background job system for scheduled tasks | Infrastructure |

---

## Tier 3 — Medium Priority (Feature Enhancements, Email Workflows)

| Issue | Title | Category |
|-------|-------|----------|
| **#83** | Automated database backups | Infrastructure |
| **#107** | Event reminder emails | Email |
| **#109** | Event categories and tags | Calendar |
| ~~**#111**~~ | ~~Calendar export (iCal/ICS)~~ | ~~Calendar — Closed~~ |
| **#113** | User timezone support | UX |
| **#115** | Breadcrumb navigation on detail pages | UX |
| ~~**#117**~~ | ~~Global search~~ | ~~Feature — Closed~~ |
| ~~**#118**~~ | ~~Sticky header on scroll~~ | ~~UX — Closed~~ |
| **#120** | Audit log CSV export | Admin |
| **#122** | User activity dashboard for admins | Admin |
| **#124** | Email notification on role change | Email |
| **#126** | Email on login from unfamiliar device | Email/Security |
| **#128** | Email retry queue with backoff | Email |
| **#130** | Email notification when user is banned | Email |
| **#132** | Event cancellation with soft-delete | Calendar |
| **#134** | Optimistic UI updates | UX |
| **#136** | WCAG AA color contrast audit | Accessibility |
| **#139** | Profile photo optimization on upload | Performance |
| **#141** | Username validation rules | Security |
| **#143** | Performance monitoring (Sentry/OpenTelemetry) | Infrastructure |
| **#145** | Request body size limits | Security |

---

## Tier 4 — Nice to Have (Polish, Documentation, Testing)

| Issue | Title | Category |
|-------|-------|----------|
| **#82** | Google Maps integration for locations | Feature |
| **#84** | User surveys | Feature |
| **#85** | Phone number on profile | Feature |
| ~~**#86**~~ | ~~502nd crest as favicon~~ | ~~Branding — Closed~~ |
| **#119** | Bio/about field on profiles | Profile |
| **#121** | Social links on profiles | Profile |
| **#123** | Event comments and discussion | Community |
| **#125** | Batch admin operations | Admin |
| **#127** | Invite analytics | Admin |
| **#129** | Admin impersonation UI | Admin |
| **#131** | Idle session timeout | Security |
| **#133** | Accessible date/time pickers | Accessibility |
| **#135** | Cookie consent banner | Legal |
| **#137** | README with local dev setup | Documentation |
| **#138** | API reference documentation | Documentation |
| **#140** | Architecture overview documentation | Documentation |
| **#142** | Encryption and security guide | Documentation |
| **#144** | Test coverage reporting | Testing |
| **#146** | E2E tests for calendar flows | Testing |
| **#147** | Automated accessibility tests | Testing |

---

## Suggested Implementation Order

### Pre-Launch Sprint
1. ~~**#87 + #88** — Privacy policy + Terms of Service — Closed~~
2. ~~**#89 + #90** — 404 page + error boundary — Closed~~
3. ~~**#91**~~ + **#92** — Footer (closed) + mobile hamburger menu (open)
4. **#93** — Content Security Policy headers
5. ~~**#86** — Favicon (branding, shipped in PR #148)~~
6. **#95** — Health check endpoint
7. **#94** — Email unsubscribe links
8. **#96 + #97** — Accessibility basics (ARIA + skip link)

### Post-Launch Priority
9. ~~**#101**~~ + **#102** — Toast notifications (closed) + form validation (open)
10. **#103** — Env var validation (prevents misconfiguration)
11. **#100** — Event RSVP (community engagement)
12. **#98** + ~~**#99**~~ — 2FA (open) + account lockout (closed)
13. ~~**#114** — Focus trap in modals — Closed~~
14. **#83** — Automated backups (data safety)

### Ongoing
- Documentation (#137, #138, #140, #142)
- Testing (#33, #144, #146, #147)
- Email enhancements (#105, #106, #107, #124, #126, #128, #130)
- UX polish (#113, #115, #134)

## Dependency Chains

- **#116** (background jobs) → **#83** (automated backups), **#112** (ban expiry), **#107** (reminder emails)
- ~~**#101** (toasts)~~ → **#102** (form validation) benefits from toast feedback — toasts done
- **#104** (structured logging) → **#143** (performance monitoring) builds on logging
- **#93** (CSP headers) should precede public launch
- ~~**#87 + #88** (legal pages)~~ → **#135** (cookie consent) extends legal compliance — legal pages done
