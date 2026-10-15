# M8-03: This week surface

**Status:** Blocked
**Blocked by:** M8-01, M8-02
**Implements:** R8.3, R8.10, R8.11 (from `../../spec.md`); keeps R5.3–R5.5, R5.27, R5.28, R5.32
**Type:** build

## What to build

Implement `/progress/week` as the default Progress landing, following the M8-01 verdict for This week composition, heatmap peek, and LC tier polish.

Must include:

- Today streak strip (R5.27)
- Weekly goals block (R5.3–R5.5, R5.28) — content/behavior unchanged unless the verdict adjusts chrome only
- Log work: polished LC stepper (R8.3: tier + increment visible), reflection compose, today's notes, apps logged today
- Compact week/month pulse (not the old competing hero cards unless the verdict keeps a calm equivalent)
- Heatmap peek per R8.11 / M8-01 (not the full dual ~26-week pair as the page hero)
- Optional next-achievement teaser only if M8-01 locked it in

EarnFlash and achievement unlock modal behavior stay as today.

## Acceptance criteria

- [ ] `/progress/week` matches the M8-01 This week + heatmap peek + LC polish verdicts
- [ ] Weekly goals and LC write path still work end to end (no regression of R5.14 / R5.17 / R5.20)
- [ ] Heatmap peek is short (collapsed / rhythm / ~7–14 days per verdict), not the old full today-band dual grids as the primary visual
- [ ] LC stepper shows tier and point increment clearly
- [ ] Follows `docs/design-system.md`; reuse existing Progress components where they fit

## Reuse notes

`TodayStrip`, `WeeklyGoalsBlock`, `LeetcodeLogger`, `ReflectionCompose` / `ReflectionAccordion`, `ProgressHeatmap` (trimmed or variant), `EarnFlash`. Prototype: `/prototype/f08/progress` (This week pages).

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M8-03: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(Filled in when done.)
