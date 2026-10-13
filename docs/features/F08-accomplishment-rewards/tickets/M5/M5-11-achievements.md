# M5-11: Count-based achievements

**Status:** Draft (display waits on M5-07)
**Blocked by:** M5-07
**Implements:** R5.16, R5.26 (from `../../spec.md`)
**Type:** build

## What to build

Achievements unlock when a running count crosses a threshold, and each pays once:

- applications marked applied
- LC solves
- finished interview steps, counted separately per kind (assessment, phone, technical, onsite, offer). These pay more than applications or LC.

Thresholds and points (R5.26; starting values, kept in one place for tuning and for the in-app rules, R7.9):

- Applications: 10, 25, 50, 100, 150, 200, 300, 500; 3 × N.
- LC solves: 25, 50, 100, 200, 300, 500; 5 × N.
- Interview steps per kind, at the step's own points × N: assessment and phone 5, 10, 25, 50; technical 3, 5, 10, 25; onsite 1, 3, 5, 10; offer 1, 2, 3, 5. Custom steps don't count.

**Launch:** achievements already passed unlock at launch with no points; only crossings after launch earn. Display and the unlock moment come from M5-07.

## Acceptance criteria

(Draft. Finalize after M5-07.)

- [ ] Crossing a threshold unlocks it once and records one earn; dropping back below (for example an LC decrement) doesn't re-lock it or reverse the points, and crossing again doesn't pay again.
- [ ] Interview steps count per kind; reopening and re-finishing a step doesn't count twice (R4.11).
- [ ] Achievements already passed at launch show as unlocked, with no earn recorded.
- [ ] Spot checks: 100 applications = +300; 100 LC = +500; 5 assessments = +300; 1 offer = +200.
- [ ] Unlocks show as chosen in M5-07.
- [ ] Tests cover each family, a decrement-and-recross, and launch handling.

## Reuse notes

Counts already exist in `completionsDiary.ts` (L386–436) and `leetcode_daily`. One earn per achievement through `recordEarn`, with the `achievement` category that already exists in the ledger.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run build` passes
- [ ] `npm test` passes (known baseline aside)
- [ ] API typecheck: no new errors
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M5-11: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(Filled in when done.)
