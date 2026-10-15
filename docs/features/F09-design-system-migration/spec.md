# Spec: Design system migration (F09)

**ID:** F09
**Status:** Active
**Last updated:** 2026-10-15

## Problem

The app looks less visually consistent with each feature. Recurring issues: blue buttons, drop shadows, and inconsistent button sizes. New elements inherit global CSS defaults instead of using deliberate choices, and the codebase contains several conflicting styling approaches. Recent flat surfaces also sit uneasily next to the original raised "Sakura Terminal" look, so the app no longer has one clear vibe.

## Goals

- One **comprehensive** visual standard: principles, tokens, primitives, and patterns documented in `docs/design-system.md` and enforced through explicit component variants.
- New features follow it by default, without the user having to remind the agent. When a future feature needs a new UI pattern, it extends the design system in the same change rather than inventing a parallel style.
- **Success definition:** comprehensive system + phased migration. Foundations and primitives are thorough and authoritative for all new work; existing screens migrate in reviewable waves, not as a single big-bang restyle.
- Visual direction and foundations are **broader than the parked issue list** in this spec or any prior prototype. The Current behavior table is a growing log of defects noticed in the moment; it is not the inventory of what M0 must cover.

## Milestones

| Milestone | Scope | Status |
|-----------|-------|--------|
| M0 | Purely visual. Lock theme/vibe and visual foundations (tokens, accent roles, elevation, type/spacing scales, component looks including data viz such as heatmaps). Inventory production UI thoroughly. Explore direction in **F09-owned** prototypes (not F08). Record decisions in `docs/design-system.md` | Design |
| M1 | Build primitives; remove the global inheritance trap; document interaction/IA patterns (lists, feature shell, banner placement, compact long pages); enforce mechanically; pilot-migrate a small set of surfaces | Not started |
| M2 | Wave migration of core surfaces (Tasks compaction first; then Jobs / Applications / Interviews, including R.6); list pagination defaults as implemented convention | Not started |
| M3 | Remaining pages; CSS organization if still needed; retire dead opt-out and obsolete prototype styles; feature close-out | Not started |

F08 M7 and M8 are Done (2026-10-15), so the earlier gate that M0 wait on those layouts is cleared. Prefer M1 before F11 habit UI so new screens land on the system.

## Requirements

### Cross-cutting

