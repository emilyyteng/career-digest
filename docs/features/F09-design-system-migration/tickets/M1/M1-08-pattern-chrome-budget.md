# M1-08: Pattern — chrome budget and width behavior (Q16 remainder)

**Status:** Draft
**Blocked by:** (none) — complements M1-07; shell width already locked at 1100px
**Implements:** R1.2, Q16 (remainder)
**Type:** docs

## What to build

Lock remaining layout/chrome-budget rules now that shell width is 1100px: wrap vs scroll vs truncate vs shortened labels for tab/chip rows; two-column minimums / when to stack; stack gap scale; breakpoint scale. Record in `docs/design-system.md`. Paired **heights** are owned by M1-07 — do not re-litigate them here.

## Acceptance criteria

- [ ] Remaining Q16 items answered or explicitly deferred with reason
- [ ] Documented rules for nowrap chip/tab rows, dual-column mins, gaps, breakpoints
- [ ] Past work / Jobs called out as stress cases for width (not height)
- [ ] `npm run check` passes (docs-only OK)

## Design questions (prototype tickets only)

n/a unless a stress prototype is needed; prefer M0 lab width samples + inventory

## Reuse notes

- M0-01 findings §14; lab width-stress frame
- M1-07 for height/overflow

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M1-08: …`
- [ ] End-of-task report given

## Verification notes

(filled when done)
