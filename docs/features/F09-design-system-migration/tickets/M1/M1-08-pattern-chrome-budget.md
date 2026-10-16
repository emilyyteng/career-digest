# M1-08: Pattern — chrome budget and width behavior (Q16 remainder)

**Status:** Done
**Blocked by:** (none)
**Implements:** R1.2, Q16 (remainder)
**Type:** docs
**Scheduled with:** shared prototype with M1-07

## What to build

Lock remaining layout/chrome-budget rules now that shell width is 1100px: wrap vs scroll for chip rows; two-column minimums / when to stack; gap scale; breakpoint scale. Record in `docs/design-system.md`. Paired **heights** are owned by M1-07.

## Acceptance criteria

- [x] Remaining Q16 items answered
- [x] Documented rules for chip/tab rows, dual-column mins, gaps, breakpoints
- [x] Past work / Jobs called out as stress cases for width (not height)
- [x] Prototype used: URL + verdict recorded (shared `/prototype/f09/layout`)
- [x] `npm run check` passes (docs-only OK)

## Design questions (prototype tickets only)

1. Filter/chip rows: wrap vs nowrap + overflow-x? → **wrap**
2. Dual-column stack breakpoint: 640 vs 900? → **640** (aligned with compose wrap)
3. Breakpoint scale: collapse to 640 / 860 / 1100? → **yes**

Prototype URL: `/prototype/f09/layout` (keep as reference while useful)

## Reuse notes

- M0-01 findings §14; M1-06 filter chips; M1-07 for height/overflow

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M1-08: …`
- [x] End-of-task report given

## Verification notes

**2026-10-15 verdicts:**

| Axis | Lock |
|------|------|
| Chips | **Wrap** |
| Dual columns | `minmax(16rem, 1fr) minmax(0, 1.2fr)`; stack at **640px** |
| Gaps | Page **1rem**; column **0.85rem** |
| Breakpoints | **640 / 860 / 1100** |

Shared prototype with M1-07; exploration commit `82a4fdd`; lock commit below.

Typecheck + web build pass. API tests: unrelated failures in `workTime.api.test.ts` / `demo.api.test.ts` (reported; not this ticket).

Commit: `ec258aa`