- **R.1** (Established) Use explicit component variants and reusable conventions, not global CSS defaults that every new element inherits.
- **R.2** (Established) Where the codebase has conflicting approaches, settle on one and make it the source of truth in `docs/design-system.md`.
- **R.3** (Established) Discuss and agree on the visual direction and component rules before any broad migration.
- **R.4** (Established) Modals follow one common standard.
- **R.5** (Established) The design-system reference must be something agents consult proactively. It is referenced from `AGENTS.md` and auto-attached for web UI files via `.cursor/rules/design-system.mdc`.
- **R.6** (Established 2026-10-13) Banners behave consistently across the app. F08 M5-02 introduces the "one-time notice" (shown once, × closes it early, marked seen per item in `localStorage`) and documents it in `docs/design-system.md` next to the transient flash (`EarnFlash`). F09 then moves the Jobs ranking banner onto the one-time notice: it has no reason to be more persistent than the weekly congrats banner. Scheduled in M2, not done in F08.
- **R.7** (Proposed 2026-10-14; from F08 M8) **Long lists are paginated by default.** Infinite or very long unpaginated result lists should not be the default pattern. Page size and controls belong in the design system (or a documented list convention). F08 M8 Past work uses a **calendar-driven 7-day window** instead of classic page controls (F08 R8.4); F09 still owns the general rule for other lists. **Settled in M1** (pattern ticket), not M0.
- **R.8** (Proposed 2026-10-14; from F08 M8) **Feature shell / subnav convention.** Nested feature routes with a shared shell and subnav (Rewards; Progress after F08 M8) vs peer in-page tabs should be one documented app pattern. May belong in the design system or in a small app-shell / IA note if it is not "visual design." **Settled in M1** (pattern ticket), not M0.
- **R.9** (Established 2026-10-15) **`EarnFlash` must appear in the user's current viewport**, near the control they used (or otherwise where they are looking), not only at the top of a long page they have scrolled away from. Placement belongs in the banner / flash pattern in `docs/design-system.md` once settled (Q10). **Settled in M1**, not M0.
- **R.10** (Established 2026-10-15) **Long scroll-heavy pages should be made more compact** where the user must scroll to reach common actions. Priority surface: the **Tasks** page. Compaction tactics (density, collapsible sections, sticky actions, etc.) are open (Q11); the design system should document the chosen approach so other lists can follow it. **Tactics in M1; Tasks migration in M2.**
- **R.11** (Established 2026-10-15) **Comprehensive system, phased migration.** M0–M1 make the design system authoritative for all new UI. Existing screens migrate in later milestones by surface. Do not block new features on a full-app restyle.
- **R.12** (Established 2026-10-15) **M0 inventory and foundations are thorough**, not limited to the Current behavior table or to issues already explored in F08 prototypes. Parked rows are seeds and reminders; the audit must cover production UI systematically (including niche surfaces such as heatmap color scales).
- **R.13** (Established 2026-10-15) **Visual direction prototypes live under F09** (`apps/web/src/prototype/f09-design-system/…`, routes under `/prototype/f09/…`). Do not treat `/prototype/f08/weekly/visual-direction` as the home for F09 direction work; that page belongs to F08 and will be deleted with F08 prototype cleanup. F08 material may be copied or referenced as historical input only.
- **R.14** (Established 2026-10-15) **M0 is purely visual.** Theme/vibe, palette roles, elevation, type, spacing, component appearance, and data-visualization color (e.g. heatmaps). Interaction and IA patterns (Q8–Q11 / R.7–R.10 tactics) are M1 pattern tickets.
- **R.15** (Established 2026-10-15) **Future features feed the system.** A ticket that needs a look or pattern the design system lacks either reuses an existing entry or adds the new standard to `docs/design-system.md` (and primitives if needed) in the same change. No long-lived feature-local styling tracks.

### M0

- **R0.1** (Established 2026-10-15) Start visual direction from **theme and vibe** (what the app is trying to communicate), then derive accent roles, elevation, and component looks. Do not treat F08 directions W/A/B/C as the full option set; explore further, including whether raised Sakura Terminal and recent clean/flat can coexist or one must win.
- **R0.2** (Established 2026-10-15) After the direction lock, record principles, tokens (including roles), and the visual component catalogue in `docs/design-system.md` so an agent can implement new UI without inventing styles.
- **R0.3** (Established 2026-10-15) Data-visualization color (heatmap intensity scales and similar gradients) is part of visual foundations, with named tokens or a documented scale—not ad-hoc per feature.

### M1

- **R1.1** (Established 2026-10-15) Build the shared primitives the system needs (at least Button and form fields, including a compact number size), remove dependence on the global filled-blue `button` default and its `:not(...)` opt-out chain, and pilot-migrate a small set of high-traffic surfaces onto those primitives.
- **R1.2** (Established 2026-10-15) Document and lock M1 patterns: list pagination defaults (R.7 / Q8), feature shell vs in-page tabs (R.8 / Q9), EarnFlash / notice placement (R.9 / Q10), compact long-page tactics (R.10 / Q11).
- **R1.3** (Established 2026-10-15) Add mechanical enforcement so variant-less controls fail `npm run check` (exact mechanism is Q6).

### M2

- **R2.1** (Established 2026-10-15) Migrate core remaining surfaces in waves, starting with Tasks (R.10), then Jobs / Applications / Interviews (including R.6).

## Current behavior (2026-10-12; amended 2026-10-15)

This table is a **parked defect log**, not a complete M0 checklist. M0 must still inventory production UI systematically (R.12).

