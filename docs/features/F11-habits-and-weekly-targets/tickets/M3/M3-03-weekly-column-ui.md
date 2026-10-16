# M3-03: Progress weekly goals column UI

**Status:** Draft
**Blocked by:** M3-02, M2-03
**Implements:** R3.6–R3.7, R3.9, R.7, Q14 (from `../../spec.md`)
**Type:** build

## What to build

Production weekly goals **column** on Progress → This week: apps + LC + customs, + create, Active/Archived ChromeTabs, ghost archived, per-custom pencil (rename/archive+confirm), near-label target stepper for LC + customs.

Prototype reference: `/prototype/f11/habits/weekly` column.

## Acceptance criteria

- [ ] Column shows apps, LC, then active customs in creation order with done/target, pace, bar, weeks-in-a-row flame when ≥ 2 (R3.9).
- [ ] **+** creates custom (name + target, default 3); blocked at cap with clear message (R3.7, R.7).
- [ ] ChromeTabs Active / Archived; Archived = customs only; apps/LC stay on Active; last restore → Active (Q14 ghost).
- [ ] Custom pencil → rename/archive ModalLayer; Archive danger + confirm; target **not** edited in pencil modal.
- [ ] Near-label **Target** stepper for LC and each custom (R3.6); apps have no target stepper/pencil.
- [ ] Apps copy notes progress from application tasks only (no ± affordance in column).
- [ ] Ghost stamp archived rows with Restore; restore-at-cap message.
- [ ] Design system compliant; no prototype imports.

## Edge cases

- Empty customs: + visible; Archived disabled.
- Three customs: + disabled/blocked.
- Narrow layout: column scrolls inside fixed-height hub if needed (R.9).

## Tests

- [ ] Manual checklist: create, rename, archive+confirm, restore at/under cap, target stepper, Active/Archived, flame at ≥2 (use seed/API).
- [ ] `npm run check` passes.

## Reuse notes

[`WeeklyGoalsBlock.tsx`](../../../../../apps/web/src/features/progress/WeeklyGoalsBlock.tsx); M2 strip ChromeTab/ghost/modal patterns; M3-02 API.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Ticket status `Done`; board updated
- [ ] Committed as `F11 M3-03: …`
- [ ] End-of-task report given, including **Issues found**

## Verification notes

_(filled when done)_
