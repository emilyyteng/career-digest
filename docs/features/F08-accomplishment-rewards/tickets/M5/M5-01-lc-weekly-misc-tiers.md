# M5-01: Log LeetCode as weekly or misc, by difficulty tier, through one write path

**Status:** Draft (open: spec Q32)
**Blocked by:** (none)
**Implements:** R5.14, R5.17, R5.20, R8.3 (function only; visual polish stays in M8) (from `../../spec.md`)
**Type:** build

## Found during (bug tickets only)

Replaces the weekly-stepper points bug found in the 2026-10-12 audit. The user chose to fix it by redesign in M5 (2026-10-13), and to build difficulty tiers in the same rework (2026-10-13, Q34).

## Evidence (bug tickets only)

Today the weekly stepper ([`WeeklyGoalsBlock.tsx` L60–80](../../../../../apps/web/src/features/progress/WeeklyGoalsBlock.tsx)) calls only `PATCH /api/weekly-goals/lc`. Its handler writes `leetcode_daily` directly ([`weeklyGoals.ts` L330–354](../../../../../apps/api/src/weeklyGoals.ts)) instead of going through `setLeetcodeDaily` ([`progress.ts` L503–572](../../../../../apps/api/src/progress.ts)). That skips:

- the LeetCode points sync ([`pointsAwards.ts` L160–210](../../../../../apps/api/src/pointsAwards.ts))
- the weekly check

The page then reloads the daily stepper ([`ProgressPage.tsx` L461–474](../../../../../apps/web/src/features/progress/ProgressPage.tsx)), so the count looks synced, but no points or banner appear. In the other direction, daily stepper clicks never move weekly progress.

## What to build

LeetCode solves come in two types, **weekly** (part of the week's planned problems) and **misc** (everything else), and three difficulty tiers: easy, medium, hard. The user can increment or decrement solves of either type.

- Every change, of either type, goes through one server function that:
  - updates the day's LeetCode count
  - syncs LeetCode points at the tier's value (Q32), reversing on decrement
  - returns the points change so the UI can show the banner
- A weekly change also updates the week's LC progress. That progress can exceed the target (R5.14).
- **Storage (user, 2026-10-13):** the type is not stored per day. A day stores its LeetCode counts per tier; the week stores its LC progress, and the week-close record keeps count out of target (R5.8).
- **Decrements** remove one solve of a chosen tier and reverse that tier's points. A misc −1 lowers only the day's count, never weekly progress. A day's count can end up below that day's weekly solves; that's accepted.
- **History** can edit a past day's count per tier, but never per type.
- **Past data:** existing counts aren't migrated and keep the points they earned (R5.20). Wherever past days are shown by tier, they count as medium.
- The day's LeetCode total, used by the Progress strip, heatmaps and Home, includes both types.
- The UI shows the new counts and the points banner immediately, with no reload needed.
- The one-way weekly-to-daily copy (R0.4) is removed.
- The stepper shows the type and tier clearly and is usable; making it visually appealing is M8 (R8.3).

## Acceptance criteria

(Draft. Finalize after Q32.)

- [ ] +1 and −1 on either type each call the same server function; there's no other code path that writes LeetCode counts or LeetCode points.
- [ ] +1 weekly raises today's count for the tier, weekly progress and points by one solve at its tier's value; +1 misc raises today's count for the tier and points only.
- [ ] −1 removes one solve of the chosen tier and reverses that tier's points; no tier's count goes below 0.
- [ ] Misc −1 never changes weekly progress, even when it leaves the day's count below that day's weekly solves.
- [ ] Weekly progress can exceed the target.
- [ ] The points banner shows after every LeetCode change that moves points, wherever the stepper is (Progress and Home). Today no LeetCode change shows one.
- [ ] LeetCode 1 → 0 → 1 → 0 on one day: the banner shows each of the four changes (moved here from M4-03, 2026-10-13).
- [ ] History edits a day's count per tier, without a per-type control.
- [ ] Past days keep their existing points; no migration rewrites them.
- [ ] Tests cover both types, each tier, decrements, the day total, and that misc changes don't touch weekly progress.

## Design questions (prototype tickets only)

To be settled in the M5 design pass:

1. How type × tier appears in the Progress weekly block and the daily strip, with the fewest clicks per solve.
2. How a decrement picks its tier.

## Reuse notes

- `syncLeetcodeDailyPoints` and `setLeetcodeDaily` become, or feed, the single write path.
- `LeetcodeStepper` ([`apps/web/src/features/progress/LeetcodeStepper.tsx`](../../../../../apps/web/src/features/progress/LeetcodeStepper.tsx)) is the existing control.
- `EarnFlash` is the banner.
- Coordinate with M4-02 and M4-03, which change how reversed earns are stored and fix re-raising a day's count from 0. Keep M4-03's LeetCode acceptance criteria passing.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M5-01: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(Filled in when done.)
