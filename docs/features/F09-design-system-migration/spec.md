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
| M0 | Purely visual + brand framing. Inventory production UI; explore direction broadly in **F09-owned** prototypes (not F08) — vibe packs, font switcher, color-meaning schemes, containment — then lock foundations in `docs/design-system.md`. Includes discussing product identity / possible rebrand as it ties to vibe | Done |
| M1 | Build primitives; remove the global inheritance trap; document interaction/IA patterns (lists, feature shell, paired panel heights, banner placement, compact long pages); enforce mechanically; pilot-migrate **Home** | Design |
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
- **R.7** (Established 2026-10-15; proposed 2026-10-14 from F08 M8) **Long lists are paginated by default** via a shared bottom **`Pager`** (Prev · `page / pages` · Next; size **25**; no page-jump or page-size select). Infinite / load-more is not the default. Progress Past work may keep a **calendar-driven 7-day window** as a documented special case. Documented in `docs/design-system.md` (M1-09).
- **R.8** (Established 2026-10-15; proposed 2026-10-14 from F08 M8) **Feature shell / subnav + page chrome.** Containerized anatomy: title → `ChromeTab` subnav or page tabs → optional **squared filter chips** (below tabs, left-aligned) → content, all inside one card. Shells for peer destinations (Progress, Rewards); page tabs for list partitions; chips for filters (never ChromeTab clothes, not rounded Segmented as page L2). Chrome budget: app nav → one of {shell, page tabs} → ≤1 chip row. Documented in `docs/design-system.md` (M1-06).
- **R.9** (Established 2026-10-15) **`EarnFlash` must appear in the user's current viewport**, near the control that earned (inline/portal; sticky toast fallback when there is no stable anchor). Not page-top-only. **`OneTimeNotice` does not share this rule** (section-top OK). Documented in `docs/design-system.md` (M1-10). Apply on hosts in follow/M2.
- **R.10** (Established 2026-10-15) **Long scroll-heavy pages should be made more compact** where the user must scroll to reach common actions. Priority surface: the **Tasks** page. Ordered tactics (M1-11): section chips → one well → pager → 28rem clamp → density → sticky compose only if still needed. **Tasks migration in M2.**
- **R.11** (Established 2026-10-15) **Comprehensive system, phased migration.** M0–M1 make the design system authoritative for all new UI. Existing screens migrate in later milestones by surface. Do not block new features on a full-app restyle.
- **R.12** (Established 2026-10-15) **M0 inventory and foundations are thorough**, not limited to the Current behavior table or to issues already explored in F08 prototypes. Parked rows are seeds and reminders; the audit must cover production UI systematically (including niche surfaces such as heatmap color scales).
- **R.13** (Established 2026-10-15) **Visual direction prototypes live under F09** (`apps/web/src/prototype/f09-design-system/…`, routes under `/prototype/f09/…`). Do not treat `/prototype/f08/weekly/visual-direction` as the home for F09 direction work; that page belongs to F08 and will be deleted with F08 prototype cleanup. F08 material may be copied or referenced as historical input only.
- **R.14** (Established 2026-10-15) **M0 is purely visual.** Theme/vibe, palette roles, elevation, type, spacing, component appearance, and data-visualization color (e.g. heatmaps). Interaction and IA patterns (Q8–Q11 / R.7–R.10 tactics) are M1 pattern tickets.
- **R.15** (Established 2026-10-15) **Future features feed the system.** A ticket that needs a look or pattern the design system lacks either reuses an existing entry or adds the new standard to `docs/design-system.md` (and primitives if needed) in the same change. No long-lived feature-local styling tracks.
- **R.16** (Established 2026-10-15) **Product identity / brand framing is in F09 M0 scope.** The app grew from a personal job board into a broader hub (tasks, motivation/rewards, etc.). M0 discusses what the site is and whether that deserves a clearer brand (name/voice/promise), because vibe cannot be locked without identity. A full marketing rebrand ship is not required in M0; enough framing to choose a visual direction is.

### M0

