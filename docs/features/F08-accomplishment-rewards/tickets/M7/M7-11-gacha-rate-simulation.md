# M7-11: Gacha rate simulation test

**Status:** Draft
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

- [ ] Test runs in `npm run check` (API or shared package test suite) in acceptable time (prototype typed-array approach is the performance bar).
- [ ] Uses injected RNG; seed fixed for reproducibility.
- [ ] Asserts core pity/rate invariants; failures are actionable when someone edits `GACHA_CONFIG`.
- [ ] Does not import `apps/web/src/prototype/**`.

## Reuse notes

Port or share the fast `simulate` from [`gacha.ts`](../../../../../apps/web/src/prototype/rewards/gacha.ts) next to the production roller.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Reuse check done
- [ ] Committed as `F08 M7-11: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(filled when done)
