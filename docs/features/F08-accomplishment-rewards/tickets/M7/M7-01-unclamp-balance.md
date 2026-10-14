# M7-01: Allow a negative Seed balance

**Status:** Done
**Blocked by:** (none)
**Implements:** R7.3 (from `../../spec.md`)
**Type:** build

## What to build

Remove the floor at 0 on the ledger balance so R7.3 holds: the balance may go negative. Spending is still blocked when the balance is below the pull cost (R7.2; enforced in M7-04/M7-06), but earn reverses and adjusts must no longer fail or clamp when they would cross below 0.

## Acceptance criteria

- [x] A new migration drops or replaces the `balance_after >= 0` check on `points_events` (do not edit `025_points_ledger.sql`).
- [x] `clampDeltaToBalance` is removed or no longer forces a floor of 0; callers that relied on it are updated.
- [x] An adjust or reverse that would take the balance below 0 succeeds and stores the true `balance_after`.
- [x] Existing tests that asserted clamping are rewritten for the new rule; new tests cover a balance crossing below 0.
- [x] User-visible copy still makes sense if the balance is negative (at least: balance display can show a negative number).

## Reuse notes

[`pointsFormulas.ts`](../../../../../apps/api/src/pointsFormulas.ts) `applyDeltaToBalance` (replaced `clampDeltaToBalance`); [`038_unclamp_points_balance.sql`](../../../../../apps/api/src/sql/038_unclamp_points_balance.sql); [`pointsLedger.ts`](../../../../../apps/api/src/pointsLedger.ts).

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Reuse check done
- [x] Committed as `F08 M7-01: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

Migration `038_unclamp_points_balance.sql` drops `points_events_balance_after_check`. `applyDeltaToBalance` always applies the full delta. Unit + integration tests cover balance &lt; 0. Progress balance UI already renders the numeric balance (negative OK).
