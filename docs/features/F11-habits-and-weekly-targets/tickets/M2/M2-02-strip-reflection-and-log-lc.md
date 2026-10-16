# M2-02: Strip Add reflection + Log LC

**Status:** Draft
**Blocked by:** M2-01
**Implements:** R1.11–R1.14, R1.13, Q12 (from `../../spec.md`)
**Type:** build

## What to build

Strip foot actions from M0-01: **Add reflection** (ModalLayer: link, body, lane) and **Log LC** disclosure (classic today tiered ±). Today-LC must not live in the weekly incrementer column.

Prototype reference: `/prototype/f11/habits/strip` foot band.

## Acceptance criteria

- [ ] **Add reflection** button (label + flipped pencil icon to the right) on the habits band, right-aligned with Log LC (when shown), above Update progress on Home.
- [ ] Opens `ModalLayer` with **link** (same option set as Progress reflection compose), **body**, **lane**; no notes list, no apps list (R1.11).
- [ ] Successful submit creates a reflection for **today** via existing reflection APIs; modal closes; Past work remains the full day list.
- [ ] **Log LC** disclosure (text + bottom caret; underline stays under whole control when open): expands/collapses today’s tiered ± (weekly/misc as today’s logger already does).
- [ ] Label toggles Log LC ↔ Hide LC; panel sits under the habits band (not in weekly column).
- [ ] Logging LC updates derived LC streak / today counts on the strip (existing leetcode + streak sync).
- [ ] No today-LC controls added beside weekly LC / incrementer (R1.13).
- [ ] Progress strip gets the same Add reflection + Log LC foot actions (Update progress remains Home-only).

## Edge cases

- Reflection with empty body: cannot submit (or API rejects — match compose rules).
- Dirty modal discard: use ModalLayer dirty/discard behavior.
- Log LC open, then switch to Archived: panel may hide or stay — pick one and keep strip usable (prefer hide when leaving Active).
- LC decrement at zero disabled per existing logger rules.

## Tests

- [ ] Manual or UI test: open reflection modal, submit, see reflection on Past work today.
- [ ] Manual: Log LC +/− updates LC pill completed-today / streak.
- [ ] Confirm weekly goals / This week aside (pre-M3) does not gain today-LC.
- [ ] `npm run check` passes.

## Reuse notes

[`LeetcodeLogger`](../../../../../apps/web/src/features/progress/LeetcodeLogger.tsx) or shared tier steppers; [`ReflectionCompose`](../../../../../apps/web/src/features/progress/ReflectionAccordion.tsx) / link options loaders from This week or Past work; `ModalLayer`, `LaneChips` / lane controls.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Ticket status `Done`; board updated
- [ ] Committed as `F11 M2-02: …`
- [ ] End-of-task report given, including **Issues found**

## Verification notes

_(filled when done)_
