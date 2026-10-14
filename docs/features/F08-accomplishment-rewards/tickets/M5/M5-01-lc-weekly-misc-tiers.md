# M5-01: Log LeetCode as weekly or misc, by difficulty tier, through one write path

**Status:** Built, awaiting R5.10 (2026-10-13)
**Blocked by:** M5-05, done (build order, 2026-10-13: both change `setLeetcodeDaily`; M5-05 removes the instant weekly bonus and the cap first, so this ticket writes the single path once)
**Implements:** R5.10, R5.14, R5.17, R5.20, R8.3 (function only; visual polish stays in M8) (from `../../spec.md`)
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
  - syncs LeetCode points at the tier's value (R5.20: easy +20, medium +30, hard +50), reversing on decrement
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

**Design (M5-06 verdict, Q1 variant A, 2026-10-13):** one control in the Progress LeetCode card: a weekly/misc switch (blue when active, per Interim decisions), then easy/medium/hard steppers showing today's per-tier counts. A decrement removes that tier, of the type the switch shows. It replaces both of today's steppers, so the weekly block's LC row becomes read-only. Reference: `/prototype/f08/weekly/lc-stepper`.

- **Stepper placement:** the new control lives in the Progress LeetCode card ([`ProgressPage.tsx` L485–492](../../../../../apps/web/src/features/progress/ProgressPage.tsx)). This ticket removes the weekly block's stepper ([`WeeklyGoalsBlock.tsx` L60–80](../../../../../apps/web/src/features/progress/WeeklyGoalsBlock.tsx)); the block's LC row keeps its count, bar, pace and target field, and M5-08 rebuilds the block later without touching LeetCode logging.
- **The switch:** weekly is selected when the page loads, and it stays as chosen while the page is open (Proposed).
- **Interim button classes (decided 2026-10-13):** this ticket adds the shared interim classes from `docs/design-system.md` → Interim decisions: a tinted purple primary, a ghost button, and a segmented toggle whose active option uses the goal-bar blue. They're built on `.secondary` so the global `button:not(...)` chain doesn't apply. M5-08, M5-09 and M5-02 reuse them. Log them in the F09 spec's Current behavior table for F09's pass.
- **R5.10 check:** before this ticket closes, the user logs a few solves of each type and tier on Progress and confirms that logging feels right with points.

## Acceptance criteria

- [ ] +1 and −1 on either type each call the same server function; there's no other code path that writes LeetCode counts or LeetCode points.
- [ ] +1 weekly raises today's count for the tier, weekly progress and points by one solve at its tier's value; +1 misc raises today's count for the tier and points only.
- [ ] Tier values: easy +20, medium +30, hard +50. The banner shows that amount, and −1 reverses the same amount.
- [ ] −1 removes one solve of the chosen tier and reverses that tier's points; no tier's count goes below 0.
- [ ] Misc −1 never changes weekly progress, even when it leaves the day's count below that day's weekly solves.
- [ ] Weekly progress can exceed the target.
- [ ] The points banner shows after every LeetCode change that moves points, from the Progress LeetCode card and from History.
- [ ] LeetCode 1 → 0 → 1 → 0 on one day: the banner shows each of the four changes (moved here from M4-03, 2026-10-13).
- [ ] History edits a day's count per tier, without a per-type control.
- [ ] Past days keep their existing points; no migration rewrites them.
- [ ] Progress has exactly one LeetCode logging control, in the LeetCode card: a weekly/misc switch and easy, medium and hard steppers showing today's per-tier counts. The weekly block has no stepper; its LC row still shows the count, bar, pace and target field, and updates without a reload after each change.
- [ ] A tier's − is disabled at 0. With weekly selected, − is also disabled when weekly progress is 0.
- [ ] The switch's active option uses the interim blue toggle; buttons use the interim classes, which are logged in the F09 spec.
- [ ] The day total (strip, heatmaps, Home) equals easy + medium + hard.
- [ ] R5.10: the user has tried logging with points on Progress and confirmed it feels right (or the changes they asked for are made).
- [ ] Tests cover both types, each tier, decrements, the day total, and that misc changes don't touch weekly progress.

## Reuse notes

- `syncLeetcodeDailyPoints` and `setLeetcodeDaily` become, or feed, the single write path.
- `LeetcodeStepper` ([`apps/web/src/features/progress/LeetcodeStepper.tsx`](../../../../../apps/web/src/features/progress/LeetcodeStepper.tsx)) is the existing control.
- Prototype reference: `apps/web/src/prototype/f08-weekly/LcStepperPrototypePage.tsx` (variant A; don't import it).
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

2026-10-13, built; the R5.10 check is still open.

- **Single path:** `PATCH /api/progress/leetcode` takes `{tier, delta: ±1, type: weekly|misc, date?}` and calls `changeLeetcode` (`progress.ts`), the only code that writes `leetcode_daily` or LeetCode points; `stepLcWeeklyProgress` (`weeklyGoals.ts`) is the only writer of LC weekly progress. The weekly LC route sets the target only and rejects `progressCount` (400). Checked by reading and by a search for writers.
- **Storage:** migration 030 adds `easy_count` and `hard_count` beside `count`; medium is the rest, so untiered days read as medium and keep their points with no rewrite.
- **Weekly is today only** (400 for another date); History edits per tier as misc, with no type switch.
- **Banner:** Progress shows `EarnFlash` after every change that moves points, on Today and History.
- **Tests (checked by running):** new `leetcode.api.test.ts` (14 tests) covers each tier's points and banner, weekly +1, misc +1 leaving weekly alone, −1 reversal and 409 at 0, misc −1 leaving weekly above the day, weekly −1 at 0 (409), no cap, past-date weekly 400 and History per-tier edits, 1 → 0 → 1 → 0, legacy days as medium, the day total across today, day detail and outcome, and input validation. `weeklyGoals.api.test.ts` replaces the R0.4 test; `pointsFormulas.test.ts` adds the tier formula.
- **UI:** `LeetcodeLogger.tsx` replaces `LeetcodeStepper.tsx` (deleted) and the weekly block's stepper. Checked by reading and the build, not in a browser.
- **From the R5.10 check (2026-10-13):**
  - The card adds `This week: N solved · e easy · m medium · h hard` under today's line (R5.32), Monday to today. `GET /progress/today` returns `leetcodeWeekTiers`, and each change returns `weekTiers`. Covered by a new test in `leetcode.api.test.ts`.
  - Fixed a slow, stale-looking stepper. Each click kept every button disabled until about four request rounds had finished, one after another (the full overview reload, then the day reloads). The banner also appeared before the counts changed, so a count briefly looked off by one. Now the counts, weekly progress and banner all update from the change's own response, the buttons free up as soon as it returns, and the rest of the page refreshes in the background, where only the latest refresh is applied. Checked by reading and the build, not in a browser.
  - Past LeetCode days aren't backfilled with points (user, 2026-10-13).
  - Day and week counts lines sit outside the LeetCode card, right-justified on the Progress panel; the card stays narrow with the weekly/misc switch and easy/medium/hard steppers left-aligned. On History, the "This day" counts line shows only while Edit this day is on (alongside the steppers); otherwise the card shows the compact solved/earned line (user, 2026-10-13).
- **Interim classes** (`ui-btn`, `ui-btn-primary`, `ui-btn-ghost`, `.is-active`, `ui-segmented`) are logged in the F09 Current behavior table.
