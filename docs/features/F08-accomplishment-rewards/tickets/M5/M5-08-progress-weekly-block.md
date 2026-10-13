# M5-08: Progress weekly goals block

**Status:** Draft (waits on the M5-06 verdict)
**Blocked by:** M5-06
**Implements:** R5.3, R5.4, R5.5, R5.14 (display) (from `../../spec.md`)
**Type:** build

## What to build

The Progress weekly goals block, as chosen in M5-06:

- Bars, counts and ahead/behind pace stay (R5.3).
- The apps goal's members are a plain list: no checkboxes (which today complete the task with no modal) and no Untag button ([`WeeklyGoalsBlock.tsx` L82–118](../../../../../apps/web/src/features/progress/WeeklyGoalsBlock.tsx)). Membership is managed only on Tasks (R5.4).
- An optional LC label, editable here, up to 50 characters, cleared every week (R5.5, B6). It's stored on the week's LC goal.
- LC progress past the target displays as reached (12/10) instead of being capped ([`WeeklyGoalsBlock.tsx` L62–66](../../../../../apps/web/src/features/progress/WeeklyGoalsBlock.tsx)).

The LC stepper itself is M5-01.

## Acceptance criteria

(Finalize after M5-06.)

- [ ] The apps list has no checkbox or untag control.
- [ ] The LC label saves, rejects more than 50 characters, and is empty in a new week.
- [ ] 12/10 shows as 12/10 with a full bar.
- [ ] Matches the chosen M5-06 variant.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M5-08: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(Filled in when done.)
