# M5-13: Completion flourish

**Status:** Draft (only if Q7 keeps it after M5-07)
**Blocked by:** M5-07
**Implements:** R5.2 (from `../../spec.md`)
**Type:** build

## What to build

If the M5-07 verdict keeps the flourish: completing work triggers the chosen visible, dynamic effect, not a plain toast, with no affirmations. Triggers and its relationship to `EarnFlash` come from the verdict. Respects reduced motion.

If the verdict drops it, close this ticket as won't-do, and mark R5.2 dropped in the spec.

## Acceptance criteria

(Finalize after M5-07.)

- [ ] Fires on exactly the chosen events, once per event.
- [ ] Reduced-motion users get a non-animated equivalent.
- [ ] No new dependencies unless agreed.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run build` passes
- [ ] Follows `docs/design-system.md`
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M5-13: …`
- [ ] End-of-task report given, including **Issues found**

## Verification notes

(Filled in when done.)
