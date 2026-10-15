# M1-10: Pattern — EarnFlash / notice placement (Q10 / R.9)

**Status:** Draft
**Blocked by:** (none)
**Implements:** R.9, R1.2, Q10
**Type:** docs
**Scheduled with:** optional spike/prototype if portal vs toast needs a trial

## What to build

Lock how `EarnFlash` (and whether the same rule applies to `OneTimeNotice`) stays in the user’s viewport near the action — not only at a scrolled-away page top. Document in `design-system.md` Banner patterns. Implementation on Tasks/Progress hosts may be a small follow in this ticket or a linked apply ticket; full Tasks compaction remains M2.

## Acceptance criteria

- [ ] Q10 answered (mechanism chosen)
- [ ] Banner patterns section updated; R.9 satisfied at the documentation level
- [ ] Clear statement whether `OneTimeNotice` shares the rule
- [ ] If code spike included: behaves on at least one host without breaking ModalLayer rules
- [ ] `npm run check` passes

## Design questions (prototype tickets only)

1. Portal near control vs sticky/toast vs scroll-into-view of top flash?

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
