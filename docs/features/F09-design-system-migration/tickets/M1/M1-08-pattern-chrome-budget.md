# M1-08: Pattern — chrome budget and width behavior (Q16 remainder)

**Status:** In progress
**Blocked by:** (none) — complements M1-07; shell width already locked at 1100px
**Implements:** R1.2, Q16 (remainder)
**Type:** docs
**Scheduled with:** shared prototype with M1-07

## What to build

Lock remaining layout/chrome-budget rules now that shell width is 1100px: wrap vs scroll for chip/tab rows; two-column minimums / when to stack; gap scale; breakpoint scale. Record in `docs/design-system.md`. Paired **heights** are owned by M1-07.

## User lean (2026-10-15) — awaiting lock

- With a fixed shell width, **chips wrap**. Agreed direction (surface B).
- Contrast still available: nowrap + horizontal overflow (current Jobs / Past work).

## Proposed approach (for judgment)

- Shell stays **1100px**.
- L2 **filter chips wrap** (aligned with M1-06); do not use nowrap + horizontal scroll for filter chips.
- Dual columns: `minmax(16rem, 1fr) minmax(0, 1.2fr)`; **stack at 640px** — use the **same** breakpoint for compose/action wrap (eliminate Past work’s 860 wrap / 900 stack squeeze).
- Gaps: page stack **1rem**; dual-column gap **0.85rem**.
- Breakpoint scale collapses to **640 / 860 / 1100** (drop the soup of 520–900 one-offs where possible).
- Shortened labels only when a control cannot wrap; prefer wrap for chips.

**Alternative in the prototype:** nowrap + `overflow-x` (current Past work / Jobs chip behavior) for contrast.

Stress cases: Past work compose + columns; Jobs many location chips.

## Acceptance criteria

- [ ] Remaining Q16 items answered or explicitly deferred with reason
- [ ] Documented rules for chip/tab rows, dual-column mins, gaps, breakpoints
- [ ] Past work / Jobs called out as stress cases for width (not height)
- [ ] Prototype used: URL + verdict recorded (shared `/prototype/f09/layout`)
- [ ] `npm run check` passes (docs-only OK)

## Design questions (prototype tickets only)

1. Filter/chip rows: wrap (proposed) vs nowrap + overflow-x?
2. Dual-column stack breakpoint: 640 (proposed, aligned with compose wrap) vs keep 900?
3. Breakpoint scale: collapse to 640 / 860 / 1100?

Prototype URL: `/prototype/f09/layout` (`?width=` · `?frame=`; surface B for chips; A shares frame)

## Reuse notes

- M0-01 findings §14; M1-06 filter chips; M1-07 for height/overflow

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
