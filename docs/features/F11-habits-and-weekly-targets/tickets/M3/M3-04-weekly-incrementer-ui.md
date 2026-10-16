# M3-04: Multi-goal weekly incrementer UI

**Status:** Draft
**Blocked by:** M3-02, M2-03
**Scheduled with:** M3-03
**Implements:** R3.3, R3.8, R1.13, Q13 (from `../../spec.md`)
**Type:** build

## What to build

Replace the LeetCode-only This week aside with a **Check in** section: classic stepper (− N +) for **LC and each active custom** weekly progress. No apps ±. No today-LC.

Prototype reference: `/prototype/f11/habits/weekly` incrementer (variant A).

## Acceptance criteria

- [ ] Adjacent (or stacked on narrow) incrementer lists LC + active customs with classic stepper chrome (Q13).
- [ ] ± calls M3-02 progress API; UI updates done/target and column bars without full page reload.
- [ ] **No apps** row in the incrementer (R3.8).
- [ ] **No today-LC** tier controls here — today-LC stays on Habits strip Log LC (R1.13).
- [ ] Decrement disabled at 0; increment allowed (overflow OK if column supports it).
- [ ] Empty customs: still shows LC stepper alone.
- [ ] Design system buttons/fields; no prototype imports.

## Edge cases

- Custom archived while panel open: row disappears on next fetch.
- Cap full: incrementer still works for existing actives.
- Concurrent ±: last write wins or refetch — avoid double-apply UX glitches.

## Tests

- [ ] Manual: LC ± and custom ± update column fractions; apps unchanged except via tasks.
- [ ] Manual: confirm no today-LC and no apps ± in this section.
- [ ] `npm run check` passes.

## Reuse notes

Existing LC weekly logging path if any; M0-02 classic stepper layout; strip Log LC remains separate (M2-02).

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Ticket status `Done`; board updated
- [ ] Committed as `F11 M3-04: …`
- [ ] End-of-task report given, including **Issues found**

## Verification notes

_(filled when done)_
