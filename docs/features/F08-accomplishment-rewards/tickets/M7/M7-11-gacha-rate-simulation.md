# M7-11: Gacha rate simulation test

**Status:** Done
**Blocked by:** M7-04 (production roll logic to test against)
**Implements:** R7.7 (from `../../spec.md`)
**Type:** build

## What to build

A **10,000-run** (or agreed N) Monte Carlo test over the **same** roll rules as production pulls, with an injected deterministic PRNG (mulberry32 or equivalent). Assert rate/pity properties stay within tolerances:

- Average pulls between CE hits near the pity-inflated expectation (~14 with current params).
- Hard pity occurs only on pull 20 of a dry streak.
- Soft pity increases CE chance from pull 13.
- Full-set / classics stats are recorded as informational asserts or logged snapshots so param changes are visible in review.

This replaces relying on the prototype page’s browser sim for CI.

## Acceptance criteria

- [x] Test runs in `npm run check` (API or shared package test suite) in acceptable time (prototype typed-array approach is the performance bar).
- [x] Uses injected RNG; seed fixed for reproducibility.
- [x] Asserts core pity/rate invariants; failures are actionable when someone edits `GACHA_CONFIG`.
- [x] Does not import `apps/web/src/prototype/**`.

## Reuse notes

[`gachaSimulate.ts`](../../../../../apps/api/src/gachaSimulate.ts) uses production `collectorRateAt` / `GACHA_CONFIG` / flavor count.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Reuse check done
- [x] Committed as `F08 M7-11: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

- Seed 42, 10k runs; avg CE gap ~14; hardPityOnlyAt20; ~280ms locally.
