# M8-05: Lifetime surface

**Status:** Done
**Blocked by:** (none)
**Implements:** R8.12, R8.13, R8.14 (from `../../spec.md`); placement for R5.26
**Type:** build

## What to build

Implement `/progress/lifetime` as an accumulation record (R8.12–R8.14):

- Header with large LC / apps / minutes / seeds earned, plus secondary stats including **days worked** (distinct days with any completion log)
- **Seeds/day** activity chart; range control **inside** the chart container
- Application + technical heatmaps **side by side**, colored per R8.13 (raw apps / raw LC, unclamped proportional gradient; no effort checkmarks)
- Seeds/day chart **above** the heatmaps; range control inside the chart container
- **Full** achievements list

No Rewards purse chrome, Earnings log, or pull UI. Reuse the intensity scale from M8-04 if already built.

## Acceptance criteria

- [x] `/progress/lifetime` matches R8.12–R8.14 (header, chart above heatmaps, side-by-side heatmaps, full achievements)
- [x] Chart range in-container; metric seeds/day
- [x] Heatmap colors ∝ raw lane counts (not clamped to 3; not seeds)
- [x] Days worked counts distinct completion-log days
- [x] No Rewards spending chrome on this surface
- [x] Follows `docs/design-system.md`

## Reuse notes

`AchievementsPanel`, `ProgressHeatmap` + M8-04 `intensityScale`, new `GET /api/progress/lifetime`. Prototype `/prototype/f08/progress` kept until F08 cleanup (RX.3); no production import.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F08 M8-05: …`
- [x] End-of-task report given, including tests added and **Issues found**
- [x] Prototype retained for now (no open ticket needs it; delete in F08 cleanup per RX.3)

## Verification notes

- Header: LC / apps / minutes / seeds + tasks, interviews, reflections, days worked.
- Chart: seeds/day with in-container 1 week / 1 month / ~3 months; spends excluded from seeds.
- Heatmaps side by side above achievements; raw intensity from M8-04.
- API tests in `lifetime.api.test.ts`. `npm run check` green (345 tests). Board hash in follow-up.
- Commit: `9345c47`.