- **R0.1** (Established 2026-10-15) Start visual direction from **theme, vibe, and brand framing**, then derive accent roles, elevation, containment, and component looks. Do not treat F08 directions W/A/B/C—or only “Sakura vs flat”—as the option set. Explore broadly (including palettes beyond today’s pastels); keep loved elements (e.g. baby pink, clean readability) as preferences to try to preserve, not hard limits. Prefer side-by-side prototypes over deciding from inventory alone.
- **R0.2** (Established 2026-10-15) After the direction lock, record principles, tokens (including roles), and the visual component catalogue in `docs/design-system.md` so an agent can implement new UI without inventing styles.
- **R0.3** (Established 2026-10-15) Data-visualization color (heatmap intensity scales and similar gradients) is part of visual foundations, with named tokens or a documented scale—not ad-hoc per feature.
- **R0.4** (Established 2026-10-15) M0 prototypes include a **font switcher** (orthogonal to vibe packs) so multiple families can be judged for style vs readability without rebuilding every composition per font. Exploring beyond DM Sans + JetBrains Mono is in scope for M0.
- **R0.5** (Established 2026-10-15) **Color-meaning** is designed as a coherent scheme (action, selection, brand, success, warning, danger, data-sequential, severity) before seating special cases such as priority traffic lights. Red/yellow/green may remain if intentional; do not keep them only because they exist today.

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
| ~~A global `button` rule makes every button filled `--accent-blue-deep` with a `:not(...)` opt-out chain~~ | `styles.css` | Conforms R.1 / R1.1 (M1-04) | Bare `button` is a reset; product look from `Button` / `.ui-button*` / legacy `.secondary` / feature classes. Chain removed |
| Global element rules still structure bare `input` / `textarea` / `select` (padding, border); focus is ink not blue | `styles.css` | Conflicts R.1 (shim) | Structural shim until forms move to `TextField` / `SelectField` (page waves / M1-05+). `a` still global |
| `button.secondary` remains as legacy variant (~100+ uses); ink hover (M1-04) | across `apps/web/src` | Unspecified | Prefer `Button` for new UI; full call-site cleanup with surface waves |

| `:root` tokens ("Sakura Terminal" palette): `--accent-{pink,blue,purple,mint,yellow}` + `-deep`, `--surface`, `--border`, `--text*`, `--danger*`, `--radius-*`, `--shadow-*` | `styles.css` | Conflicts (roles remapped in M0) | M0 locked ink-desk roles in `design-system.md`; prod token names/values migrate in M1+ |
| `ModalLayer` provides the shared backdrop, Escape handling and dirty-discard guard; inner chrome helpers exist | `ModalLayer.tsx`, `ui/ModalChrome.tsx` | Conforms R.4 (M1-12) | New modals use header→body→footer; legacy modals migrate in waves. Achievement unlock still bypasses ModalLayer |
| Each prototype milestone has its own stylesheet (`prototype-m1.css`, `-m2`, `-m4`, `-m5`, F08 topic CSS, …) | `apps/web/src/prototype/` | Conflicts R.2 | F09 direction work must not live under F08 prototypes (R.13) |
| All styles live in one ~6k-line file | `styles.css` | Unspecified | Splitting is Q7 |
| ~~Number inputs inherit global padding so LC target looks oversized~~ | Progress weekly goals | Conforms (M1-02) | Uses `TextField fieldSize="num"` |
| Interim F08 M5 `ui-btn*` remain for some call sites; LC stepper uses `ui/Button` | [`styles.css`](../../../apps/web/src/styles.css) | Conflicts (cleanup) | Replace remaining `ui-btn*` in surface waves |

| The Jobs ranking banner stays until dismissed with ×, remembering dismissals per batch in `sessionStorage` (per tab); a successful batch hides on its own after 30 minutes | [`JobsPage.tsx`](../../../apps/web/src/features/jobs/JobsPage.tsx) | Conflicts R.6 | Moves to the one-time notice in M2 |
| Completions diary and similar logs are long unpaginated day-grouped lists | [`LedgerCompletionsPanel.tsx`](../../../apps/web/src/features/progress/LedgerCompletionsPanel.tsx) | Conflicts R.7 | Migrate to `Pager` (M2+); Past work 7-day window stays special case |
| Jobs pager includes a page-jump `<select>` | [`JobsPage.tsx`](../../../apps/web/src/features/jobs/JobsPage.tsx) `.pager` | Conflicts R.7 / M1-09 | Shared `Pager` has no select (M2) |
| Rewards and Progress use nested routes + subnav shells; full title→tabs→chips anatomy still migrating | [`RewardsLayout.tsx`](../../../apps/web/src/features/rewards/RewardsLayout.tsx), [`ProgressLayout.tsx`](../../../apps/web/src/features/progress/ProgressLayout.tsx) | Partial vs R.8 | Shell model conforms; chips + containerized title land in surface waves |
| Jobs / Applications / Interviews still use legacy `.tab.on` blue page tabs; Tasks/Progress/Rewards use `ChromeTab` underline | Jobs/Apps/Interviews pages; [`ui/ChromeTab.tsx`](../../../apps/web/src/ui/ChromeTab.tsx) | Conflicts R.8 / M1-15 | Migrate in M2 to ChromeTab + containerized chrome + filter chips |
| ~~Global `a` is blue with purple hover; Home uses ink + underline; other pages mix~~ | [`styles.css`](../../../apps/web/src/styles.css) | Conforms M1-16 | Ink + underline hover app-wide; named exceptions in `design-system.md` |
| `EarnFlash` is rendered near the top of the host page/section, not anchored to the control that earned | [`EarnFlash.tsx`](../../../apps/web/src/features/completion/EarnFlash.tsx), [`Tasks.tsx`](../../../apps/web/src/pages/Tasks.tsx), Progress week/past pages | Conflicts R.9 | Pattern locked M1-10; apply near-control in follow/M2 |
| Tasks is a long, dense scroll surface; common actions often sit below the first viewport | [`Tasks.tsx`](../../../apps/web/src/pages/Tasks.tsx) | Conflicts R.10 | Tactics locked M1-11; migrate M2 |
| ~~Progress heatmaps used navy-peak JS RGB scale~~ | [`intensityScale`](../../../apps/web/src/features/progress/intensityScale.ts) | Conforms (M1-14) | Vivid-rose `--heat-*` stops |
| Most workflow pages wrap content in raised `.card` panels; Rewards often open-canvas; Progress hybrid flat subnav + carded body | `.card` in `styles.css`; [`RewardsLayout.tsx`](../../../apps/web/src/features/rewards/RewardsLayout.tsx); Progress shell + pages | Conflicts (M0 all-carded) | All features carded per M0; migrate Rewards open canvas in surface waves |

