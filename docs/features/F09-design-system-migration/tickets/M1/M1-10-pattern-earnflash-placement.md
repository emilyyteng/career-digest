# M1-10: Pattern — EarnFlash / notice placement (Q10 / R.9)

**Status:** In progress
**Blocked by:** (none)
**Implements:** R.9, R1.2, Q10
**Type:** docs
**Scheduled with:** shared prototype with M1-09 / M1-11 (`/prototype/f09/patterns`)

## What to build

Lock how `EarnFlash` (and whether the same rule applies to `OneTimeNotice`) stays in the user’s viewport near the action — not only at a scrolled-away page top. Document in `docs/design-system.md` Banner patterns. Implementation on Tasks/Progress hosts may be a small follow in this ticket or a linked apply ticket; full Tasks compaction remains M2.

## Proposed approach (for judgment)

- **EarnFlash:** render **near the control that earned** (inline under the row / action cluster, or a small portal anchored to that control). Must appear in the current viewport without scrolling to the page top.
- **Fallback:** sticky viewport toast when the action has no stable anchor (e.g. after modal close).
- **Reject as default:** page-top-only flash; scroll-into-view that jerks the page.
- **OneTimeNotice:** does **not** share the near-control rule — event/result chrome may stay at the host section top (preferably still in that section’s first viewport).

## Acceptance criteria

- [ ] Q10 answered (mechanism chosen)
- [ ] Banner patterns section updated; R.9 satisfied at the documentation level
- [ ] Clear statement whether `OneTimeNotice` shares the rule
- [ ] Prototype used: URL + verdict recorded
- [ ] If code spike included: behaves on at least one host without breaking ModalLayer rules
- [ ] `npm run check` passes

## Design questions (prototype tickets only)

1. Portal/inline near control vs sticky/toast vs scroll-into-view of top flash?
2. Does `OneTimeNotice` share the EarnFlash placement rule?

Prototype URL: `/prototype/f09/patterns` · surface **B** (`?flash=`) — click Complete after scrolling

## Reuse notes

- `EarnFlash`, `OneTimeNotice`, Tasks / Progress hosts

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M1-10: …`
- [ ] End-of-task report given

## Verification notes

(filled when done)
