# M5-12: Today strip shows streaks

**Status:** Done
**Blocked by:** M5-10, M5-07, M5-14
**Implements:** R5.27 (from `../../spec.md`)
**Type:** build

## What to build

The today strip on Home and Progress ([`TodayStrip.tsx`](../../../../../apps/web/src/features/progress/TodayStrip.tsx)) replaces today's `x/3 apps` and `x/3 LC` counts with the current apps and LC **day streaks**, as designed in M5-07.

Follow [`/prototype/f08/streaks/today-strip?variant=D`](../../../../../apps/web/src/prototype/f08-streaks/TodayStripStreakPrototypePage.tsx):

- Two streak pills (Apps, LC): large day-streak count, label “day streak”, points line, done/pending mark.
- **✓** (mint/green) when today already counts; **−** (purple) when not yet today.
- Points: `+N today` when today counts (`N = min(20, 2 × length)` per R5.25); otherwise **`+0 today`**. No “if you continue” / “to start” copy.
- A streak starts at **1** on the first qualifying action of a day (no separate minimum).
- **No** reflection badges on the strip. Deep-work badges already gone (M5-14).

The heatmaps keep their 3-per-day scale. Streak lengths and `todayCounts` come from `GET /progress/today` (M5-10).

## Acceptance criteria

- [x] Home and Progress both show Apps and LC day-streak pills per M5-07 D (✓ / −, `+N` or `+0 today`).
- [x] Logging the first solve or application of the day updates the strip without a reload.
- [x] No reflection badges on the strip.
- [x] Heatmaps unchanged.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F08 M5-12: …`
- [x] End-of-task report given, including **Issues found**

## Verification notes

Commit: see board. Uses `today.streaks` from M5-10; Home/Progress refresh paths unchanged. Points line matches R5.25 (`min(20, 2×length)` when `todayCounts`, else 0).