## Out of scope (for now)

- Full-app visual migration in a single milestone (phased waves instead).
- Using F08 prototype routes as the lasting home for design-system direction work (R.13).

## Open questions

| # | Question | Blocks | Answer |
|---|----------|--------|--------|
| Q6 | How will UI rules be enforced mechanically (e.g. a lint rule against variant-less `<button>`)? A single `npm run check` command comes from maintenance ticket MT-01 and can host it. | M1 | (open) |
| Q7 | Should `styles.css` be split (per component or per feature), and when? | M1 / M3 | (open) Prefer after primitives exist |

## Resolved questions

<details>
<summary>Resolved questions (20)</summary>

| # | Question | Answer (date) | Now in |
|---|----------|---------------|--------|
| RQ1 | Full-app migration before F08 M5 needs are known? | No; then superseded by comprehensive system + phased migration (2026-10-15) | R.11, milestones |
| RQ2 | Wait on F08 M7/M8 before M0? | Yes until those layouts settled; gate cleared when M7/M8 Done (2026-10-15) | M0 status |
| RQ3 | M0 vs M1: visual vs patterns? | M0 purely visual; Q8–Q11 / R.7–R.10 tactics deferred to M1 pattern tickets (2026-10-15) | R.14 |
| Q1 | Primary button / accent | Ink fill primary (flat); not blue or purple pastel. Segmented active matches ink | `design-system.md` |
| Q2 | Elevation | Flat controls (no button shadow); soft card + modal overlay OK | `design-system.md` |
| Q3 | Button sizes | `sm` / `md` | `design-system.md` |
| Q4 | Pastel token set | Keep blush atmosphere; remap accent *roles* (ink action, domain hues, RYG severity) | `design-system.md` |
| Q5 | Conflicting patterns | See conflicting-patterns table (ink desk shortlist) | `design-system.md` |
| Q9 | Nested feature shell + subnav vs in-page tabs | One rule in `design-system.md`: shells for Progress/Rewards; page tabs for list partitions; squared filter chips as L2 (M1-06) | R.8, `design-system.md` |
| Q12 | Theme / vibe | **Ink desk (V1×V4)** — sakura canvas + ink chrome/actions; all carded | `design-system.md` |
| Q13 | Heatmap | Shared **vivid rose soft peak** (5 stops; peak = former step-3) | `design-system.md` |
| Q14 | Typography | **IBM Plex** Mono display / Sans body; size ladder documented | `design-system.md` |
| Q15 | Information depth | Containerized title→ChromeTab→squared chips (below, left)→content; max one tab row + one chip row; calendar = content; top nav kept; writes stay modals | R.8, `design-system.md` |
| Q16† | Shell width | **1100px** | `design-system.md` |
| Q16 | Layout / chrome budget (height + width) | Dual peers **fixed 28rem** in-panel scroll; Tasks **section chips → one well** (counts = active tab); mini above large when density differs; chips **wrap**; dual stack **640**; gaps 1rem/0.85rem; breakpoints 640/860/1100. Progress This week page composition → M2 (2026-10-15, M1-07/08) | `design-system.md` |
| Q8 | Long-list pagination | Bottom shared **`Pager`** (Prev / n/pages / Next), size **25**, no jump/size select; Past work 7-day window = Progress special case; reject load-more default (2026-10-15, M1-09) | R.7, `design-system.md` |
| Q10 | EarnFlash / notice placement | EarnFlash **near control** (toast fallback); OneTimeNotice **section-top**, does not share rule (2026-10-15, M1-10) | R.9, `design-system.md` |
| Q11 | Compact long pages | Ordered: chips → one well → pager → 28rem clamp → density → sticky compose if needed; Tasks first (M2) (2026-10-15, M1-11) | R.10, `design-system.md` |
| Q17 | Brand | **flora.exe** (mark/voice); full string rename not required in M0 | `design-system.md` |
| Q18 | Color meaning | Identity (apps/tech/reward) ≠ severity RYG ≠ urgency Severity-4; purple = domain tech only | `design-system.md` |

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
- **2026-10-15 (M0-01 review):** Lock visual choices from **exploratory prototypes**, not from inventory opinions. Brand/identity in M0 (R.16, Q17). Font switcher + other families in M0 (R0.4, Q14). Color-meaning scheme before priority seating (R0.5, Q18). Broad vibe pool beyond Sakura vs flat; baby pink and clean readability are preferences to preserve if possible. Containment (carded vs open canvas vs Progress hybrid) is an explicit axis. Elevation/nav/layout: develop approaches in the lab, then pick or remix.
- **2026-10-15 (M0-02 / M0-03):** Lab shortlist locked into `docs/design-system.md`: Ink desk vibe, flora.exe, IBM Plex, flat elev, all carded, 1100px shell, vivid-rose heat, Severity-5 urgency, purple=domain tech, RYG priority. F08 M5 interim visuals superseded. Q8–Q11 / Q15 / remaining Q16 stay open for M1. Prototype `/prototype/f09/lab` retained as reference (`548ba4e`).
- **2026-10-15 (M1 plan):** M1 tickets created. Pilot surface = **Home** (straightforward container placement). Q16 paired-panel height is its own pattern ticket: sibling columns share a defined height; overflow scrolls inside panels (Progress Past work is the stress case). Tokens/primitives → neutralize globals → Home pilot → IA/pattern tickets → enforcement.
- **2026-10-15 (urgency / kind badges):** Urgency revised to **Severity-4**: overdue=P0 · soon=pink (under 24h; merges former urgent+soon) · ahead=amber · ok=mint — drop gray ahead. Kind badges `interview` / `goal` render **INTERVIEW** / **GOAL** (uppercase). Recorded in `design-system.md`.
- **2026-10-15 (M1-15):** Post–Home-pilot refinements locked via `/prototype/f09/refinements`: Segmented active = soft ink wash; ChromeTab active = underline ink; urgency ahead = P1 gold (soon keeps pink); countdown = mono + zero-padded units joined by `:`, larger gap after pies; pies = SVG; GOAL badge = domain tech; Home link hover = underline (text may stay dark). Last-digest stays background-less.
- **2026-10-15 (M1-06):** Nesting / page chrome locked via `/prototype/f09/nesting`: containerized title → ChromeTab subnav/page tabs → squared filter chips (below tabs, left-aligned) → content. R.8 Established; Q9/Q15 resolved (width/panel height remain M1-07/08).
- **2026-10-15 (M1-07 / M1-08):** Layout locked via `/prototype/f09/layout`: dual peers both fixed 28rem with in-panel scroll; Tasks section chips → one well (chip counts match active tab only); mini-containers stack above larger wells; chips wrap; dual stack 640; gaps 1rem/0.85rem; breakpoints 640/860/1100. Progress This week page composition (LC / daily / weekly goals; dual +/-) deferred to M2. Q16 resolved.
- **2026-10-15 (M1-09 / M1-10 / M1-11):** Patterns locked via `/prototype/f09/patterns`: R.7 Established — bottom shared `Pager` (size 25, no select; Past work 7-day window special); EarnFlash near control + toast fallback, OneTimeNotice section-top; compact tactics chips → clamp → pager (+ density/sticky only if needed). Q8 / Q10 / Q11 resolved.
- **2026-10-15 (M1-16):** In-content link hover applied app-wide: ink text + underline on hover; exceptions for ChromeTab, brand, block card-hits, rich-text body links.
- **2026-10-15 (M1-12):** Modal inner anatomy locked (`ModalHeader` / `ModalBody` / `ModalFooter`; secondary then primary). Achievement unlock still bypasses ModalLayer (known debt).
