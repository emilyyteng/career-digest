# M4-01: Heatmap colors — more contrast on lower activity

**Status:** Draft
**Blocked by:** (none)
**Implements:** R0.3, R.12 (from `../../spec.md`); extends Q13 heat scale in `docs/design-system.md`
**Type:** build

## Found during

Surfaced 2026-10-16 (user request during F11 polish). Current vivid-rose soft peak (`--heat-0`…`--heat-4` / [`intensityScale.ts`](../../../../../apps/web/src/features/progress/intensityScale.ts)) reads too pale and too little differentiated on lower-activity days.

## Evidence

Past work calendar and Lifetime heatmaps fill via `workIntensityFill`. Low non-zero counts sit near heat-0 / heat-1, which are very light blush and hard to tell apart from empty (`--surface-2`) or from each other.

## What to build

Tune the shared heat scale (tokens + `intensityScale` RGB stops + legend) so lower activity days are darker / more varied while still matching the ink-desk palette. Update `docs/design-system.md` Heat / Heatmap rows to the locked stops. Prototype optional if direction is unclear; otherwise adjust production tokens directly after a quick side-by-side check.

## Acceptance criteria

- [ ] Lower non-zero activity cells are clearly distinguishable from empty and from each other across typical Past work / Lifetime ranges
- [ ] `--heat-0`…`--heat-4` (or successor) and `intensityScale` stays stay in sync
- [ ] `docs/design-system.md` documents the revised scale; Q13 / R0.3 still hold (shared sequential heat, not ad-hoc per feature)

## Edge cases

- Peak day still reads as the hottest stop
- Empty cells stay `--surface-2` (not heat-0)
- Legend matches live cells

## Tests

- [ ] Manual: Past work calendar + Lifetime heatmap with mixed low/high days
- [ ] No automated color tests required unless an existing snapshot already covers stops

## Reuse notes

[`intensityScale.ts`](../../../../../apps/web/src/features/progress/intensityScale.ts), `:root` `--heat-*` in `styles.css`, Heat / Heatmap rows in `docs/design-system.md`.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M4-01: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(Filled in when done.)
