# Spec: Design system migration (F09)

**ID:** F09
**Status:** Planned
**Last updated:** 2026-10-15

## Problem

The app looks less visually consistent with each feature. Recurring issues: blue buttons, drop shadows, and inconsistent button sizes. New elements inherit global CSS defaults instead of using deliberate choices, and the codebase contains several conflicting styling approaches.

## Goals

- One visual standard, documented in `docs/design-system.md` and enforced through explicit component variants.
- New features follow it by default, without the user having to remind the agent.
- Migration effort stays proportional: do the minimum the active feature needs before attempting a broad migration.

## Milestones

| Milestone | Scope | Status |
|-----------|-------|--------|
| M0 | Agree on visual direction and component rules; record them in `docs/design-system.md`. One comprehensive design pass across the whole app, in scoped chunks if needed, after F08 M7 and M8 settle what the rewards and Progress pages contain and how they're laid out (2026-10-13). The F08 M5-06 prototypes are a test case | Not started |
| M1 | Build the components F08 M5 (Accomplishment, detail pages & rewards) depends on, and migrate only the surfaces F08 M5 touches | Not started |
| M2+ | Broader migration, scoped later | Not scoped |

## Requirements

### Cross-cutting

- **R.1** (Established) Use explicit component variants and reusable conventions, not global CSS defaults that every new element inherits.
- **R.2** (Established) Where the codebase has conflicting approaches, settle on one and make it the source of truth in `docs/design-system.md`.
- **R.3** (Established) Discuss and agree on the visual direction and component rules before any broad migration.
- **R.4** (Established) Modals follow one common standard.
- **R.5** (Established) The design-system reference must be something agents consult proactively. It is referenced from `AGENTS.md` and auto-attached for web UI files via `.cursor/rules/design-system.mdc`.
- **R.6** (Established 2026-10-13) Banners behave consistently across the app. F08 M5-02 introduces the "one-time notice" (shown once, × closes it early, marked seen per item in `localStorage`) and documents it in `docs/design-system.md` next to the transient flash (`EarnFlash`). F09 then moves the Jobs ranking banner onto the one-time notice: it has no reason to be more persistent than the weekly congrats banner. Scheduled in the broader migration (M2+), not done in F08.
- **R.7** (Proposed 2026-10-14; from F08 M8) **Long lists are paginated by default.** Infinite or very long unpaginated result lists should not be the default pattern. Page size and controls belong in the design system (or a documented list convention). F08 M8 Past work is exploring a **calendar-driven 7-day window** instead of classic page controls (F08 R8.4); F09 still owns the general rule for other lists.
- **R.8** (Proposed 2026-10-14; from F08 M8) **Feature shell / subnav convention.** Nested feature routes with a shared shell and subnav (Rewards today; Progress in F08 M8) vs peer in-page tabs should be one documented app pattern. May belong in the design system or in a small app-shell / IA note if it is not "visual design." F08 M8 uses the Rewards nested pattern for Progress without settling the app-wide rule.
- **R.9** (Established 2026-10-15) **`EarnFlash` must appear in the user's current viewport**, near the control they used (or otherwise where they are looking), not only at the top of a long page they have scrolled away from. Placement belongs in the banner / flash pattern in `docs/design-system.md` once settled (Q10).
- **R.10** (Established 2026-10-15) **Long scroll-heavy pages should be made more compact** where the user must scroll to reach common actions. Priority surface: the **Tasks** page. Compaction tactics (density, collapsible sections, sticky actions, etc.) are open (Q11); the design system should document the chosen approach so other lists can follow it.

### M1

- **R1.1** (Established) Scope is determined by what F08 M5 depends on, identified after the F08 spec is drafted.

## Current behavior (2026-10-12)

