# M8-05: Lifetime surface

**Status:** Blocked
**Blocked by:** M8-01, M8-02
**Implements:** R8.12 (from `../../spec.md`); placement for R5.26
**Type:** build

## What to build

Implement `/progress/lifetime` for accumulated work: all-time totals (from completions stats), the full achievements list (moved off the M5 peer tab), and heatmaps per the M8-01 answer to Q57.

No seeds balance, earnings log, or points chrome — those stay on Rewards.

## Acceptance criteria

- [ ] `/progress/lifetime` shows all-time work totals and the achievements list
- [ ] Achievements are no longer a Progress peer tab
- [ ] Heatmaps follow the M8-01 / Q57 verdict (full dual, combined, or omitted if only the This week peek remains)
- [ ] No currency / Earnings UI on this surface
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
