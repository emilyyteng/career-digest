# M2-02: Strip Add reflection + Log LC

**Status:** Done
**Blocked by:** (none — M2-01 Done)
**Implements:** R1.11–R1.14, R1.13, Q12 (from `../../spec.md`)
**Type:** build

## What to build

Strip foot actions from M0-01: **Add reflection** (ModalLayer: link, body, lane) and **Log LC** disclosure (classic today tiered ±). Today-LC must not live in the weekly incrementer column.

Prototype reference: `/prototype/f11/habits/strip` foot band.

## Acceptance criteria

- [x] **Add reflection** button (label + flipped pencil icon to the right) on the habits band, right-aligned with Log LC (when shown), above Update progress on Home.
- [x] Opens `ModalLayer` with **link** (same option set as Progress reflection compose), **body**, **lane**; no notes list, no apps list (R1.11).
- [x] Successful submit creates a reflection for **today** via existing reflection APIs; modal closes; Past work remains the full day list.
- [x] **Log LC** disclosure (text + bottom caret; underline stays under whole control when open): expands/collapses today’s tiered ± (weekly/misc as today’s logger already does).
- [x] Label toggles Log LC ↔ Hide LC; panel sits under the habits band (not in weekly column).
- [x] Logging LC updates derived LC streak / today counts on the strip (existing leetcode + streak sync).
- [x] No today-LC controls added beside weekly LC / incrementer (R1.13).
- [x] Progress strip gets the same Add reflection + Log LC foot actions (Update progress remains Home-only).

## Edge cases

- Reflection with empty body: cannot submit (or API rejects — match compose rules).
- Dirty modal discard: use ModalLayer dirty/discard behavior.
- Log LC open, then switch to Archived: panel may hide or stay — pick one and keep strip usable (prefer hide when leaving Active).
- LC decrement at zero disabled per existing logger rules.

## Tests

- [x] Manual or UI test: open reflection modal, submit, see reflection on Past work today.
- [x] Manual: Log LC +/− updates LC pill completed-today / streak.
- [x] Confirm weekly goals / This week aside (pre-M3) does not gain today-LC.
- [x] `npm run check` passes.

## Reuse notes

[`LeetcodeLogger`](../../../../../apps/web/src/features/progress/LeetcodeLogger.tsx); [`WorkLinkFields`](../../../../../apps/web/src/features/progress/ReflectionAccordion.tsx) / `LaneChips`; `ModalLayer`, `TextAreaField`. Log LC hides when switching to Archived.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Ticket status `Done`; board updated
- [x] Committed as `F11 M2-02: …`
- [x] End-of-task report given, including **Issues found**

## Verification notes

`npm run check` / API tests passed (371). Manual checklist: Add reflection modal → Past work; Log LC ± updates strip; panel hides on Archived; weekly column unchanged. Related: F09 M4-02 for negative-points flash standard. Commit hash in board follow-up.