| Behavior | Where | Status | Notes |
|----------|-------|--------|-------|
| A global `button` rule makes every button filled `--accent-blue-deep` with `--shadow-button`; buttons escape only via a `:not(...)` chain of 22 classes, repeated on hover with 21 (`.rank-batch-dismiss` is missing, so it still gets the blue hover) | `apps/web/src/styles.css` L367–375 | Conflicts R.1 | Most likely mechanism behind the blue-button and shadow complaints. 51 of the file's 81 `box-shadow` declarations are `none` (7 with `!important`), mostly undoing the default. New variants must be built on `.secondary` to escape it (checked by running, 2026-10-13) |
| Global element rules style `a`, `input`, `textarea`, `select` | `styles.css` | Conflicts R.1 | |
| `button.secondary` is the de facto second variant (about 120 uses) | across `apps/web/src` | Unspecified | Candidate starting point for explicit variants |
| `:root` tokens ("Sakura Terminal" palette): `--accent-{pink,blue,purple,mint,yellow}` + `-deep`, `--surface`, `--border`, `--text*`, `--danger*`, `--radius-*`, `--shadow-*` | `styles.css` | Unspecified | Keep or revise is Q4 |
| `ModalLayer` provides the shared backdrop, Escape handling and dirty-discard guard; nearly every dialog renders inside it | `apps/web/src/ModalLayer.tsx` | Conforms R.4 (layer only) | Inner anatomy (header, body, footer, button order and size) unaudited; likely source of modal inconsistency |
| Each prototype milestone has its own stylesheet (`prototype-m1.css`, `-m2`, `-m4`, `-m5`, `-rewards`) | `apps/web/src/prototype/` | Conflicts R.2 | |
| All styles live in one 5,211-line file | `styles.css` | Unspecified | Splitting is Q7 |
| Number inputs inherit the global `input` padding and size, so a small number field such as the Progress weekly LC target (`.weekly-goal-target-field input`, width 4.5rem) looks too large next to its label | `styles.css` L336–343, L4121 | Conflicts R.1 | Found in the F08 M5-06 review (2026-10-13). Form-field sizes are Q3/Q5 |
| Interim button classes from F08 M5 (`docs/design-system.md` → Interim decisions), built on `.secondary`: `ui-btn` (outline, muted text, flat, `--radius-soft-box`), `ui-btn-primary` (tinted purple), `ui-btn-ghost` (no border), `.is-active` (blue fill and border, for toggles), and the `ui-segmented` toggle group. First used by the Progress LeetCode logger | [`styles.css` L1694–1745](../../../apps/web/src/styles.css), [`LeetcodeLogger.tsx`](../../../apps/web/src/features/progress/LeetcodeLogger.tsx) | Unspecified | Added by F08 M5-01 (2026-10-13). Reused by M5-08, M5-09 and M5-02. M0 decides whether they become the standard variants or get replaced. Sizes are one small size only (Q3) |
| The Jobs ranking banner stays until dismissed with ×, remembering dismissals per batch in `sessionStorage` (per tab); a successful batch hides on its own after 30 minutes | [`JobsPage.tsx` L114–175](../../../apps/web/src/features/jobs/JobsPage.tsx) | Conflicts R.6 | Checked by reading, 2026-10-13. Moves to the one-time notice once F08 M5-02 defines it |
| Completions diary and similar logs are long unpaginated day-grouped lists | [`LedgerCompletionsPanel.tsx`](../../../apps/web/src/features/progress/LedgerCompletionsPanel.tsx) | Conflicts R.7 (Proposed) | F08 M8 paginates Past work only; F09 owns the default |
| Rewards uses nested routes + subnav shell; Progress (pre-M8) uses peer `?tab=` tabs on one page; other pages vary | [`RewardsLayout.tsx`](../../../apps/web/src/features/rewards/RewardsLayout.tsx), [`ProgressPage.tsx`](../../../apps/web/src/features/progress/ProgressPage.tsx) | Conflicts R.8 (Proposed) | F08 M8 aligns Progress with Rewards; app-wide rule stays F09 |
| `EarnFlash` is rendered near the top of the host page/section (e.g. Tasks list, Progress surfaces), not anchored to the control that earned | [`EarnFlash.tsx`](../../../apps/web/src/features/completion/EarnFlash.tsx), [`Tasks.tsx`](../../../apps/web/src/pages/Tasks.tsx), Progress week/past pages | Conflicts R.9 | Easy to miss after scrolling to complete a lower row |
| Tasks is a long, dense scroll surface; common actions often sit below the first viewport | [`Tasks.tsx`](../../../apps/web/src/pages/Tasks.tsx) | Conflicts R.10 | Compaction is F09 work (Q11); not fixed ad hoc in other features |

## Out of scope (for now)

- Full-app migration before F08 M5 needs are known.
- Changing the palette itself, unless M0 decides to.

## Open questions

