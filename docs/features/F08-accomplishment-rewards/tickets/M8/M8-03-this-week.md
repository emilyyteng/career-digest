# M8-03: This week surface

**Status:** Done
**Blocked by:** (none)
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

- [x] `/progress/week` matches R8.10 / M8-01 (including next-per-family, week+month pulse, weekly streaks, no heatmap peek)
- [x] Weekly goals and LC write path still work end to end (no regression of R5.14 / R5.17 / R5.20)
- [x] LC stepper shows tier and point increment clearly
- [x] Follows `docs/design-system.md`; reuse existing Progress components where they fit

## Reuse notes

`TodayStrip`, `WeeklyGoalsBlock`, `LeetcodeLogger` (+tier points), `ReflectionCompose` / `ReflectionAccordion`, `EarnFlash`, new `NextAchievements`. Completions diary week/month stats gained `leetcode`. Prototype `/prototype/f08/progress` kept as reference (no production import).

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F08 M8-03: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

- Layout: streaks → pulse → next achievements + weekly goals | LC + daily compose/notes/apps. No heatmaps.
- Pulse uses completions diary week/month with new `leetcode` field; API test covers week/month LC totals.
- LC stepper shows Easy/Medium/Hard with +20/+30/+50.
- `npm run check` green (342 tests). Commit hash filled on board in a follow-up.
