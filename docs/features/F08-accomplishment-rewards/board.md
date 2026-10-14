# Board: Accomplishment, detail pages & rewards (F08)

Index of every ticket in this feature. Each ticket file's `Status:` line is the source of truth; update this board in the same commit. Spec: [spec.md](./spec.md).

Milestones M0, M1, M2 and M4 shipped before tickets existed, so they have no ticket history here.

## M0: Quick fixes

**Milestone status:** Done

## M1: Detail pages

**Milestone status:** Done

## M2: Reflections and completion modals

**Milestone status:** Done

No open tickets.

<details>
<summary>Done (2)</summary>

| Ticket | Title | Commit |
|--------|-------|--------|
| [M2-01](./tickets/M2/M2-01-merge-moves-reflections.md) | Merging duplicate postings moves reflections to the surviving application | `28ad562` (with M2-02) |
| [M2-02](./tickets/M2/M2-02-merge-keeps-everything.md) | Application merges keep everything from the removed application | `28ad562` |

</details>

## M3: Recurring tasks

**Milestone status:** Not started

## M4: Global points ledger

**Milestone status:** Done

No open tickets.

<details>
<summary>Done (3)</summary>

| Ticket | Title | Commit |
|--------|-------|--------|
| [M4-01](./tickets/M4/M4-01-unify-mark-applied.md) | Mark applied from Jobs has the same outcome as from Tasks | `5fb4c98` |
| [M4-02](./tickets/M4/M4-02-category-totals-double-reverse.md) | Category totals subtract a reversed earn twice | `84bf883` |
| [M4-03](./tickets/M4/M4-03-recomplete-earns-delta.md) | Reversed earns can be revived: re-completed tasks and re-raised LeetCode days | `9d155a5` (LeetCode banner moved to M5-01 in `20ef208`) |

</details>

## M5: Weekly goals, streaks & achievements, points rules, celebration

**Milestone status:** In progress

| Ticket | Title | Type | Status | Notes |
|--------|-------|------|--------|-------|
| [M5-02](./tickets/M5/M5-02-weekly-congrats-banner.md) | Weekly targets congrats banner on Home | build | Draft | After M5-05, M5-07 (M5-06 design in); documents banner patterns in the design system |
| [M5-07](./tickets/M5/M5-07-prototype-streaks-and-celebration.md) | Prototype streaks, achievements and the completion flourish | prototype | Ready | Mock numbers from R5.25–R5.26 |
| [M5-08](./tickets/M5/M5-08-progress-weekly-block.md) | Progress weekly goals block | build | Draft | After M5-05, M5-01, M5-07; owns the weekly-streak display (R5.28), criteria wait on M5-07 Q5 |
| [M5-09](./tickets/M5/M5-09-home-weekly-target-rows.md) | Weekly goal rows under Home Targets | build | Draft | After M5-08 (LC label API); M5-06 design in; finalize acceptance criteria |
| [M5-10](./tickets/M5/M5-10-daily-streaks.md) | Daily LC and apps streaks | build | Ready | M5-01 done; hooks go in `changeLeetcode`; includes the `streak` category migration |
| [M5-11](./tickets/M5/M5-11-achievements.md) | Count-based achievements | build | Draft | After M5-07, M5-01 |
| [M5-12](./tickets/M5/M5-12-today-strip-streaks.md) | Today strip shows streaks | build | Draft | After M5-07, M5-10 (M5-14 done) |
| [M5-13](./tickets/M5/M5-13-completion-flourish.md) | Completion flourish | build | Draft | Only if Q7 keeps it after M5-07 |

<details>
<summary>Done (8)</summary>

| Ticket | Title | Commit |
|--------|-------|--------|
| [M5-16](./tickets/M5/M5-16-leetcode-tab-in-completion-log.md) | LeetCode tab in the completion log; rename weekly to weekly goals | `(pending)` |
| [M5-01](./tickets/M5/M5-01-lc-weekly-misc-tiers.md) | Log LeetCode as weekly or misc, by difficulty tier, through one write path | `4cd75bb` |
| [M5-15](./tickets/M5/M5-15-weekly-records-in-completion-log.md) | Weekly records in the completion log | `712afa7` |
| [M5-05](./tickets/M5/M5-05-week-close-and-records.md) | Week close and weekly records | `e4ca71e` |
| [M5-03](./tickets/M5/M5-03-points-by-task-category.md) | Points breakdown splits tasks by task category | `5c1ea60` |
| [M5-06](./tickets/M5/M5-06-prototype-weekly-surfaces.md) | Prototype weekly goal surfaces | `f0a5fd2` |
| [M5-04](./tickets/M5/M5-04-work-time.md) | Time belongs to the work; reflections are flat +20 notes; misc tasks get a +10 base | `c367095` |
| [M5-14](./tickets/M5/M5-14-retire-deep-work.md) | Retire deep work | `d42626b` |

</details>

## M6: Board departures log

**Milestone status:** Not started

## M7: Cat Cake Collection v1

**Milestone status:** Not started

## M8: Progress redesign, LeetCode tier polish, information architecture

**Milestone status:** Not started
