# Design system

The source of truth for visual and interaction conventions in `apps/web`. **Read this before changing any `.tsx` or `.css` in the web app.** It overrides tickets and prototypes on anything visual (see `AGENTS.md` → Precedence).

**Status:** Skeleton. Rules marked **Pending** are not decided yet; they're being settled in the design-system migration (`docs/features/F09-design-system-migration/spec.md`). Until a rule is decided, don't invent one: follow the closest existing pattern, and flag the gap to the user.

**Migration approach (2026-10-15):** comprehensive system + phased migration. F09 M0 explores **broadly in prototypes** (vibe packs, font switcher, color-meaning schemes, containment, brand framing), then locks visual foundations here. Do not invent a locked look from the inventory alone. F09 M1 adds primitives, interaction/IA patterns, enforcement, and a pilot migrate. Later milestones restyle remaining surfaces in waves. New feature UI must follow what is already decided here and extend this doc when something new is needed—do not wait for full-app migration.

## Hard rules (in effect now)

1. **Explicit variants, not global defaults.** Every interactive element gets its look from a named variant class or component. Never rely on bare element styling (`button`, `input`, `a`, ...).
2. **No new global or element-level CSS.** Don't add rules targeting bare elements, and don't add classes to the global `button:not(...)` opt-out chain in `styles.css`. That chain is legacy and is being removed.
3. **Use tokens.** Colors, radii and shadows come from `:root` variables. No raw hex values or ad-hoc `box-shadow` in new code.
4. **One modal standard.** Every dialog renders inside `ModalLayer` (`apps/web/src/ModalLayer.tsx`). Don't build a backdrop, Escape handling or a discard guard yourself.
5. **Reuse before adding.** Check the component catalogue below and existing `features/*` components before creating a new visual pattern.
6. **Unknowns go to the user.** If a needed decision isn't covered here, ask, then record the answer in this file.
7. **Log styling issues in F09; don't fix them in place.** An inconsistency found while doing other work goes into the Current behavior table of `docs/features/F09-design-system-migration/spec.md`, for F09's app-wide pass. That table is a parked defect log, not a complete checklist of what the design system will cover. Fix it now only if the ticket can't work without the fix.
8. **Extend the system, don't fork it.** If a feature needs a new look or pattern, add it here (and to shared primitives when they exist) in the same change. No long-lived feature-local styling tracks.

## Principles

**Pending** (F09 M0). Theme/vibe/brand are open (Q12, Q17). Direction work is an exploratory lab in **F09 prototypes** (`/prototype/f09/…`), not under F08. Inventory findings are a problem map, not pre-chosen winners.

## Tokens

Defined in `:root` in `apps/web/src/styles.css`.

| Group | Tokens | Status |
|-------|--------|--------|
| Surfaces | `--bg`, `--bg-gradient-end`, `--surface`, `--surface-2`, `--overlay` | Existing |
| Borders | `--border`, `--border-strong` | Existing |
| Text | `--text`, `--text-muted`, `--text-subtle`, `--on-primary` | Existing |
| Accents | `--accent-{pink,blue,purple,mint,yellow}` and `-deep` versions | Existing; which accent is primary is **Pending** (M0) |
| Danger | `--danger`, `--danger-deep` | Existing |
| Radius | `--radius-card`, `--radius-soft` (pill), `--radius-soft-box` | Existing |
| Elevation | `--shadow-soft`, `--shadow-button`, `--shadow-minimal` | Existing; shadow policy is **Pending** (M0) |
| Type | `--font-sans` (DM Sans), `--font-mono` (JetBrains Mono) | Existing; **roles + size scale Pending** (M0, Q14). Mono vs sans is a vibe driver (titles/chrome inconsistent today). Exploring families beyond these two is planned after roles lock |
| Spacing | none | **Pending** (M0); layout shell/gaps/breakpoints also open (Q16) |
| Layout | `.shell` max-width 960px, padding 1.5rem | Existing; shell width / chrome budget **Pending** (Q16) |
| Data viz / intensity | (none as design tokens; Progress heatmaps use JS scale in `intensityScale`) | **Pending** (M0, Q13) |

## Components

Each entry will list allowed variants, sizes, and when to use them.

