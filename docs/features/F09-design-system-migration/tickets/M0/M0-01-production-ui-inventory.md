# M0-01: Production UI visual inventory (spike)

**Status:** Ready
**Blocked by:** (none)
**Implements:** R.12, R0.1 (input), R0.3 (scope), Q5 / Q12 / Q13 (findings)
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
- Typography and density outliers on major pages (Home, Tasks, Progress, Rewards, Jobs, Applications, Interviews)

Prototype-only stylesheets are out of scope except as optional historical notes.

## Acceptance criteria

- [ ] Written findings doc in this ticket's Verification notes (or a short linked section in the F09 spec Current behavior / a spike appendix)—enough for M0-02 to design variants without re-auditing
- [ ] Competing patterns listed per area (feeds the "Conflicting patterns → chosen standard" table)
- [ ] Explicit call-out of vibe tension: raised Sakura Terminal vs clean/flat (Q12), with concrete examples (file + lines)
- [ ] Heatmap / intensity coloring described (current scale behavior, hues, empty/future/peak) for Q13
- [ ] Gaps called out that are **not** already in the F09 Current behavior table (proves R.12)
- [ ] No production code changes required; if a blocking bug is found, report it per Issues found—do not fix in this spike

## Design questions (prototype tickets only)

n/a

## Reuse notes

- Start from F09 Current behavior and the conflict list in `apps/web/src/prototype/f08-weekly/VisualDirectionPrototypePage.tsx` as **seeds only**
- `docs/design-system.md` component catalogue for area names
- Production: `styles.css` `:root`, `ModalLayer`, `ProgressHeatmap` / `intensityScale`, Rewards/Progress layouts, Tasks

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes (no code changes expected; still run if anything was touched)
- [ ] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M0-01: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(filled when done)