| Behavior | Where | Status | Notes |
|----------|-------|--------|-------|
| A global `button` rule makes every button filled `--accent-blue-deep` with `--shadow-button`; buttons escape only via a `:not(...)` chain of 22 classes, repeated on hover with 21 (`.rank-batch-dismiss` is missing, so it still gets the blue hover) | `apps/web/src/styles.css` L367–375 | Conflicts R.1 | Most likely mechanism behind the blue-button and shadow complaints. Many `box-shadow: none` rules undo the default. New variants must be built on `.secondary` to escape it (checked by running, 2026-10-13) |
| Global element rules style `a`, `input`, `textarea`, `select` | `styles.css` | Conflicts R.1 | |
| `button.secondary` is the de facto second variant (about 120 uses) | across `apps/web/src` | Unspecified | Candidate starting point for explicit variants |
| `:root` tokens ("Sakura Terminal" palette): `--accent-{pink,blue,purple,mint,yellow}` + `-deep`, `--surface`, `--border`, `--text*`, `--danger*`, `--radius-*`, `--shadow-*` | `styles.css` | Unspecified | Keep or revise is Q4; vibe clash with flat surfaces is Q12 |
| `ModalLayer` provides the shared backdrop, Escape handling and dirty-discard guard; nearly every dialog renders inside it | `apps/web/src/ModalLayer.tsx` | Conforms R.4 (layer only) | Inner anatomy (header, body, footer, button order and size) unaudited; likely source of modal inconsistency |
| Each prototype milestone has its own stylesheet (`prototype-m1.css`, `-m2`, `-m4`, `-m5`, F08 topic CSS, …) | `apps/web/src/prototype/` | Conflicts R.2 | F09 direction work must not live under F08 prototypes (R.13) |
| All styles live in one ~6k-line file | `styles.css` | Unspecified | Splitting is Q7 |
| Number inputs inherit the global `input` padding and size, so a small number field such as the Progress weekly LC target (`.weekly-goal-target-field input`, width 4.5rem) looks too large next to its label | `styles.css` | Conflicts R.1 | Form-field sizes are Q3/Q5 |
| Interim button classes from F08 M5 (`docs/design-system.md` → Interim decisions), built on `.secondary`: `ui-btn`, `ui-btn-primary`, `ui-btn-ghost`, `.is-active`, `ui-segmented` | [`styles.css`](../../../apps/web/src/styles.css), [`LeetcodeLogger.tsx`](../../../apps/web/src/features/progress/LeetcodeLogger.tsx) | Unspecified | Working choice until M0; may become standard or be replaced |
| The Jobs ranking banner stays until dismissed with ×, remembering dismissals per batch in `sessionStorage` (per tab); a successful batch hides on its own after 30 minutes | [`JobsPage.tsx`](../../../apps/web/src/features/jobs/JobsPage.tsx) | Conflicts R.6 | Moves to the one-time notice in M2 |
| Completions diary and similar logs are long unpaginated day-grouped lists | [`LedgerCompletionsPanel.tsx`](../../../apps/web/src/features/progress/LedgerCompletionsPanel.tsx) | Conflicts R.7 (Proposed) | F08 M8 paginates Past work only; F09 owns the default (M1) |
| Rewards and Progress use nested routes + subnav shells; other pages vary | [`RewardsLayout.tsx`](../../../apps/web/src/features/rewards/RewardsLayout.tsx), [`ProgressLayout.tsx`](../../../apps/web/src/features/progress/ProgressLayout.tsx) | Conflicts R.8 (Proposed) | App-wide rule in M1 |
| `EarnFlash` is rendered near the top of the host page/section, not anchored to the control that earned | [`EarnFlash.tsx`](../../../apps/web/src/features/completion/EarnFlash.tsx), [`Tasks.tsx`](../../../apps/web/src/pages/Tasks.tsx), Progress week/past pages | Conflicts R.9 | Placement in M1 |
| Tasks is a long, dense scroll surface; common actions often sit below the first viewport | [`Tasks.tsx`](../../../apps/web/src/pages/Tasks.tsx) | Conflicts R.10 | Tactics M1; migrate M2 |
| Progress heatmaps color cells via a JS intensity scale (`workIntensityFill` / legend stops), not named design-system tokens | [`intensityScale`](../../../apps/web/src/features/progress/intensityScale.ts), [`ProgressHeatmap.tsx`](../../../apps/web/src/features/progress/ProgressHeatmap.tsx) | Unspecified | Example of a niche visual that M0 must cover (R0.3 / R.12); not previously parked |

## Out of scope (for now)

- Full-app visual migration in a single milestone (phased waves instead).
- Changing the palette before M0 decides whether the pastel set stays (Q4) and what vibe wins (Q12).
- Using F08 prototype routes as the lasting home for design-system direction work.

