# M2-03: This week remodel around Habits strip

**Status:** Done
**Blocked by:** (none)
**Scheduled with:** M2-02 (Done)
**Implements:** R1.12, R.9 (from `../../spec.md`)
**Type:** build

## What to build

Remodel Progress → **This week** into the habits hub shell: compact week/month pulse, Habits strip, and a layout slot for the existing weekly goals block (until M3 replaces column + incrementer). Remove Next achievements and the Daily progress aside.

## Acceptance criteria

- [x] Remove `NextAchievements` from This week (full achievements stay on Lifetime) (R1.12).
- [x] Remove Daily progress aside (reflection compose, notes list, apps list) from This week (R1.12).
- [x] Keep week/month **pulse** cards, compact, above the habits layout (R1.12).
- [x] Mount production Habits strip (from M2-01; foot actions if M2-02 Done).
- [x] Page uses design-system containerization / fixed-height-friendly split suitable for later weekly column + incrementer (R.9) — do not wait on F09 Progress migration.
- [x] Existing weekly goals block (apps/LC) still reachable on This week until M3-03/M3-04 land (temporary placement OK; document in verification notes).
- [x] No today-LC buried only in Past work — strip Log LC (M2-02) is the home; do not reintroduce today-LC solely inside a weekly aside.

## Edge cases

- Narrow viewports: pulse, strip, and weekly block stack without horizontal overflow (match design-system wrap rules).
- Empty pulse / empty weekly goals: page still coherent with strip present.

## Tests

- [x] Manual: This week has no Next achievements, no Daily progress compose/notes/apps aside.
- [x] Manual: pulse + Habits strip present; Lifetime achievements unchanged.
- [x] `npm run check` passes.

## Reuse notes

[`ThisWeekPage.tsx`](../../../../../apps/web/src/features/progress/ThisWeekPage.tsx); pulse components already on the page; Habits strip from M2-01. Prototype `/prototype/f11/habits/strip` Progress mock for composition reference.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Ticket status `Done`; board updated
- [x] Committed as `F11 M2-03: …`
- [x] End-of-task report given, including **Issues found**

## Verification notes

Page order: week/month pulse → today card with Habits strip (incl. Log LC / Add reflection) → full-width `WeeklyGoalsBlock` (temporary until M3). Removed Next achievements, Daily progress aside, and the duplicate This-week LeetCode logger panel. Strip `onRefresh` reloads today + weekly goals so LC progress stays in sync. `npm run check` passed (384 tests). Commit hash in board follow-up.
