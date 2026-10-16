# M1-10: Pattern — EarnFlash / notice placement (Q10 / R.9)

**Status:** Done
**Blocked by:** (none)
**Implements:** R.9, R1.2, Q10
**Type:** docs
**Scheduled with:** shared prototype with M1-09 / M1-11 (`/prototype/f09/patterns`)

## What to build

Lock how `EarnFlash` (and whether the same rule applies to `OneTimeNotice`) stays in the user’s viewport near the action — not only at a scrolled-away page top. Document in `docs/design-system.md` Banner patterns. Host apply may follow in M2 or a linked apply ticket.

## Acceptance criteria

- [x] Q10 answered (mechanism chosen)
- [x] Banner patterns section updated; R.9 satisfied at the documentation level
- [x] Clear statement whether `OneTimeNotice` shares the rule (**no**)
- [x] Prototype used: URL + verdict recorded
- [x] `npm run check` passes (docs-only OK)

## Design questions (prototype tickets only)

1. Near control vs toast vs scroll-to top? → **near control; toast fallback**
2. Does `OneTimeNotice` share the rule? → **no** (section-top)

Prototype URL: `/prototype/f09/patterns` · surface **B**

## Reuse notes

- `EarnFlash`, `OneTimeNotice`, Tasks / Progress hosts

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M1-10: …`
- [x] End-of-task report given

## Verification notes

**2026-10-15 verdicts:** EarnFlash near control; sticky viewport toast as fallback; OneTimeNotice does not share the rule.

Prototype exploration: `dab1805`. Lock commit below.

Commit: `e25943c`