## Open questions

| # | Question | Blocks | Answer |
|---|----------|--------|--------|
| Q1 | Visual direction: what does a primary button look like if not filled blue? Which accent is primary? | M0 | (open) Preferences (2026-10-13, F08 M5-06 review): not the filled blue default. Liked tinted purple pastel (direction W) and also ink. Toggles: blue or purple, not pink. **2026-10-15:** W was preferred in that round, but M0 restarts from vibe (Q12) and explores beyond W/A/B/C |
| Q2 | Elevation: flat, or a subtle shadow? Where (cards, modals, buttons)? | M0 | (open) Undecided (2026-10-13): flat looks clean, slight elevation appeals, app mixes both. M5 interim is flat. No token for raised surfaces: `.modal` and popovers use raw `var(--shadow-strong)` shadows. Tied to Q12 |
| Q3 | Button sizes: how many (e.g. sm / md), and which contexts use each? | M0 | (open) |
| Q4 | Is the current pastel token set kept as the base, or open to revision? | M0 | (open) |
| Q5 | Which conflicting existing patterns win (needs a thorough production audit: buttons, tabs, chips, modal anatomy, form fields, cards, banners, data viz, …)? | M0 | (open) Audit is not limited to this table (R.12) |
| Q6 | How will UI rules be enforced mechanically (e.g. a lint rule against variant-less `<button>`)? A single `npm run check` command comes from maintenance ticket MT-01 and can host it. | M1 | (open) |
| Q7 | Should `styles.css` be split (per component or per feature), and when? | M1 / M3 | (open) Prefer after primitives exist |
| Q8 | Long-list pagination: default page sizes, control placement, and whether day-based windows (1 / 7) are a Progress-only idea or a reusable pattern? | M1 | (open) Deferred from M0 (2026-10-15); R.7 |
| Q9 | Nested feature shell + subnav vs in-page tabs: one app rule? Does it live in `docs/design-system.md` or a separate app-shell / IA doc? | M1 | (open) Deferred from M0 (2026-10-15); R.8. Expanded by M0-01 inventory into Q15 (depth / route vs tab vs filter / top vs side) |
| Q10 | How should `EarnFlash` stay in view: portal near the clicked control, sticky/toast in the viewport, scroll-into-view of a top flash, or something else? Does the same rule apply to `OneTimeNotice`? | M1 | (open) Deferred from M0 (2026-10-15); R.9 |
| Q11 | What makes Tasks (and similar long pages) compact enough: tighter row density, collapsible sections, sticky compose/actions, pagination/virtualization, or a redesign of the list chrome? | M1 (tactics) / M2 (Tasks migrate) | (open) Deferred from M0 (2026-10-15); R.10 |
| Q12 | **Theme / vibe:** What should the app communicate? Can raised "Sakura Terminal" and the recent clean/flat look coexist, or must one win? What does that imply for elevation, chrome, **typography**, and accent drama? | M0 | (open) Noted 2026-10-15. Typography (JetBrains Mono vs DM Sans) is as strong a vibe driver as elevation (M0-01 addendum). Start M0 here before locking Q1–Q5 |
| Q13 | Heatmap / intensity gradients: one shared scale (and which hues), separate scales per domain (apps vs technical), and how empty / future / peak cells read? | M0 | (open) Example of niche visual coverage (R0.3); invent during M0, not only when a feature happens to touch Progress |
| Q14 | **Typography:** Which roles use mono vs sans (brand, app nav, tabs, section titles, body, badges, numbers)? What size scale? Explore alternate font families in M0, or keep DM Sans + JetBrains Mono for M0 and explore families later? | M0 (roles/scale); later pass for new families | (open) From M0-01 addendum 2026-10-15. Mono inconsistently applied to titles; sans drives the clean/readable dialect |
| Q15 | **Information depth:** Max chrome rows before content; route vs tab vs filter; which features get a shell; calendar/day as a nav level; modal vs route for writes; top nav vs side nav vs hybrid? | M1 (expands Q9) | (open) From M0-01 addendum 2026-10-15. Deepest today: Progress Past work; Jobs location chips are unique tab-like filters |
| Q16 | **Layout / shell:** Keep 960px shell or change? Content vs chrome width budget; wrap vs scroll vs truncate vs shortened labels; two-column mins; stack gap scale; breakpoint scale; paired panel heights? | M0 (shell/spacing tokens); M1 (chrome budget / column behavior) | (open) From M0-01 addendum 2026-10-15. Past work dual-column + nowrap rows are the sharpest pressure cases |

