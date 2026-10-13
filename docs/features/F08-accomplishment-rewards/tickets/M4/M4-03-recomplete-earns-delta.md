# M4-03: Reversed earns can be revived: re-completed tasks and re-raised LeetCode days

**Status:** Ready
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

- [ ] Complete at 30 min, reopen, complete at 30 min: balance and `task` category total equal what they were after the first completion.
- [ ] Complete at 30 min, reopen, complete at 45 min: net +15 versus after the first completion.
- [ ] Complete at 30 min, reopen, complete at 20 min: net −10.
- [ ] Complete with blank actual, reopen, complete with blank actual: net 0.
- [ ] Reopen and re-complete several times: the result still depends only on the last actual time.
- [ ] Editing actual time after re-completing still adjusts from the current value.
- [ ] The completion banner shows the net change, not a fresh full earn.
- [ ] LeetCode 1 → 0 → 1 on the same day: the day's points equal one solve, and the `leetcode` category total matches.
- [ ] LeetCode 2 → 0 → 3 on the same day: the day's points equal three solves.
- [ ] LeetCode 1 → 0 → 1 → 0: the day's points are 0; every step appears in the points log, and the points banner shows each change.
- [ ] The balance equals the sum of category totals after each sequence above.
- [ ] Tests cover each case above, for both misc tasks and LeetCode.

## Reuse notes

`adjustTaskCompleteActual` ([`pointsAwards.ts` L255+](../../../../../apps/api/src/pointsAwards.ts)) already computes the target from the misc formula and adjusts. Re-complete should reuse it rather than add a second formula path. Do this after or together with M4-02, which changes how reversed earns are stored. M5-01 rewrites the LeetCode write path with tiers; land this first, or make sure M5-01's path keeps these acceptance criteria.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run build` passes
- [ ] `npm test` passes (known baseline aside)
- [ ] API typecheck: no new errors
- [ ] Reuse check done
- [ ] Committed as `F08 M4-03: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(Filled in when done.)
