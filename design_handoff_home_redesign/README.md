# Handoff: Wellfire Home Page Redesign + Logo Refresh

## Overview
Redesign of the Wellfire `DashboardPage` (`/`) so it is **today-first** but also previews
the rest of the week at a glance. Ships alongside a refined **monoline flame logo** and a
new **Fraunces serif wordmark**. Replaces the existing layout of "intention bar →
weekly goals → Schedule (left) + Today's To-Do (right) → Week preview".

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing
intended look and behavior, not production code to copy directly. The task is to
**recreate these designs in the existing Wellfire React + TypeScript + Tailwind codebase**,
using the established patterns, components, `DataContext`, and hooks already in place
(`useData`, `useLocalStorage`, `toISODate`, etc).

## Fidelity
**High-fidelity.** Colors, type scale, spacing, and component structures are final.
Hex values and Tailwind classes in the mock match the existing codebase's stone/amber
palette. Re-use the existing component primitives where possible (`Section`,
`IntentionBlock`, `TodoList`, `WeekPreview`, `Goals`, `Schedule`) — this redesign
rearranges them and adds three new pieces: a **Today Hero**, a **Mini Timeline**, and
a **Day Card** for the week ribbon.

---

## Screens / Views

### Dashboard (home) — `pages/DashboardPage.tsx`

**Layout (default variant = Focus, see `Home Redesign.html`, `layout: "focus"`):**

```
┌─ Header (existing) ───────────────────────────────────────┐
├─ Design-notes banner (dev only; remove in prod) ─────────┤
├─ TODAY HERO (12-col grid) ────────────────────────────────┤
│  col-span-7: date stamp + intention + "Up next" + top 4  │
│              tasks                                        │
│  col-span-5: MiniTimeline (vertical schedule, 08:00–19:00)│
├─ WEEK RIBBON (6 equal columns, gap-3) ────────────────────┤
│  One DayCard per upcoming day (Fri–Wed)                   │
├─ GOALS + INBOX (12-col grid) ─────────────────────────────┤
│  col-span-8: This week's goals with ring progress         │
│  col-span-4: Inbox (unsorted, drag-to-day)                │
└───────────────────────────────────────────────────────────┘
```

Container: `max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6`.

**Drop** the existing intention bar and the two-column Schedule/To-Do row — they're
absorbed into the hero. Keep the `Header`, `Sidebar`, and `CheckIn` drawer intact.

---

### Today Hero (new component)

A prominent rounded card that aggregates the four most important pieces of today's info.

- Container: `rounded-3xl border border-stone-200/50 dark:border-stone-800/40 bg-gradient-to-br from-amber-50/80 via-white to-white dark:from-amber-500/[0.06] dark:via-stone-900/40 dark:to-stone-900/10 p-8 relative overflow-hidden`.
- Decorative background: monoline flame glyph, 320×320, absolutely positioned `-right-10 -top-10`, `opacity-20 dark:opacity-15`, `pointer-events-none`, color `text-amber-500`.
- Inner `grid grid-cols-12 gap-8`.

**Left column (`col-span-7`, `flex flex-col gap-6`)**:
1. **Date stamp** — `text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400` (e.g. "Thursday · April 16") + secondary week number `text-[11px] text-stone-400`.
2. **Intention block** — re-use/evolve existing `IntentionBlock`. Bigger type: `text-2xl font-serif italic` (Fraunces/Instrument Serif) with a large open quote `“` in Cormorant Garamond, `text-amber-400/70`. Wire to `wf-intention` localStorage key as today.
3. **Up next card** — compact pill (`w-fit`, `rounded-2xl border border-amber-500/30`, `bg-white/70 dark:bg-stone-900/40`, `px-4 py-3`, `flex items-center gap-4`). Clock icon in amber square, label "Up next · in N min", block title, time range. Computed from `blocks` where `toMin(block.endTime) > nowMinutes`; pick the first.
4. **Today's focus list** — top 4 tasks from `tasks.filter(t => t.date === todayISO)`, each row: checkbox (`w-5 h-5 rounded-md`, amber-500 filled when done), task text, optional goal tag (`text-[10px] rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20`). Link tasks to goals via a new optional `goalId?: string` field on `Task` (see **Type changes** below). Header row shows "{pending} to go · {done} done" + "See all (N)" link.

**Right column (`col-span-5`)**: `<MiniTimeline>` (see below).

---

### MiniTimeline (new component, `components/MiniTimeline.tsx`)

Vertical compact schedule for the hero, rendering today's `blocks`.

- Window: 08:00–19:00 (configurable).
- Container: `rounded-2xl border border-stone-200/50 dark:border-stone-800/40 bg-white/50 dark:bg-stone-900/40 p-4`, fixed height `360px + 32`.
- Hour ticks at 9/11/13/15/17/19, each: 9px monospace tabular-nums label in a 40px right-aligned gutter, dashed horizontal line `border-dashed border-stone-200/60 dark:border-stone-800/40`.
- Blocks absolutely positioned, `rounded-lg border px-2.5 py-1`, colored by `block.color` using the existing `BLOCK_COLORS` palette from `Schedule.tsx`. Title: `text-xs font-semibold truncate`. Time range: `text-[10px] tabular-nums`.
- "Now" indicator: 2px amber dot (`bg-amber-500`), horizontal line `bg-amber-500/70`, with `NOW` label. Dot pulses via `@keyframes pulse-soft` (3s ease-in-out, opacity 0.55↔0.85).
- Props: `{ blocks: TimeBlock[], now: number /* minutes */ }`.

