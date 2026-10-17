# M3-04: Multi-goal weekly incrementer UI

**Status:** Done
**Blocked by:** —
**Scheduled with:** M3-03
**Implements:** R3.3, R3.8, R1.13, Q13 (from `../../spec.md`)
**Type:** build

## What to build

Replace the LeetCode-only This week aside with a **Check in** section: classic stepper (− N +) for **LC and each active custom** weekly progress. No apps ±. No today-LC.

Prototype reference: `/prototype/f11/habits/weekly` incrementer (variant A).

## Acceptance criteria

- [x] Adjacent (or stacked on narrow) incrementer lists LC + active customs with classic stepper chrome (Q13).
- [x] ± calls M3-02 progress API; UI updates done/target and column bars without full page reload.
- [x] **No apps** row in the incrementer (R3.8).
- [x] **No today-LC** tier controls here — today-LC stays on Habits strip Log LC (R1.13).
- [x] Decrement disabled at 0; increment allowed (overflow OK if column supports it).
- [x] Empty customs: still shows LC stepper alone.
- [x] Design system buttons/fields; no prototype imports.

## Edge cases

- Custom archived while panel open: row disappears on next fetch.
- Cap full: incrementer still works for existing actives.
- Concurrent ±: last write wins or refetch — avoid double-apply UX glitches.

## Tests

- [x] Manual: LC ± and custom ± update column fractions; apps unchanged except via tasks.
- [x] Manual: confirm no today-LC and no apps ± in this section.
- [x] `npm run check` passes.

## Reuse notes

LC ± via `patchProgressLeetcode` weekly + **medium** tier (F08 R5.17 single write path; untiered = medium). Customs via `stepCustomWeeklyProgress`. Layout reuses `.progress-week-split`. Q13 classic stepper.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Ticket status `Done`; board updated
- [x] Committed as `F11 M3-04: …`
- [x] End-of-task report given, including **Issues found**

## Verification notes

- `npm run check` clean.
- Check in sits beside the weekly column; stacks under 860px.
- LC Check in ± awards medium weekly points / updates today strip via full reload after each LC step.
