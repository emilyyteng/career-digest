# M8-01: Prototype Progress hub

**Status:** Done
**Blocked by:** (none)
**Implements:** R8.1, R8.3, R8.4, R8.5, R8.7, R8.8–R8.14, RX.2 (from `../../spec.md`); Q55, Q57, Q61, Q65, Q67–Q74
**Type:** prototype

## What to build

Prototypes for the Progress nested hub at `/prototype/f08/progress`.

## Design questions (prototype tickets only)

1. This week composition → **locked** R8.10 (no heatmap peek; week+month pulse; next-per-family; weekly streaks; LC ⊥ compose)
2. Heatmap peek → **dropped** R8.11
3. Past work split → **A** R8.4
4. Lifetime → R8.12–R8.14 (chart above heatmaps; seeds chart; days worked)
5. LC tier polish → R8.3 on This week
6. Calendar/heatmap intensity → **apps + LC raw, unclamped** R8.13 (not seeds)

Prototype URL: `/prototype/f08/progress`

## Acceptance criteria

- [x] Hub + This week / Past work / Lifetime under `apps/web/src/prototype/f08-progress/`
- [x] Locked layouts recorded in spec; Q67–Q74 answered
- [x] No Progress points / ledger framing
- [x] No production imports of prototype code (Lifetime may import `ProgressHeatmap` for fidelity)
- [x] Verdict recorded below; `f08-progress` retained through M8 builds; delete in F08 cleanup (RX.3)

## Reuse notes

Shared `PrototypeSwitcher`; Rewards-style subnav mock; `ProgressHeatmap` on Lifetime for color/layout reference.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes (on prototype commits)
- [x] Follows `docs/design-system.md` (interim; no new global CSS)
- [x] Reuse check done
- [x] No production imports of prototype code into production routes
- [x] Committed as `F08 M8-01: …`
- [x] End-of-task report given

## Verification notes

**Verdict (2026-10-14):** See spec R8.4, R8.10–R8.14, Q55, Q57, Q61, Q65, Q67–Q74, Q68.

- Past work **A**; This week locked without heatmap peek; Lifetime chart **above** heatmaps; chart = seeds/day; heatmaps/calendar intensity = **apps + LC raw ∝ gradient**, no clamp to 3, no effort checkmarks.
- Prototype kept as build reference through M8; delete in F08 cleanup: `/prototype/f08/progress`.
- Closing commit: `edfc631`.
