# M5-05: Week close and weekly records

**Status:** Done
**Blocked by:** M4-01 (done: one mark-applied hook for weekly apps progress)
**Implements:** R5.7, R5.8 (data; display is M5-15), R5.9, R5.11, R5.12, R5.14, R5.15, R5.22, R5.23, R5.24, R5.28 (data), B1 (from `../../spec.md`)
**Type:** build

## What to build

When a week ends, each goal's result is recorded once, points are awarded from that record, and open app tasks carry forward. Everything after it (the congrats banner, the completion log entries in M5-15, streaks of met weeks) reads the record instead of recomputing.

1. **A stored week record per goal:** target, progress (or done/total for apps), whether it was met, the points awarded, and when it closed. Today nothing stores a week's result: `weekly_goal_members` allows a task in only one week (unique `task_id`, migration 021), and carry-over moves it out of last week ([`weeklyGoals.ts` L246–266](../../../../../apps/api/src/weeklyGoals.ts)).
2. **Closing (R5.23):** the first request after a week ends closes every unclosed week, oldest first, then carries open tagged tasks into the current week. This also fixes stranded members after a week with no visits. A closed week isn't closed twice, even with two requests at once.
3. **Scoring (R5.15):** +20 per completed tagged app or weekly LC solve, +100 flat when met. LC past the target keeps earning +20 per solve. A 0/0 apps week earns nothing (R5.12). One `weekly_goal` earn per goal per week, labelled "Week of …".
4. **Stop awarding at the moment a target is hit:** remove the immediate bonuses ([`progress.ts` L556–570](../../../../../apps/api/src/progress.ts), and the mark-applied hook `checkWeeklyAppsGoal` in [`markApplied.ts` L141–156](../../../../../apps/api/src/markApplied.ts), which M4-01 made the only apps path).
5. **LC progress past the target (R5.14):** stop capping progress at the target ([`weeklyGoals.ts` L304–321](../../../../../apps/api/src/weeklyGoals.ts)).
6. **Apps membership (R5.24):** untagging an open task shrinks the goal; a deleted tagged task drops out.
7. **Start and switch-over (R5.22):** records start with the week this ships. Earlier weeks are never closed or scored. In the switch-over week, a flat +100 already paid the old way isn't paid again.
8. **Completion log data (R5.8):** the completions diary API ([`completionsDiary.ts`](../../../../../apps/api/src/completionsDiary.ts), `GET /progress/completions`) returns each closed week as one entry per goal, of a new kind `weekly` (`CompletionKind`, L6). Each entry carries the goal (apps or LC), progress or done, target, whether it was met, points awarded, the week it covers, and the close date it's listed on. The ledger rows and filter tab are M5-15.
9. **After close (R5.23):** a closed week's record is fixed. A weekly solve logged late counts toward the current week; a carried-over task counts toward the week it's completed in.
10. **Weekly-goal streak (R5.28):** expose each goal's current run of met weeks from the records, for display only (no points).
11. **Local time zone everywhere (B2, 2026-10-13):** every request that reads, scores or closes weeks uses the browser's time zone (`tz`), never a UTC fallback. Today the Tasks and Jobs mark-applied calls send no `tz` (`completeTask` and `createApplication` in [`api.ts`](../../../../../apps/web/src/api.ts)), so their weekly check runs in UTC ([`routes.ts` `requestTimezone`](../../../../../apps/api/src/routes.ts)). The web sends `browserTz()` on those calls. (Proposed: a weekly read without a valid `tz` is rejected rather than defaulting to UTC.)

This ticket is backend only (split 2026-10-13). Item 11 changes web API calls but no UI.

## Acceptance criteria