---

### Week Ribbon (new — uses new `DayCard`)

Replaces the existing `WeekPreview` on the home page. Keep `WeekPreview` as a separate
primitive; export a new denser `DayCard` for home.

- Header row above grid: eyebrow ("The week ahead"), subtitle ("Next 6 days · plan a little in advance"), right-aligned "Open weekly view →" link that `navigate('/weekly')`.
- Grid: `grid grid-cols-6 gap-3`. Days = `getNextDays(6)` starting tomorrow.
- `DayCard` container: `rounded-xl border px-3 py-2.5 flex flex-col gap-2`. Default border `border-stone-200/50 dark:border-stone-800/30 bg-white/60 dark:bg-stone-900/20`. First card (tomorrow) uses amber accent: `border-amber-400/50 bg-amber-50/60 dark:bg-amber-500/[0.06]`.
- Day card content:
  - Header: day abbrev (uppercase `text-[10px] tracking-widest` — amber for weekends), day number.
  - Up to 3 events: time (7-char fixed-width), title truncated, `text-[11px] leading-tight`.
  - `+N events` overflow row.
  - Task dots footer: up to 2 task previews with an amber 4px dot, `+N` overflow. Border-top divider `border-stone-200/40 dark:border-stone-800/30`.
- Clicking a card navigates to `/weekly?date={iso}`. Cards are drop targets for inbox tasks (wire to existing `onDropTask` pattern in `WeekPreview.tsx`).

---

### Goals + Inbox row

- Goals card (`col-span-8`): header with overall progress ring (56px, amber-orange gradient stroke) and large `{pct}%` display. Body: `grid grid-cols-2 gap-x-6 gap-y-3`; each goal row has a small 32px ring + title + `{pct}%`. Re-use the existing `Goals` data shape — add a `progress?: number` field (0..1) to `Goal` (see **Type changes**).
- Inbox card (`col-span-4`): eyebrow + "N unsorted" count, list of inbox tasks in dashed-border rows with a drag handle glyph (`⋮⋮`), footer "+ Capture a thought" input. Re-use existing `Inbox.tsx`.

---

## Logo & Wordmark

The old amber→red gradient filled flame is replaced with a **monoline open-stroke flame**.
See `Logo Explorations.html` → variant **C · Monoline**.

### Flame icon

