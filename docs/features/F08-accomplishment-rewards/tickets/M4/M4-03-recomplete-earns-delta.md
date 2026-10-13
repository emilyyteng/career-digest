# M4-03: Reversed earns can be revived: re-completed tasks and re-raised LeetCode days

**Status:** Done (LeetCode banner question open)
**Blocked by:** (none)
**Implements:** R4.4 (LeetCode row), R4.12, R4.13 (from `../../spec.md`)
**Type:** bug
**Scheduled with:** M5 (same ledger code as M4-02)

## Found during (bug tickets only)

F08 spec audit, 2026-10-13 (spec Q33). The user decided the behavior the same day. The LeetCode case was found while writing this ticket and folded in by the user the same day, since it shares the root cause.

## Evidence (bug tickets only)

Root cause: once an earn is reversed it's marked superseded, and nothing ever brings it back. `recordEarn` returns the superseded earn instead of creating one, and `adjustEarnAmount` skips superseded earns.

**Misc task: complete, reopen, complete**

- Reopening a misc task reverses its earn ([`routes.ts` L1110–1121](../../../../../apps/api/src/routes.ts) → `reverseTaskComplete`, [`pointsAwards.ts` L242–253](../../../../../apps/api/src/pointsAwards.ts)), which marks the earn superseded.
- Completing it again calls `awardMiscTaskComplete` ([`pointsAwards.ts` L45–71](../../../../../apps/api/src/pointsAwards.ts)). `recordEarn` finds the superseded earn and returns it without adding anything ([`pointsLedger.ts` L183–188](../../../../../apps/api/src/pointsLedger.ts)).
- Net result of complete, reopen, complete: the task's points are gone (−f(old) from the reversal, +0 on re-complete).

**LeetCode: a day's count goes to 0, then back up**

- Dropping the day's count to 0 reverses the day's earn ([`pointsAwards.ts` L189–191](../../../../../apps/api/src/pointsAwards.ts)).
- Raising it again finds that earn and calls `adjustEarnAmount` ([`pointsAwards.ts` L194–202](../../../../../apps/api/src/pointsAwards.ts)), which returns without doing anything because the earn is superseded ([`pointsLedger.ts` L319–322](../../../../../apps/api/src/pointsLedger.ts)).
- Net result of 1 → 0 → 1 on the same day: the day earns 0 instead of one solve's points, and every later change that day also earns nothing.

## What to build

Re-completing a reopened misc task is treated as if the user had edited the actual time on the completed task (R2.10, the adjust path at [`routes.ts` L931–963](../../../../../apps/api/src/routes.ts)):

- Across reopen and re-complete together, the task's points change by f(new actual) − f(old actual), where f is the misc formula (1 × minutes, or 15 if blank, plus the flat +20 reflection add-on when the earn had one).
- Same actual time both times: net change 0. The task ends with the same points it had before the reopen.
- How the ledger records it is up to the implementation, within R4.3 (no earn deleted; corrections are reverse or adjust events). One way: re-complete reinstates the superseded earn with an adjust event worth f(new). Another: stop reversing on reopen and apply the delta on re-complete. Either must leave the points log readable, with each step explained in its message.

A LeetCode day always earns what its current count is worth (R4.4, R4.12), however many times it has gone to 0 and back. Raising a count from 0 reinstates the day's earn at the new value.

Fix this once in the ledger (a way to reinstate a superseded earn), not separately in each caller.

## Acceptance criteria

- [x] Complete at 30 min, reopen, complete at 30 min: balance and `task` category total equal what they were after the first completion.
- [x] Complete at 30 min, reopen, complete at 45 min: net +15 versus after the first completion.
- [x] Complete at 30 min, reopen, complete at 20 min: net −10.
- [x] Complete with blank actual, reopen, complete with blank actual: net 0.
- [x] Reopen and re-complete several times: the result still depends only on the last actual time.
- [x] Editing actual time after re-completing still adjusts from the current value.
- [x] The completion banner shows the net change, not a fresh full earn. (See verification notes: the banner states both.)
- [x] LeetCode 1 → 0 → 1 on the same day: the day's points equal one solve, and the `leetcode` category total matches.
- [x] LeetCode 2 → 0 → 3 on the same day: the day's points equal three solves.
- [ ] LeetCode 1 → 0 → 1 → 0: the day's points are 0; every step appears in the points log ✔, and the points banner shows each change ✘ (no LeetCode banner exists; see verification notes).
- [x] The balance equals the sum of category totals after each sequence above.
- [x] Tests cover each case above, for both misc tasks and LeetCode.

## Reuse notes

`adjustTaskCompleteActual` ([`pointsAwards.ts` L255+](../../../../../apps/api/src/pointsAwards.ts)) already computes the target from the misc formula and adjusts. Re-complete should reuse it rather than add a second formula path. Do this after or together with M4-02, which changes how reversed earns are stored. M5-01 rewrites the LeetCode write path with tiers; land this first, or make sure M5-01's path keeps these acceptance criteria.

## Definition of done

- [x] Acceptance criteria met and checked (one open part, below)
- [x] `npm run build` passes
- [x] `npm test` passes (known baseline aside; see the flakiness note)
- [x] API typecheck: no new errors
- [x] Reuse check done
- [x] Committed as `F08 M4-03: …`
- [x] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

- New `reinstateEarn` in `pointsLedger.ts`: for a superseded earn it inserts an adjust event worth the new amount minus whatever the earn still holds after its reverse (0 unless that reverse was clamped), clears `superseded`, drops `reversed_amount` / `clawback_applied`, and sets `current_amount`. Later adjusts and reverses then work as usual. No earn is deleted (R4.3).
- Misc: `awardMiscTaskComplete` checks for a superseded earn first and reinstates it at the misc formula's value (`miscTaskBreakdown`, the same formula `adjustTaskCompleteActual` uses). The reflection add-on stays if the original earn had one or the new completion has one.
- LeetCode: `syncLeetcodeDailyPoints` reinstates the day's superseded earn when the count rises above 0.
- Points log for complete 30 → reopen → complete 45: earn +30, reverse −30, adjust +45 "Essay complete again · +45 points (30 before reopen, net +15)". The completion banner shows that same message, so it gives the net change and the amount just added. Reopen still has no banner.
- Open: no banner exists for LeetCode changes (`PATCH /api/progress/leetcode` returns no points info), so "the points banner shows each change" isn't met for LeetCode. Every step is in the points log. Adding a LeetCode banner is new UI, so it's raised with the user rather than built here.
- Tests: 8 integration tests in `points.api.test.ts` (`reversed earns can be reinstated (M4-03)`). All 8 fail against the previous `pointsAwards.ts` and pass with the fix (checked by running both).
- Full suite: 204 tests. The `career_digest_test` database can't run integration tests at the moment (see Issues found in the report: `postings` has hit Postgres's 1600-column limit), so the suite was run on a fresh scratch database `career_digest_scratch_test`. There, about 1 run in 2–3 has a single random 404 in an unrelated file. The same happens on the commit before this change (2 of 5 runs), so it's existing flakiness.
