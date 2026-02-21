# Styling Guide

Design system and patterns for the Berlin Reunion UI. Built with Tailwind CSS v4.

## Color Palette

The app uses a dark-first design with a charcoal background and cream text, accented with military-inspired gold.

```css
/* Primary */
--color-charcoal: #1A1A1A      /* Body background */
--color-charcoal-light: #252525 /* Card/surface backgrounds */
--color-cream: #F5F0E1          /* Primary text */
--color-gold: #C8A84E           /* Primary accent, headings */
--color-gold-light: #E8D48B     /* Hover/highlight states */
--color-gold-dark: #8B6914      /* Borders, muted accents */

/* Secondary (used sparingly) */
--color-navy: #2B3E6F
--color-navy-light: #364A7E
--color-navy-dark: #1F2E54
--color-crimson: #CC2030        /* Danger/destructive actions */
--color-field-green: #2D7A3A    /* Success states */
--color-silver: #9BB8C8         /* Muted/disabled text */
```

Body defaults: `background: #1A1A1A; color: #F5F0E1;`

## Typography

- **Headings**: `font-[family-name:var(--font-oswald)]` — uppercase, tracked wider
- **Body text**: `font-[family-name:var(--font-geist-sans)]` (Tailwind default sans)
- **Mono**: `font-[family-name:var(--font-geist-mono)]`

Common heading pattern:
```
font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-gold
```

## Component Patterns

### Buttons

**Primary button:**
```
rounded-md border border-gold-dark/40 bg-charcoal-light px-4 py-1.5
font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider
text-gold hover:border-gold/60 hover:bg-gold-dark/20
```

**Danger button:**
```
rounded-md border border-red-900/40 bg-red-950/20 px-4 py-1.5
font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider
text-red-400 hover:border-red-700/60 hover:bg-red-950/40
```

**Ghost/secondary button:**
```
rounded-md border border-gold-dark/30 px-4 py-1.5
font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider
text-cream/60 hover:text-cream/80
```

### Form Inputs

```
w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2
text-sm text-cream placeholder:text-cream/30
focus:border-gold/60 focus:outline-none
```

### Cards / Panels

```
rounded-lg border border-gold-dark/30 bg-charcoal-light p-6 shadow-xl
```

Or lighter surface:
```
rounded-lg border border-gold-dark/20 bg-gold-dark/5 p-4
```

### Modals

```
/* Overlay */
fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4

/* Modal body */
w-full max-w-md rounded-lg border border-gold-dark/30 bg-charcoal p-6 shadow-xl
```

### Navigation Links (Header)

```
rounded-md px-3 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium
uppercase tracking-wider transition-colors

/* Active */
bg-gold-dark/20 text-gold

/* Inactive */
text-cream/60 hover:text-gold hover:bg-gold-dark/10
```

### Status Badges

```
/* Private event badge */
rounded-full bg-red-950/30 px-2 py-0.5 text-xs text-red-400

/* Role badge */
rounded-full bg-gold-dark/20 px-2 py-0.5 text-xs text-gold
```

### Loading / Skeleton

```
animate-pulse rounded bg-gold-dark/10
```

Custom skeleton animation defined in globals.css:
```css
--animate-skeleton: skeleton 1.8s ease-in-out infinite;
@keyframes skeleton { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
```

### Alerts

**Error:**
```
rounded-md bg-red-950/20 border border-red-900/30 p-3 text-sm text-red-400
```

**Success:**
```
rounded-md bg-field-green/10 p-3 text-sm text-field-green
```

## Text Opacity Conventions

- Primary text: `text-cream` (full opacity)
- Secondary text: `text-cream/70`
- Muted/placeholder text: `text-cream/40` or `text-cream/30`
- Disabled: `opacity-50`

## Border Conventions

- Standard border: `border-gold-dark/30`
- Hover border: `border-gold/60`
- Divider/separator: `border-gold-dark/20`

## Layout

- Max content width: `max-w-5xl mx-auto px-4`
- Header height: `h-14`
- Page padding: `py-8`

## Known Improvement Areas

Tracked as open GitHub issues:

| Area | Issue |
|------|-------|
| Mobile hamburger menu | #92 |
| Sticky header | #118 |
| Toast notifications | #101 |
| Focus rings on buttons | #96, #114 |
| Color contrast audit | #136 |
| Accessible date pickers | #133 |
| Loading skeletons | #27 |
