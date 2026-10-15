# M1-12: Modal chrome anatomy

**Status:** Draft
**Blocked by:** M1-02
**Implements:** R.4, R1.1
**Type:** build

## What to build

Standardize modal **inner anatomy** on top of `ModalLayer`: header, body, footer; secondary then primary actions; sizes from Button primitives; flat secondary (no shadow). Document in `design-system.md`. Migrate one or two representative dialogs if needed to prove the pattern; do not rewrite every modal in the app.

## Acceptance criteria

- [ ] Anatomy documented (structure + button order + which Button variants)
- [ ] At least one production modal updated as reference (or a shared modal chrome helper)
- [ ] Still uses `ModalLayer` only — no hand-rolled backdrops
- [ ] `npm run check` passes

## Design questions (prototype tickets only)

n/a — appearance follows M0; structure is the M1 lock

## Reuse notes

- `ModalLayer.tsx`; M1-02 Button primitives; lab modal sample

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M1-12: …`
- [ ] End-of-task report given

## Verification notes

(filled when done)