```tsx
// components/Flame.tsx
export default function Flame({ size = 24, stroke }: { size?: number; stroke?: string }) {
  const color = stroke ?? "currentColor";
  const w = Math.max(1.8, size * 0.09);
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
      <path d="M32 10 C32 10, 20 22, 20 36 C20 46, 25 54, 32 54 C39 54, 44 46, 44 36 C44 29, 40 25, 40 25"
        stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 10 C34 22, 40 28, 37 34 C35 37, 32 38, 32 38"
        stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

Default rendering color: `text-amber-500` (stroke inherits `currentColor`). The monoline
stroke adapts to any theme color — use `text-amber-500` in chrome, but it can also be
used in stone for subtle micro-marks.

Replace every `<svg>` that references `url(#flame2)`, `url(#flame-sidebar)`, or the old
filled gradient path with `<Flame />`:

- `components/Header.tsx` — replace inline SVG with `<Flame size={24} />` (was 24×24 with gradient fill).
- `components/Sidebar.tsx` — replace inline SVG with `<Flame size={22} />`.
- `public/favicon.svg` — replace with an export of the monoline flame (bake `stroke="#f59e0b"` for static SVG).

### Wordmark

Replace the current `text-base font-semibold tracking-tight` wordmark in `Header.tsx` with
a new serif treatment combining two Google fonts:

```tsx
// components/Wordmark.tsx
export default function Wordmark({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={className} style={{
      fontFamily: "Fraunces, Georgia, serif",
      fontWeight: 600,
      fontSize: size,
      letterSpacing: "-0.01em",
    }}>
      Well
      <span style={{ fontFamily: "Instrument Serif, Georgia, serif", fontStyle: "italic", fontWeight: 500 }}>
        fire
      </span>
    </span>
  );
}
```

Add Google Fonts to `index.html` (preconnect + stylesheet):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Instrument+Serif:ital@0;1&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=swap" rel="stylesheet">
```

Cormorant Garamond is used for the large `“` quotation mark in the intention block.

---

## Interactions & Behavior

- **Task checkbox toggles** — wire to existing `toggleTask(id)` from `DataContext`.
- **Inbox drag-to-day** — existing pattern: `e.dataTransfer.setData("text/plain", task.id)` on drag start from Inbox, accept on DayCard with `updateTask(taskId, { date: iso })`.
- **Day card click** — `navigate('/weekly?date=' + iso)`.
- **Up-next recalculates** — derive from `new Date()`; refresh every 60s (reuse the `setInterval` pattern in `Schedule.tsx`).
- **Now indicator** — pulses (`animation: pulse-soft 3s ease-in-out infinite`).
- **Goal ring** — animate `stroke-dashoffset` with `transition: stroke-dashoffset 0.8s`.
- **Intention edit** — click saved intention to re-edit; Enter to save.

No new routes; this is all within `DashboardPage`.

---

## State Management

All state is already in `DataContext` and `useLocalStorage`. No new contexts needed.

Derived values (put at top of `DashboardPage`):
```ts
const todayISO = toISODate(new Date());
const now = new Date();
const nowMin = now.getHours() * 60 + now.getMinutes();
const todayBlocks = blocks.filter(b => b.date === todayISO).sort((a,b) => a.startTime.localeCompare(b.startTime));
const todayTasks = tasks.filter(t => t.date === todayISO);
const pendingToday = todayTasks.filter(t => !t.done);
const nextBlock = todayBlocks.find(b => toMin(b.endTime) > nowMin);
const inboxTasks = tasks.filter(t => !t.date);
```

---

## Type Changes

Minor additions to `src/types.ts`:

```ts
export interface Task {
  // ...existing fields
  goalId?: string;   // NEW — optional link to a Goal
}

export interface Goal {
  // ...existing fields
  progress?: number; // NEW — 0..1. If absent, compute from linked tasks done/total.
}
```

If you'd rather not persist `progress`, compute it on the fly:
`progress = tasksLinkedToGoal.filter(t => t.done).length / tasksLinkedToGoal.length`.

Update the Supabase schema (`lib/database.types.ts`) to add the nullable columns.

---

## Design Tokens

Everything below is already in the codebase's Tailwind config (stone + amber) — these
are just the exact values used:

**Colors**
- Background: `#faf7f2` (light), `#0f0e0c` (dark)
- Border subtle: `stone-200/50` (light), `stone-800/30` (dark)
- Card surface: `bg-white/60` (light), `bg-stone-900/25` (dark)
- Accent: `amber-500` (#f59e0b) primary; amber-400, amber-600 for interactive states
- Flame gradient (progress rings only): `#f59e0b → #ef4444` (90deg)
- Text primary: `stone-800` / `stone-100`
- Text secondary: `stone-500` / `stone-400`
- Text muted: `stone-400` / `stone-600`

**Typography**
- UI sans: existing `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Wordmark: `Fraunces` 600 with `Instrument Serif` italic 500 for "fire"
- Intention body: `Fraunces` 500 italic OR `Instrument Serif` italic, `text-2xl`
- Quotation mark: `Cormorant Garamond` 500
- Monospace (time labels): default mono via `font-mono tabular-nums`, `text-[9px]` to `text-[10px]`
- Eyebrow labels: `text-[10px] font-semibold uppercase tracking-widest` (or `tracking-[0.2em]` for Today's date)

**Spacing**
- Section vertical rhythm: `gap-6` inside main, `gap-4/5` within sections
- Hero padding: `p-8`
- Card padding: `p-5`
- DayCard padding: `px-3 py-2.5`

**Radius**
- Hero/big cards: `rounded-3xl`
- Standard cards: `rounded-2xl`
- Inline pills / DayCard: `rounded-xl`
- Task checkbox: `rounded-md`

**Animation**
```css
@keyframes pulse-soft { 0%,100% { opacity: .55 } 50% { opacity: .85 } }
.pulse-soft { animation: pulse-soft 3s ease-in-out infinite; }
```

---

## Variants (optional)

The mock includes two additional layout variants (`timeline`, `agenda`) wired behind a
Tweaks panel. **Ship only `focus`**; the others are for future exploration.

---

## Assets

- No raster images.
- Flame SVG provided inline (see `components/Flame.tsx` above).
- Google Fonts: Fraunces, Instrument Serif, Cormorant Garamond.

---

## Files in this bundle

- `Home Redesign.html` — full interactive prototype of the home page. Toggle Tweaks
  to switch variants; the `focus` variant is the one to ship.
- `Logo Explorations.html` — six logo directions on a canvas. Variant **C · Monoline**
  was selected and is what's reflected in the Home Redesign.

---

## Acceptance Checklist

- [ ] New `Flame` and `Wordmark` components in place; `Header`, `Sidebar`, and `favicon.svg` updated.
- [ ] Google Fonts loaded.
- [ ] `DashboardPage` uses the new Hero + WeekRibbon + Goals/Inbox layout.
- [ ] MiniTimeline renders blocks correctly for today, including "now" indicator that refreshes.
- [ ] DayCard links to `/weekly?date=…` and accepts inbox task drops.
- [ ] Goal rings animate on mount.
- [ ] Existing `IntentionBlock`, `TodoList`, `Inbox`, `Goals`, `Schedule` components are not regressed.
- [ ] Dark + light themes verified.
