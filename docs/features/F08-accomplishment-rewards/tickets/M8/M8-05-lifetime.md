# M8-05: Lifetime surface

**Status:** Blocked
**Blocked by:** M8-01, M8-02
**Implements:** R8.12 (from `../../spec.md`); placement for R5.26
**Type:** build

## What to build

Implement `/progress/lifetime` as an accumulation record (R8.12): substantial all-time header (per Q69), **full** achievements list, prep heatmaps (no effort checkmarks; intensity per Q67–Q68), and activity fluctuation chart if R8.14 is Established after M8-01.

No Rewards purse chrome, Earnings log, or pull UI — those stay on Rewards. A Progress statistic that *uses* seeds earned as a time-series metric is allowed if Q67 locks it (distinct from Rewards spending chrome).

## Acceptance criteria

- [ ] `/progress/lifetime` feels like an accumulation/data record (header per Q69)
- [ ] Full achievements list; not only next-ups (those are on This week)
- [ ] Heatmaps + activity chart per locked R8.12–R8.14 / Q67–Q68
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
