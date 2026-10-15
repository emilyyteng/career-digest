# M8-03: This week surface

**Status:** Blocked
**Blocked by:** M8-01, M8-02
**Implements:** R8.3, R8.10, R8.11 (from `../../spec.md`); keeps R5.3–R5.5, R5.27, R5.28, R5.32
**Type:** build

## What to build

Implement `/progress/week` as the default Progress landing per R8.10 / M8-01:

- Today day-streak strip (R5.27)
- Week **and** month pulse: **`N LC · N apps · N tasks · N interviews · N reflections` / `N minutes worked`**
- Compact **next achievement per family**
- Weekly goals block with **weekly-goal streaks** (R5.3–R5.5, R5.28)
- Log work: polished LC stepper (R8.3) and reflection compose as **separate** blocks; today's notes and apps
- **No** heatmap peek (R8.11 dropped)

EarnFlash and achievement unlock modal behavior stay as today.

## Acceptance criteria

- [ ] `/progress/week` matches R8.10 / M8-01 (including next-per-family, week+month pulse, weekly streaks, no heatmap peek)
- [ ] Weekly goals and LC write path still work end to end (no regression of R5.14 / R5.17 / R5.20)
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
