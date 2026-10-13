# M5-10: Daily LC and apps streaks

**Status:** Draft (open: spec Q42, Q45, Q46)
**Blocked by:** M4-03 (LC day earns must survive going to 0 and back)
**Implements:** R5.16, R5.25 (from `../../spec.md`)
**Type:** build

## What to build

Two daily streaks, computed the same way:

- **LC:** a day counts if it has at least 1 solve.
- **Apps:** a day counts if at least 1 application was marked applied that day (local date of `applied_at`; Proposed definition in R5.25).
- Days are local days in the user's time zone (B2). Today doesn't break a streak until it ends.

Points (numbers per Q42):

- Each day the streak continues earns daily points that grow with the streak's length.
- Reaching a milestone length earns a one-time reward per streak.
- When points are awarded and reversed is per Q45; days before launch per Q46.

The API exposes the current length of each streak and whether today already counts, for the today strip (M5-12) and the M5-07 surface.

## Acceptance criteria

(Draft. Finalize after Q42, Q45 and Q46.)

- [ ] Streak lengths are correct across gaps, today-not-yet-done, and a time-zone boundary.
- [ ] Daily points match the Q42 table at day 1, mid-ramp and past the cap.
- [ ] Milestones pay once per streak; a new streak can earn them again.
- [ ] Same-day undo (LC back to 0, per Q45) reverses that day's streak points.
- [ ] Each streak event appears in the points log. The ledger's category check allows only task, application, leetcode, interview, reflection, weekly_goal and achievement ([`025_points_ledger.sql` L7–17](../../../../../apps/api/src/sql/025_points_ledger.sql)); a new `streak` category needs a migration. Recommendation: add `streak`, so the breakdown shows it separately from achievements.
- [ ] Tests cover all of the above.

## Reuse notes

`leetcode_daily` for LC days; `applications.applied_at` for apps days. Ledger earn/adjust/reverse in `pointsLedger.ts`.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run build` passes
- [ ] `npm test` passes (known baseline aside)
- [ ] API typecheck: no new errors
- [ ] Reuse check done
- [ ] Committed as `F08 M5-10: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(Filled in when done.)
