# M8-05: Lifetime surface

**Status:** Blocked
**Blocked by:** M8-01, M8-02
**Implements:** R8.12 (from `../../spec.md`); placement for R5.26
**Type:** build

## What to build

Implement `/progress/lifetime` as an accumulation record (R8.12–R8.14):

- Header with large LC / apps / minutes / seeds earned, plus secondary stats including **days worked** (distinct days with any completion log)
- **Seeds/day** activity chart; range control **inside** the chart container
- Application + technical **ProgressHeatmap** side by side (existing colors)
- **Full** achievements list

No Rewards purse chrome, Earnings log, or pull UI.

## Acceptance criteria

- [ ] `/progress/lifetime` matches R8.12–R8.14 (header, chart, side-by-side heatmaps, full achievements)
- [ ] Chart range is controlled in the chart container; metric is seeds/day
- [ ] Days worked counts distinct completion-log days
- [ ] No Rewards spending chrome on this surface
- [ ] Follows `docs/design-system.md`

## Reuse notes

`AchievementsPanel`, completions diary stats (`getProgressCompletions` / diary stats), `ProgressHeatmap`. Prototype: `/prototype/f08/progress` (Lifetime pages).

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M8-05: …`
- [ ] End-of-task report given, including tests added and **Issues found**
- [ ] After this ticket (and M8-03–M8-04) are Done, delete `f08-progress` when no open ticket references it (or in F08 cleanup) per RX.3

## Verification notes

(Filled in when done.)
