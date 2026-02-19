# Styling Recommendations

Prioritized improvements for the Berlin Reunion UI, based on the current Tailwind v4 theme and component patterns.

## Quick Wins (low effort, high impact)

### 1. Focus Ring Consistency

Inputs use `focus:border-gold` but buttons have no visible focus indicator. This hurts keyboard accessibility.

**Add to all buttons:**
```
focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
```

**Affected files:** login, register, profile, admin, verify-email, change-password, forgot-password, reset-password pages, Header, ConfirmDialog.

### 2. Transition Smoothness

Buttons and interactive elements have no `transition` class, making hover/focus state changes feel abrupt.

**Add to all buttons, links, and selects:**
```
transition-colors
```

### 3. Card Containers

Forms on login, register, profile, and verify pages float in open space with no visual boundary. Wrapping them in a card gives them grounding.

**Suggested card class:**
```
rounded-lg border border-silver/20 bg-white/50 p-6 shadow-sm dark:bg-navy-light/50
```

**Affected pages:** `/login`, `/register`, `/profile`, `/verify-email`, `/change-password`, `/forgot-password`, `/reset-password`.

### 4. Consistent Min-Height

The landing page uses `min-h-[calc(100vh-3.5rem)]` to account for the header, but login and other auth pages use `min-h-screen` which causes content to sit slightly off-center.

**Standardize all page wrappers to:**
```
min-h-[calc(100vh-3.5rem)]
```

## Medium Effort

### 5. Mobile Header

The nav bar hides the username/avatar below `sm` breakpoint with `hidden sm:flex`, but there's no hamburger menu fallback. On mobile, users only see the logo and sign out button.

**Recommendation:** Add a hamburger toggle that reveals a dropdown with Home, Admin (if applicable), Profile link, and Sign Out.

### 6. Table Responsiveness

Admin user and invite tables use `overflow-x-auto` but still require horizontal scrolling on mobile. The tables have 9 columns which is too wide for small screens.

**Recommendation:** Below `md` breakpoint, render each row as a stacked card:
```
md:table-row → below md: flex flex-col border rounded-lg p-3 mb-2
```

### 7. Toast Notifications

Success and error messages are inline `<div>` elements within forms. They require the user to scroll to the relevant section to see feedback.

**Recommendation:** Add a lightweight toast component (fixed top-right, auto-dismiss after 5s) for success/error feedback on mutations (profile save, email change, invite sent, ban/unban).

### 8. Loading States

Every page shows plain `"Loading..."` text during session checks. Issue #27 (loading skeletons) is already tracked.

**Quick interim fix:** Replace text with a simple spinner SVG component reused across pages.

## Bigger Lifts

### 9. Landing Page Enhancement

The landing page (`/`) is a logo, title, subtitle, and sign-in button. For a reunion site, this is the first impression.

**Suggestions:**
- Hero section with a background image (Berlin, barracks, unit photo)
- Countdown timer to 2029 reunion date
- Brief description of what the site is for
- "Registration is by invitation only" note

### 10. Empty States

The hello page (`/hello`) shows user info in a simple card with two nav links. After the initial novelty, it feels bare.

**Suggestions:**
- Member count ("X veterans have joined")
- Upcoming events preview (once #58 calendar is built)
- Recent activity feed
- Quick links to member directory

### 11. Dark Mode Toggle

The CSS custom properties already support dark mode via `prefers-color-scheme`. Issue #25 is tracked for adding a manual toggle with persistence.

**Implementation:** Theme toggle in the header (sun/moon icon), store preference in `localStorage`, apply via a `dark` class on `<html>`.

## Current Theme Reference

```css
--color-navy: #2B3E6F
--color-navy-light: #364A7E
--color-navy-dark: #1F2E54
--color-gold: #F0C030
--color-gold-dark: #D4A820
--color-crimson: #CC2030
--color-field-green: #2D7A3A
--color-silver: #9BB8C8

/* Light mode */
--background: #f5f5f0
--foreground: #1a1a2e

/* Dark mode */
--background: #1a1f35
--foreground: #e8e8e0
```

## Reusable Patterns

Common class combos used across the codebase that should stay consistent:

| Element | Classes |
|---------|---------|
| Primary button | `rounded-md bg-navy px-4 py-2 text-sm font-medium text-gold hover:bg-navy-dark dark:bg-gold dark:text-navy dark:hover:bg-gold-dark` |
| Danger button | `rounded-md bg-crimson px-4 py-2 text-sm font-medium text-white hover:bg-crimson/90` |
| Text input | `rounded-md border border-silver px-3 py-2 text-sm shadow-sm focus:border-gold focus:outline-none dark:border-silver/30 dark:bg-navy-light` |
| Error alert | `rounded-md bg-crimson/10 p-3 text-sm text-crimson dark:bg-crimson/20` |
| Success alert | `rounded-md bg-field-green/10 p-3 text-sm text-field-green dark:bg-field-green/20` |
| Section border | `border-b border-silver/30 dark:border-silver/20` |
