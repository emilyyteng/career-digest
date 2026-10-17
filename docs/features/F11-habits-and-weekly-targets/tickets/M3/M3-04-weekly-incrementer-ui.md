# M3-04: Multi-goal weekly incrementer UI

**Status:** Done
**Blocked by:** —
**Scheduled with:** M3-03
**Implements:** R3.3, R3.8, R1.13, Q13 (from `../../spec.md`)
**Type:** build

## What to build

Replace the LeetCode-only This week aside with a **Check in** section: classic stepper (− N +) for **each active custom** weekly progress. LC progress is logged only via Habits strip Log LC (daily control). No apps ±. No today-LC in Check in.

Prototype reference: `/prototype/f11/habits/weekly` incrementer (variant A), refined: LC ± removed from Check in; Today / This week tier lines live under Weekly LC in the column.

## Acceptance criteria

- [x] Adjacent (or stacked on narrow) incrementer lists active customs with classic stepper chrome (Q13).
- [x] ± calls M3-02 progress API; UI updates done/target and column bars without full page reload.
- [x] **No apps** row in the incrementer (R3.8).
- [x] **No LC ±** in Check in — LC updates via Log LC only; Weekly LC shows read-only Today / This week tier lines (R1.13).
- [x] Decrement disabled at 0; increment allowed (overflow OK if column supports it).
- [x] Empty customs: empty state copy (no LC stepper).
- [x] Design system buttons/fields; no prototype imports.
- [x] Weekly goals + Check in cards share a fixed **28rem** height.

## Edge cases

- Custom archived while panel open: row disappears on next fetch.
- Cap full: incrementer still works for existing actives.
- Concurrent ±: last write wins or refetch — avoid double-apply UX glitches.

## Tests

- [x] Manual: LC ± and custom ± update column fractions; apps unchanged except via tasks.
- [x] Manual: confirm no today-LC and no apps ± in this section.
- [x] `npm run check` passes.

## Reuse notes

Customs via `stepCustomWeeklyProgress`. LC tier lines via `lcCountsLine` + `progress/today` (`leetcodeTiers` / `leetcodeWeekTiers`). Layout reuses `.progress-week-split`. Q13 classic stepper for customs only.

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
- Check in sits beside the weekly column; stacks under 860px; both cards fixed at 28rem.
- Follow-up: removed LC ± from Check in; restored Today / This week LC tier lines under Weekly LC.
