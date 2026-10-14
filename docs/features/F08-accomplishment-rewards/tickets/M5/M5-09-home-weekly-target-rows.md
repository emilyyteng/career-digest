# M5-09: Weekly goal rows under Home Targets

**Status:** Done
**Blocked by:** M5-08 (the LC label API; decided 2026-10-13). M5-06 done
**Implements:** R5.5 (Home), R5.6, R5.7, R5.24 (Home row) (from `../../spec.md`)
**Type:** build

## What to build

Home Upcoming's Targets section shows the week's goals as rows on Sunday, styled like interviews, as chosen in M5-06. They aren't real tasks; Home Upcoming builds them alongside tasks, subtasks and interviews ([`homeUpcoming.ts`](../../../../../apps/api/src/homeUpcoming.ts)).

- Never under Deadlines; never overdue (R5.7).
- The LC row includes the label when set: `Weekly LC goal · Grind 75 Week 4` (R5.5).
- A goal's row disappears once that week's target is hit (R5.6). There's no apps row when no tasks are tagged (R5.24).
- Rows follow the 1-week / 2-week range: Sunday of the current week only (next week's goals don't exist yet).

**Design (M5-06 verdict, Q3 variant B, 2026-10-13):** each row has its title, a mini bar, `done/total` and pace text (never bold) in the meta line, and the Sunday date plus `resets Monday` on the right, with no countdown. The hero's "This week" bars are removed. Clicking a row opens Progress. Reference: `/prototype/f08/weekly/home-targets`.

## Acceptance criteria

- [x] Both rows appear on Sunday under Targets while unmet.
- [x] Meeting a target removes its row on the next load.
- [x] No apps row with 0 tagged tasks.
- [x] The label shows in the LC row and nowhere else on Home.
- [x] Rows never show as overdue, including on Sunday evening.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F08 M5-09: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

Commit: see board. `kind: "weekly_goal"` items injected into Targets day groups for this week's Sunday; special-cased to never enter Overdue. Hero compact `WeeklyGoalsBlock` removed (M5-06 Q3 B).