| # | Question | Blocks | Answer |
|---|----------|--------|--------|
| Q1 | Visual direction: what does a primary button look like if not filled blue? Which accent is primary? | M0 | (open) Preferences (2026-10-13, F08 M5-06 review): not the filled blue default, which keeps causing issues. Likes the tinted purple pastel buttons for a neutral look; the black (ink) buttons are bold and also appealing. Toggles: blue or purple, not pink, which is too bright for a switcher. M5 uses tinted purple buttons and blue toggles meanwhile (`docs/design-system.md` → Interim decisions) |
| Q2 | Elevation: flat, or a subtle shadow? Where (cards, modals, buttons)? | M0 | (open) Undecided (2026-10-13): flat looks clean, a slight elevation has its appeal, and the app mixes both today. M5 is flat meanwhile. There's no token for raised surfaces: `.modal` uses a raw `0 16px 40px var(--shadow-strong)` and popovers (link bubble, suggest list) `0 8px 20px var(--shadow-strong)` |
| Q3 | Button sizes: how many (e.g. sm / md), and which contexts use each? | M0 | (open) |
| Q4 | Is the current pastel token set kept as the base, or open to revision? | M0 | (open) |
| Q5 | Which conflicting existing patterns win (needs an audit of buttons, tabs, chips, modal anatomy, form fields)? | M0 | (open) |
| Q6 | How will UI rules be enforced mechanically (e.g. a lint rule against variant-less `<button>`)? A single `npm run check` command comes from maintenance ticket MT-01 and can host it. | M1 | (open) |
| Q7 | Should `styles.css` be split (per component or per feature), and when? | M1 | (open) |
| Q8 | Long-list pagination: default page sizes, control placement, and whether day-based windows (1 / 7) are a Progress-only idea or a reusable pattern? | M0 / M2+ | (open) Noted 2026-10-14 from F08 M8; F08 implements Past work only |
| Q9 | Nested feature shell + subnav vs in-page tabs: one app rule? Does it live in `docs/design-system.md` or a separate app-shell / IA doc? | M0 | (open) Noted 2026-10-14 from F08 M8 |
| Q10 | How should `EarnFlash` stay in view: portal near the clicked control, sticky/toast in the viewport, scroll-into-view of a top flash, or something else? Does the same rule apply to `OneTimeNotice`? | M0 / banners | (open) Noted 2026-10-15 with R.9 |
| Q11 | What makes Tasks (and similar long pages) compact enough: tighter row density, collapsible sections, sticky compose/actions, pagination/virtualization, or a redesign of the list chrome? | M0 / M2+ | (open) Noted 2026-10-15 with R.10; Tasks is the priority surface |

## Decisions log

- **2026-10-12:** Reference doc (`docs/design-system.md`) and migration (this spec) are kept separate: the reference is permanent, the migration is a bounded project.
- **2026-10-12:** No full-app migration yet; scope M1 from F08 M5's dependencies.
- **2026-10-13:** M0's questions (Q1–Q5) are settled during the F08 M5 design pass rather than before it. M1 then builds only what M5 needs (at least the one-time notice, the LC stepper and the Home target row).
- **2026-10-13 (M5-06 close):** M0 waits until F08 M7 and M8 define the rewards and Progress pages, so the whole app's look can be judged together. Until then, styling issues found during other work are logged here (Current behavior) for M0 to resolve, not fixed in place, unless a ticket needs the fix to work.
- **2026-10-13 (later):** The F08 M5-06 review didn't settle Q1–Q5; they stay in F09. F08 M5 uses interim working decisions (flat, tinted purple primary buttons, blue toggles, pace text never bold), recorded in `docs/design-system.md`. The `:not(...)` chain and the missing raised-surface shadow token stay in F09's scope. The M5-06 prototypes' direction page (`/prototype/f08/weekly/visual-direction`) and its conflicting-patterns audit remain the test case.
- **2026-10-13:** Banner behavior is standardized. F08 M5-02 defines the one-time notice; F09 owns moving the Jobs ranking banner onto it (R.6).
- **2026-10-14:** From F08 M8 IA lock: Proposed R.7 (paginate long lists by default) and R.8 (feature shell / subnav convention); open Q8–Q9. F08 M8 implements Past work pagination and Progress nested routes only.
- **2026-10-15:** From post–F08 M8 feedback: Established R.9 (`EarnFlash` must be visible near the user's action, not only at a scrolled-away page top) and R.10 (compact long pages, especially Tasks); open Q10–Q11 for placement and compaction tactics.
