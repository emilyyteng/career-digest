# M2-03: This week remodel around Habits strip

**Status:** Draft
**Blocked by:** M2-01
**Scheduled with:** M2-02 (may land before/after; strip must exist)
**Implements:** R1.12, R.9 (from `../../spec.md`)
**Type:** build

## What to build

Remodel Progress → **This week** into the habits hub shell: compact week/month pulse, Habits strip, and a layout slot for the existing weekly goals block (until M3 replaces column + incrementer). Remove Next achievements and the Daily progress aside.

## Acceptance criteria

- [ ] Remove `NextAchievements` from This week (full achievements stay on Lifetime) (R1.12).
- [ ] Remove Daily progress aside (reflection compose, notes list, apps list) from This week (R1.12).
- [ ] Keep week/month **pulse** cards, compact, above the habits layout (R1.12).
- [ ] Mount production Habits strip (from M2-01; foot actions if M2-02 Done).
- [ ] Page uses design-system containerization / fixed-height-friendly split suitable for later weekly column + incrementer (R.9) — do not wait on F09 Progress migration.
- [ ] Existing weekly goals block (apps/LC) still reachable on This week until M3-03/M3-04 land (temporary placement OK; document in verification notes).
- [ ] No today-LC buried only in Past work — strip Log LC (M2-02) is the home; do not reintroduce today-LC solely inside a weekly aside.

## Edge cases

- Narrow viewports: pulse, strip, and weekly block stack without horizontal overflow (match design-system wrap rules).
- Empty pulse / empty weekly goals: page still coherent with strip present.

## Tests

- [ ] Manual: This week has no Next achievements, no Daily progress compose/notes/apps aside.
- [ ] Manual: pulse + Habits strip present; Lifetime achievements unchanged.
- [ ] `npm run check` passes.

## Reuse notes

[`ThisWeekPage.tsx`](../../../../../apps/web/src/features/progress/ThisWeekPage.tsx); pulse components already on the page; Habits strip from M2-01. Prototype `/prototype/f11/habits/strip` Progress mock for composition reference.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Ticket status `Done`; board updated
- [ ] Committed as `F11 M2-03: …`
- [ ] End-of-task report given, including **Issues found**

## Verification notes

_(filled when done)_
