# M3-03: Progress weekly goals column UI

**Status:** Done
**Blocked by:** —
**Implements:** R3.6–R3.7, R3.9, R.7, Q14 (from `../../spec.md`)
**Type:** build

## What to build

Production weekly goals **column** on Progress → This week: apps + LC + customs, + create, Active/Archived ChromeTabs, ghost archived, per-custom pencil (rename/archive+confirm), near-label target stepper for LC + customs.

Prototype reference: `/prototype/f11/habits/weekly` column.

## Acceptance criteria

- [x] Column shows apps, LC, then active customs in creation order with done/target, pace, bar, weeks-in-a-row flame when ≥ 2 (R3.9).
- [x] **+** creates custom (name + target, default 3); blocked at cap with clear message (R3.7, R.7).
- [x] ChromeTabs Active / Archived; Archived = customs only; apps/LC stay on Active; last restore → Active (Q14 ghost).
- [x] Custom pencil → rename/archive ModalLayer; Archive danger + confirm; target **not** edited in pencil modal.
- [x] Near-label **Target** stepper for LC and each custom (R3.6); apps have no target stepper/pencil.
- [x] Apps copy notes progress from application tasks only (no ± affordance in column).
- [x] Ghost stamp archived rows with Restore; restore-at-cap message.
- [x] Design system compliant; no prototype imports.

## Edge cases

- Empty customs: + visible; Archived disabled.
- Cap (6): + disabled/blocked.
- Narrow layout: column scrolls inside fixed-height hub if needed (R.9).

## Tests

- [x] Manual checklist: create, rename, archive+confirm, restore at/under cap, target stepper, Active/Archived, flame at ≥2 (use seed/API).
- [x] `npm run check` passes.

## Reuse notes

[`WeeklyGoalsBlock.tsx`](../../../../../apps/web/src/features/progress/WeeklyGoalsBlock.tsx); M2 strip ChromeTab/ghost/modal patterns (`habits-pencil`, `habits-arch-stamp`, `habits-btn-danger`, ModalLayer); M3-02 API client helpers.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Ticket status `Done`; board updated
- [x] Committed as `F11 M3-03: …`
- [x] End-of-task report given, including **Issues found**

## Verification notes

- `npm run check` clean (check:ui, typecheck, build, 389 API tests).
- LC target input replaced with − N + stepper (matches R3.6 / prototype); LC label edit unchanged.
- Active order forced to apps → LC → customs (API still returns LC then apps).
