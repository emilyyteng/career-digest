# M5-12: Today strip shows streaks

**Status:** Draft (waits on M5-07, M5-10, M5-14)
**Blocked by:** M5-10, M5-07, M5-14
**Implements:** R5.27 (from `../../spec.md`)
**Type:** build

## What to build

The today strip on Home and Progress ([`TodayStrip.tsx` L40–67](../../../../../apps/web/src/features/progress/TodayStrip.tsx)) replaces today's `x/3 apps` and `x/3 LC` counts with the current apps and LC streaks, as designed in M5-07. The deep-work badges are already gone (M5-14). The heatmaps keep their 3-per-day scale.

## Acceptance criteria

(Draft. Finalize after M5-07.)

- [ ] Home and Progress both show the current apps and LC streak lengths, and whether today already counts.
- [ ] Logging the first solve or application of the day updates the strip without a reload.
- [ ] Heatmaps unchanged.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run build` passes
- [ ] `npm test` passes (known baseline aside)
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M5-12: …`
- [ ] End-of-task report given, including **Issues found**

## Verification notes

(Filled in when done.)
