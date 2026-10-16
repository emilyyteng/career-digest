# M1-12: Modal chrome anatomy

**Status:** Done
**Blocked by:** M1-02
**Implements:** R.4, R1.1
**Type:** build

## What to build

Standardize modal **inner anatomy** on top of `ModalLayer`: header, body, footer; secondary then primary actions; sizes from Button primitives; flat secondary (no shadow). Document in `design-system.md`. Migrate one or two representative dialogs if needed to prove the pattern; do not rewrite every modal in the app.

## Acceptance criteria

- [x] Anatomy documented (structure + button order + which Button variants)
- [x] Shared `ModalHeader` / `ModalBody` / `ModalFooter` helpers; CompleteWorkModal + ModalLayer discard (+ Add-app discard) as references
- [x] Still uses `ModalLayer` only — no hand-rolled backdrops
- [x] `npm run check` passes

## Design questions (prototype tickets only)

n/a — appearance follows M0; structure is the M1 lock

## Reuse notes

- `ModalLayer.tsx`; M1-02 `Button`; new `ui/ModalChrome.tsx`

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M1-12: …`
- [x] End-of-task report given

## Verification notes

Helpers in `apps/web/src/ui/ModalChrome.tsx`. Documented under Patterns → Modal anatomy. Achievement unlock still bypasses ModalLayer (known debt, not fixed here).

Commit below.
