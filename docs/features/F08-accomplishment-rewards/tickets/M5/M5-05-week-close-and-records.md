# M5-05: Week close and weekly records

**Status:** Ready (after M4-01)
**Blocked by:** M4-01 (one mark-applied hook for weekly apps progress)
**Implements:** R5.7, R5.8, R5.9, R5.11, R5.12, R5.14, R5.15, R5.22, R5.23, R5.24, R5.28 (data), B1 (from `../../spec.md`)
**Type:** build

## What to build

When a week ends, each goal's result is recorded once, points are awarded from that record, and open app tasks carry forward. Everything after it (the congrats banner, the completion log entry, streaks of met weeks) reads the record instead of recomputing.

1. **A stored week record per goal:** target, progress (or done/total for apps), whether it was met, the points awarded, and when it closed. Today nothing stores a week's result: `weekly_goal_members` allows a task in only one week (unique `task_id`, migration 021), and carry-over moves it out of last week ([`weeklyGoals.ts` L246–266](../../../../../apps/api/src/weeklyGoals.ts)).
2. **Closing (R5.23):** the first request after a week ends closes every unclosed week, oldest first, then carries open tagged tasks into the current week. This also fixes stranded members after a week with no visits. A closed week isn't closed twice, even with two requests at once.
3. **Scoring (R5.15):** +20 per completed tagged app or weekly LC solve, +100 flat when met. LC past the target keeps earning +20 per solve. A 0/0 apps week earns nothing (R5.12). One `weekly_goal` earn per goal per week, labelled "Week of …".
4. **Stop awarding at the moment a target is hit:** remove the immediate bonuses ([`progress.ts` L556–570](../../../../../apps/api/src/progress.ts), [`routes.ts` L1067–1081](../../../../../apps/api/src/routes.ts), and the mark-applied hook M4-01 consolidates).
5. **LC progress past the target (R5.14):** stop capping progress at the target ([`weeklyGoals.ts` L304–321](../../../../../apps/api/src/weeklyGoals.ts)).
6. **Apps membership (R5.24):** untagging an open task shrinks the goal; a deleted tagged task drops out.
7. **Start and switch-over (R5.22):** records start with the week this ships. Earlier weeks are never closed or scored. In the switch-over week, a flat +100 already paid the old way isn't paid again.
8. **Completion log (R5.8):** each closed week adds one entry per goal (for example `Apps 6/10`, `LC 12/10`, with its points) to the completions diary ([`completionsDiary.ts`](../../../../../apps/api/src/completionsDiary.ts)) as a new kind. Its look comes from M5-06.
9. **After close (R5.23):** a closed week's record is fixed. A weekly solve logged late counts toward the current week; a carried-over task counts toward the week it's completed in.
10. **Weekly-goal streak (R5.28):** expose each goal's current run of met weeks from the records, for display only (no points).

## Acceptance criteria

- [ ] Closing a week with 6/10 apps done records 6/10, not met, +120.
- [ ] 10/10 apps: met, +300. LC 12/10: met, +340.
- [ ] 0/0 apps: recorded, not met, 0 points.
- [ ] Open tagged tasks move to the new week; last week's record keeps its result.
- [ ] Two weeks without a visit: both close in order on the next request, and members carry forward correctly.
- [ ] Concurrent requests close a week exactly once (one record, one earn per goal).
- [ ] No weekly points are awarded when a target is hit mid-week, from any path.
- [ ] LC progress can exceed the target and is shown as such by the API.
- [ ] The switch-over week doesn't pay the flat bonus twice; weeks before it get no record.
- [ ] Closed weeks appear in the completions diary, one entry per goal.
- [ ] After close, no action changes a closed week's record or points; a late weekly solve raises the current week instead.
- [ ] Each goal's run of consecutive met weeks is available from the API.
- [ ] Tests cover all of the above, including week boundaries in a non-UTC time zone (B2).

## Reuse notes

Extend `weeklyGoals.ts` (`ensurePair` is the natural place to close weeks before reading) and `awardWeeklyGoalIfNeeded` ([`pointsAwards.ts` L212+](../../../../../apps/api/src/pointsAwards.ts)), which already records one earn per week and goal. The existing unique index on weekly-goal earns protects against double awards.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md` (completion log entry)
- [ ] Reuse check done
- [ ] Committed as `F08 M5-05: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(Filled in when done.)
