# M5-10: Daily LC and apps streaks

**Status:** Ready
**Blocked by:** M5-01, done (the LC streak's first-solve and back-to-0 hooks go in its single LeetCode write path, reading per-tier day counts; decided 2026-10-13). M4-03 done
**Implements:** R5.16, R5.25 (from `../../spec.md`)
**Type:** build

## What to build

Two daily streaks, computed the same way:

- **LC:** a day counts if it has at least 1 solve.
- **Apps:** a day counts if at least 1 application was marked applied that day (local date of `applied_at`; Proposed definition in R5.25).
- Days are local days in the user's time zone (B2). Today doesn't break a streak until it ends.

Points (R5.25; starting values, keep them in one place so they're easy to tune and so the in-app rules, R7.9, can read them):

- **Daily:** each day the streak continues earns 2 × the streak's length, capped at 20.
- **Milestones:** 5, 10, 20, 30, 50 and 100 days, worth 5 × the length. Each new streak can earn them again.
- **Timing:** a day's points are awarded on its first qualifying action, and reversed if that day drops back to 0 (for example LC back to 0). Editing a past day in History changes the displayed streak only; it doesn't award or reverse streak points for that day or later days.
- **Launch:** a streak running at launch keeps its earlier days; daily points start from launch.

**Ledger category:** add `streak` to the `points_events` category check with a migration ([`025_points_ledger.sql` L7–17](../../../../../apps/api/src/sql/025_points_ledger.sql)), so the breakdown shows streak points separately from achievements.

The API exposes the current length of each streak and whether today already counts, for the today strip (M5-12) and the M5-07 surface.

## Acceptance criteria

- [ ] Streak lengths are correct across gaps, today-not-yet-done, and a time-zone boundary.
- [ ] Daily points: day 1 = 2, day 5 = 10, day 10 = 20, day 15 = 20.
- [ ] Milestones: day 5 pays +25 once; a new streak reaching 5 pays again.
- [ ] Same-day undo (LC back to 0) reverses that day's streak points; logging again re-awards them (relies on M4-03).
- [ ] A History edit to a past day changes the displayed streak but no points.
- [ ] A streak running at launch shows its full length; no points are paid for days before launch.
- [ ] The migration adds `streak`; streak events appear in the points log and breakdown under it.
- [ ] Tests cover all of the above.

## Reuse notes

`leetcode_daily` for LC days; `applications.applied_at` for apps days. Ledger earn, adjust and reverse in `pointsLedger.ts`.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Reuse check done
- [ ] Committed as `F08 M5-10: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(Filled in when done.)
