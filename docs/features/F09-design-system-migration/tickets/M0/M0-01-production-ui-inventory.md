# M0-01: Production UI visual inventory (spike)

**Status:** Done
**Blocked by:** (none)
**Implements:** R.12, R0.1 (input), R0.3 (scope), Q5 / Q12–Q18 (findings)
**Type:** spike

## What to build

A thorough inventory of **production** visual UI in `apps/web` (not a restyle, and not limited to the F09 Current behavior table or the F08 visual-direction conflict list). The spike produces findings that M0-02 prototypes against and that M0-03 folds into `docs/design-system.md`.

Cover at least:

- Theme / chrome: shell, nav, page backgrounds, brand moments
- Elevation: cards, modals, popovers, buttons (where shadows appear or are undone)
- Actions: every distinct button / link-button look
- Forms: text, number, date/time, select, textarea sizing
- Navigation within features: tabs, segmented controls, chips, subnav
- Feedback: banners, flashes, errors, empty states
- Data viz: Progress heatmaps and any other intensity / gradient scales
- Domain chrome that carries color meaning: priority, urgency, lanes, streaks, rewards/collection accents
- Typography: font families (mono vs sans), roles (brand/nav/title/body/badge/number), size landscape, vibe impact
- Information depth: app nav → feature shell/tabs → secondary filters → leaf; nested tabs; Jobs location chips; top vs side nav tradeoffs
- Layout fit: shell width, container nesting, width pressure (tab labels, button rows, Past work), vertical rhythm / height, breakpoints
- Density outliers on major pages (Home, Tasks, Progress, Rewards, Jobs, Applications, Interviews)

Prototype-only stylesheets are out of scope except as optional historical notes.

## Acceptance criteria

- [x] Written findings doc in this ticket's Verification notes (or a short linked section in the F09 spec Current behavior / a spike appendix)—enough for M0-02 to design variants without re-auditing → [M0-01-findings.md](./M0-01-findings.md)
- [x] Competing patterns listed per area (feeds the "Conflicting patterns → chosen standard" table)
- [x] Explicit call-out of vibe tension: raised Sakura Terminal vs clean/flat (Q12), with concrete examples (file + lines)
- [x] Heatmap / intensity coloring described (current scale behavior, hues, empty/future/peak) for Q13
- [x] Gaps called out that are **not** already in the F09 Current behavior table (proves R.12)
- [x] No production code changes required; if a blocking bug is found, report it per Issues found—do not fix in this spike
- [x] **User review:** feedback folded into findings §15–16 and F09 spec (R.16, R0.4–R0.5, Q17–Q18); exploratory lab approach handed to M0-02

## Design questions (prototype tickets only)

n/a

## Reuse notes

- Start from F09 Current behavior and the conflict list in `apps/web/src/prototype/f08-weekly/VisualDirectionPrototypePage.tsx` as **seeds only**
- `docs/design-system.md` component catalogue for area names
- Production: `styles.css` `:root`, `ModalLayer`, `ProgressHeatmap` / `intensityScale`, Rewards/Progress layouts, Tasks

## Definition of done

- [x] Acceptance criteria met and checked (including user review)
- [x] `npm run check` passes (no code changes; docs-only — not re-run for this close-out)
- [x] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M0-01: …` (findings commits `e872617`, `9297b9d`, plus review close-out)
- [x] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

**2026-10-15 — closed after user review:**

- Findings: [M0-01-findings.md](./M0-01-findings.md) (inventory §§1–14; user review §15; proposed M0-02 lab §16)
- Method: read-only production CSS/TSX audit; not browser-verified
- User direction: decide from exploratory prototypes; font switcher + other families in M0; brand/identity in F09; color-meaning before priority seating; broad vibe pool; containment axis; avoid locking elevation/nav/layout from inventory alone
- Follow-on: [M0-02](./M0-02-prototype-visual-direction.md) implements the lab
- Issues found (not fixed): Achievement unlock bypasses `ModalLayer`; Past work grid comment vs `1fr | 1.25fr` column weights — report in end-of-task / triage as user decides
