# M5-09: Weekly goal rows under Home Targets

**Status:** Draft (waits on the M5-06 verdict)
**Blocked by:** M5-06
**Implements:** R5.5 (Home), R5.6, R5.7, R5.24 (Home row) (from `../../spec.md`)
**Type:** build

## What to build

Home Upcoming's Targets section shows the week's goals as rows on Sunday, styled like interviews, as chosen in M5-06. They aren't real tasks; Home Upcoming builds them alongside tasks, subtasks and interviews ([`homeUpcoming.ts`](../../../../../apps/api/src/homeUpcoming.ts)).

- Never under Deadlines; never overdue (R5.7).
- The LC row includes the label when set: `Weekly LC goal · Grind 75 Week 4` (R5.5).
- A goal's row disappears once that week's target is hit (R5.6). There's no apps row when no tasks are tagged (R5.24).
- Rows follow the 1-week / 2-week range: Sunday of the current week only (next week's goals don't exist yet).

## Acceptance criteria

(Finalize after M5-06.)

- [ ] Both rows appear on Sunday under Targets while unmet.
- [ ] Meeting a target removes its row on the next load.
- [ ] No apps row with 0 tagged tasks.
- [ ] The label shows in the LC row and nowhere else on Home.
- [ ] Rows never show as overdue, including on Sunday evening.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M5-09: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(Filled in when done.)