## Resolved questions

<details>
<summary>Resolved questions (3)</summary>

| # | Question | Answer (date) | Now in |
|---|----------|---------------|--------|
| RQ1 | Full-app migration before F08 M5 needs are known? | No; then superseded by comprehensive system + phased migration (2026-10-15) | R.11, milestones |
| RQ2 | Wait on F08 M7/M8 before M0? | Yes until those layouts settled; gate cleared when M7/M8 Done (2026-10-15) | M0 status |
| RQ3 | M0 vs M1: visual vs patterns? | M0 purely visual; Q8–Q11 / R.7–R.10 tactics deferred to M1 pattern tickets (2026-10-15) | R.14 |

</details>

## Decisions log

- **2026-10-12:** Reference doc (`docs/design-system.md`) and migration (this spec) are kept separate: the reference is permanent, the migration is a bounded project.
- **2026-10-12:** No full-app migration yet; scope M1 from F08 M5's dependencies. *(Superseded 2026-10-15 by R.11.)*
- **2026-10-13:** M0's questions (Q1–Q5) are settled during the F08 M5 design pass rather than before it. M1 then builds only what M5 needs (at least the one-time notice, the LC stepper and the Home target row). *(Superseded 2026-10-15: M0 is a full visual foundations pass; M1 builds system primitives and patterns.)*
- **2026-10-13 (M5-06 close):** M0 waits until F08 M7 and M8 define the rewards and Progress pages, so the whole app's look can be judged together. Until then, styling issues found during other work are logged here (Current behavior) for M0 to resolve, not fixed in place, unless a ticket needs the fix to work.
- **2026-10-13 (later):** The F08 M5-06 review didn't settle Q1–Q5; they stay in F09. F08 M5 uses interim working decisions (flat, tinted purple primary buttons, blue toggles, pace text never bold), recorded in `docs/design-system.md`. The `:not(...)` chain and the missing raised-surface shadow token stay in F09's scope. The M5-06 prototypes' direction page (`/prototype/f08/weekly/visual-direction`) and its conflicting-patterns audit were a test case for that round only.
- **2026-10-13:** Banner behavior is standardized. F08 M5-02 defines the one-time notice; F09 owns moving the Jobs ranking banner onto it (R.6).
- **2026-10-14:** From F08 M8 IA lock: Proposed R.7 (paginate long lists by default) and R.8 (feature shell / subnav convention); open Q8–Q9. F08 M8 implements Past work pagination and Progress nested routes only.
- **2026-10-15:** From post–F08 M8 feedback: Established R.9 (`EarnFlash` must be visible near the user's action, not only at a scrolled-away page top) and R.10 (compact long pages, especially Tasks); open Q10–Q11 for placement and compaction tactics.
- **2026-10-15 (Phase 0):** Success definition locked: **comprehensive system + phased migration** (R.11). M0 is **purely visual** and starts from **theme/vibe** (Q12), exploring beyond F08 W/A/B/C; W remains a preference from that round, not the locked direction. Foundations inventory is thorough (R.12), including niche visuals such as heatmap gradients (R0.3, Q13). Visual-direction prototyping moves to **F09-owned** prototypes (R.13); F08's visual-direction page is historical input only. Q8–Q11 deferred to **M1** pattern tickets (R.14). Future features must extend the system (R.15). M1/M2/M3 milestones rewritten accordingly; F08 M7/M8 wait gate cleared. Feature status → Active.
- **2026-10-15 (M0-01 addendum):** Inventory expanded with typography (Q14), information depth (Q15), and shell/layout fit (Q16). Type is a primary vibe axis alongside elevation. Depth/layout standards mostly land in M1 (with shell/type tokens in M0); findings in `tickets/M0/M0-01-findings.md` §§12–14.