- [x] Closing a week with 6/10 apps done records 6/10, not met, +120.
- [x] 10/10 apps: met, +300. LC 12/10: met, +340.
- [x] 0/0 apps: recorded, not met, 0 points.
- [x] Open tagged tasks move to the new week; last week's record keeps its result.
- [x] Two weeks without a visit: both close in order on the next request, and members carry forward correctly.
- [x] Concurrent requests close a week exactly once (one record, one earn per goal).
- [x] No weekly points are awarded when a target is hit mid-week, from any path.
- [x] LC progress can exceed the target and is shown as such by the API.
- [x] The switch-over week doesn't pay the flat bonus twice; weeks before it get no record.
- [x] `GET /progress/completions` returns one `weekly` entry per goal per closed week, on its close date, with goal, progress, target, met and points (0/0 apps included, with 0 points).
- [x] After close, no action changes a closed week's record or points; a late weekly solve raises the current week instead.
- [x] Each goal's run of consecutive met weeks is available from the API.
- [x] Mark applied from Tasks and Jobs sends the browser's time zone, so weekly apps progress and scoring use local weeks.
- [x] Tests cover all of the above, including week boundaries in a non-UTC time zone (B2).

## Reuse notes

Extend `weeklyGoals.ts` (`ensurePair` is the natural place to close weeks before reading) and `awardWeeklyGoalIfNeeded` ([`pointsAwards.ts` L212+](../../../../../apps/api/src/pointsAwards.ts)), which already records one earn per week and goal. The existing unique index on weekly-goal earns protects against double awards.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Reuse check done
- [x] Committed as `F08 M5-05: …`
- [x] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

**Done 2026-10-13** (commit hash on the board).

- **Records and close:** migration 029 adds `weekly_goal_records` (one fixed row per week and goal) and `weekly_close_state` (the switch-over week). `closeDueWeeks` ([`weeklyGoals.ts`](../../../../../apps/api/src/weeklyGoals.ts)) runs first in the weekly snapshot (so Home too), `patchLcGoal`, `setAppTargetMembership`, the completions diary and `markApplied`. It takes an advisory lock in its own transaction, closes weeks oldest first, records each goal, pays one `weekly_record` earn (`Week of Mar 2 · LC 12/10 · +340 points`), then carries open tagged tasks forward. The unique `(week_start, slot)` and earn indexes back up the lock.
- **Late completions:** an apps week counts tagged tasks completed before its local end (`completed_at`), so a task finished Monday morning before any close still counts for the new week and moves there.
- **Switch-over (R5.22):** the first check records the current week as the start and adopts open tagged tasks stranded in older weeks. If the old code already paid the flat +100 for that week, the close pays the units only; the record still shows the week's full worth and `flat_bonus_paid_before`. On the dev database the start week is 2026-10-12, so the first real close is Monday 2026-10-19.
- **Removed:** the instant bonuses in `setLeetcodeDaily` and `markApplied`, `awardWeeklyGoalIfNeeded`, and the LC cap. The weekly snapshot adds `metWeeksStreak` per goal. The diary returns `weekly` items (title, the M5-06 meta text as `subtitle`, points, `weekly` details) and `stats.allTime.weekly`; the `weekly` tab and row styling are M5-15.
- **Time zone (B2):** mark applied closes weeks only with a valid `tz` (no UTC fallback; the unused `requestTimezone` helper is gone). The web sends the browser's zone on `completeTask` and `createApplication` ([`api.ts` `tzQuery`](../../../../../apps/web/src/api.ts)). `GET /api/home` without `tz` returns no weekly goals rather than UTC ones; Upcoming keeps its UTC fallback. The Proposed rejection of weekly reads without `tz` wasn't needed: every weekly route already returns 400 without one.
- **Checked by running:** 15 integration tests in `weekClose.api.test.ts` (fixed weeks in America/Los_Angeles across the DST change: 6/10, 10/10, LC 12/10, 0/0, two missed visits, concurrent closes, Sunday 23:30 vs Monday 01:00, switch-over with and without a prior bonus, first-run adoption, no mid-week points from any path, LC past and lowered target, fixed records after close, R5.24 untag and delete, streaks, diary entries, mark applied with and without `tz`). The mark-applied parity test no longer expects a weekly bonus. `npm run check` passes (264 tests).
- **Proposed (not in the spec):** a tagged task completed in a week, then reopened before that week closes, is carried forward as open. Untagging a completed task is still allowed, as before.