| Component | Current implementation | Variants / sizes | Status |
|-----------|------------------------|------------------|--------|
| Button | Global `button` default (filled blue + shadow) and `button.secondary` | **Pending** (M0 look; M1 primitive) | To be replaced with explicit variants |
| Modal | `ModalLayer` (backdrop, Escape, dirty-discard guard) | Inner anatomy (header, body, footer, button order) **Pending** (appearance M0; structure M1) | Layer is standard; anatomy unaudited |
| Tabs | `.tabs` / `.tab` / `.tab on`, plus feature-specific tabs (e.g. `.ledger-subtab`) | **Pending** | Conflicting patterns |
| Form fields | Global `input` / `textarea` / `select` rules | **Pending** | |
| Badge / chip | Several feature-specific classes | **Pending** | |
| Card | `.card` | **Pending** | |
| Banner | `EarnFlash` (transient flash); `OneTimeNotice` (one-time notice) | See Banner patterns below; **placement** Pending M1 (Q10) | Documented M5-02 |
| Heatmap / intensity | `ProgressHeatmap` + `intensityScale` | Scale / hues **Pending** (M0, Q13) | Existing; not yet a design-system scale |
| Deadline urgency | `DeadlineUrgency` (pie circles + countdown) | n/a | Existing shared component |
| Priority | `PriorityBadge` | n/a | Existing shared component |

## Patterns

Visual component looks are M0. These interaction / IA patterns are **Pending M1** (F09 Q8–Q11): long-list pagination defaults, feature shell vs in-page tabs, EarnFlash / notice placement, compact long-page tactics (Tasks first).

## Banner patterns

Two mint status banners. Pick one; don't invent a third.

| Pattern | Component | When to use | Dismissal | Persistence |
|---------|-----------|-------------|-----------|-------------|
| **Transient flash** | [`EarnFlash`](../apps/web/src/features/completion/EarnFlash.tsx) | Immediate feedback after a points-earning action (complete a task, log LC, finish a step) | Auto-hides after ~4s; × also dismisses | None — gone when the parent clears `earn` |
| **One-time notice** | [`OneTimeNotice`](../apps/web/src/features/notices/OneTimeNotice.tsx) | A result the user should see once per event (e.g. last week's met weekly goals on Home, R5.18) | × hides for the current view | Marked seen in `localStorage` under a caller-supplied key **as soon as it is shown**, so a reload or return visit stays hidden. Key must be per event (e.g. `weekly-congrats-seen:{weekStart}`) |

Visual base: mint border/background (`.earn-flash` / `.one-time-notice`). One-time notices may carry richer body content (rows, totals); the flash stays a single line plus balance. Moving the Jobs ranking banner onto `OneTimeNotice` is F09 R.6 (M2), not F08. Viewport placement for `EarnFlash` is F09 R.9 / Q10 (M1).

## Interim decisions (F08 M5, until F09 M0)

Working choices for the F08 M5 prototypes and builds, decided by the user on 2026-10-13 in the M5-06 review. They don't settle F09 Q1–Q5 or Q12; F09 may replace them. Historically shown as direction **W** on the F08 page `/prototype/f08/weekly/visual-direction`—that page is **not** the home for F09 direction work (see F09 R.13). Prefer F09 prototypes under `/prototype/f09/…` once they exist.

- **Elevation:** flat. New M5 surfaces add no shadow to buttons or cards.
- **Primary buttons** (for example Save): tinted purple, i.e. a pastel `--accent-purple` fill with `--accent-purple-deep` text and border, not filled blue.
- **Toggles and segmented controls** (for example the LC weekly/misc switch): the active option uses `--accent-blue` / `--accent-blue-deep`, matching the weekly goal bar. Not pink.
- **Pace text** (ahead, behind, on track, met) uses normal weight everywhere, never bold.

## Conflicting patterns → chosen standard

Filled in during migration M0 after a thorough production audit (not only the F09 parked-issue list). Until then, don't add another competing variant.

| Area | Competing patterns | Standard |
|------|-------------------|----------|
| | | |

## UI review checklist

Run before marking any UI ticket done:

- [ ] No new bare-element CSS; no additions to the `button:not(...)` chain
- [ ] Every button, tab and field uses a named variant
- [ ] Only tokens for color, radius and shadow
- [ ] Dialogs use `ModalLayer`
- [ ] Reused existing components where they fit (listed in the ticket)
- [ ] Compared against neighboring surfaces for size and spacing consistency
- [ ] If a new look or pattern was required, it was added to this file (not left as a feature-local one-off)
