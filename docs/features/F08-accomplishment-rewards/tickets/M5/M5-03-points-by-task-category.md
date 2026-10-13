# M5-03: Points breakdown splits tasks by task category

**Status:** Ready (after M4-02)
**Blocked by:** M4-02 (category totals must be correct first)
**Implements:** R5.21 (from `../../spec.md`)
**Type:** build

## What to build

The points breakdown currently has one "task" row, and it takes up most of the total, so the breakdown says little. The task row is split by task category (School, Reading, Writing, Admin, and custom categories from F04), so the breakdown shows where task points came from.

- Applications, LeetCode, interviews, reflections, weekly goals and achievements stay as they are.
- Each task category's total is the net of its earns, adjusts and reverses (after M4-02, a reopened task nets to 0).
- **Attribution (Q39, 2026-10-13):** a task's points belong to its category at completion. The task earn records the category (its id, plus the name so the row still has a label if the category is later removed). Moving a completed task to another category doesn't move its points.
- **Earns from before this ticket** have no recorded category and fall back to the task's current category.
- **Earns whose task was deleted** (completed tasks can be deleted, [`tasks.ts` L963–986](../../../../../apps/api/src/tasks.ts)) go to one "Deleted tasks" row, shown only when it isn't 0 (Q41, 2026-10-13).

Today task earns don't record a task category ([`pointsAwards.ts` L45–71](../../../../../apps/api/src/pointsAwards.ts)); tasks point at `task_categories` through `tasks.category_id` ([`019_task_categories.sql`](../../../../../apps/api/src/sql/019_task_categories.sql)). The summary query is [`pointsLedger.ts` L107–121](../../../../../apps/api/src/pointsLedger.ts), and the view is `LedgerPointsPanel.tsx`.

## Acceptance criteria

- [ ] The breakdown shows one row per task category that has non-zero points, instead of a single task row.
- [ ] Category rows sum to what the task row showed before (after M4-02's fix).
- [ ] New task earns record the task's category at completion; moving the task afterwards doesn't change the breakdown.
- [ ] Earns from before this ticket appear under the task's current category.
- [ ] Earns whose task was deleted appear in a "Deleted tasks" row, hidden when it nets to 0, so the rows still sum to the old task total.
- [ ] Adjust and reverse events count toward the same category as their earn.
- [ ] Tests cover two categories, a task moved after completion, a pre-existing earn, a reopened task, and a deleted task.

## Reuse notes

Extend `getPointsSummary` rather than adding a second summary endpoint. The Rewards points log (R7.8) and the M8 redesign may restyle this view; keep the data shape simple.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [ ] Reuse check done
- [ ] Committed as `F08 M5-03: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(Filled in when done.)
