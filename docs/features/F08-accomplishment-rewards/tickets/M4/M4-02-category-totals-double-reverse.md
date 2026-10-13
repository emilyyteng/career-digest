# M4-02: Category totals subtract a reversed earn twice

**Status:** Done
**Blocked by:** (none)
**Implements:** R4.1 (from `../../spec.md`)
**Type:** bug
**Scheduled with:** M5 (same query as the task-category breakdown, R5.21)

## Found during (bug tickets only)

F08 spec audit, 2026-10-13. The user agreed to ticket it under M4 the same day.

## Evidence (bug tickets only)

- `getPointsSummary` sums `amount` over every event in a category ([`pointsLedger.ts` L107–121](../../../../../apps/api/src/pointsLedger.ts)).
- `reverseEarn` inserts a negative `reverse` event **and** rewrites the original earn's `amount` to 0 ([`pointsLedger.ts` L227–298](../../../../../apps/api/src/pointsLedger.ts), the update at L280–293).
- So a reversed earn counts as 0 + (−amount) in its category instead of amount + (−amount) = 0.

Example: complete a misc task for 30 points, then reopen it. The balance is back where it started (it comes from `balance_after`, which is correct), but the `task` category total shows −30 instead of 0.

`adjustEarnAmount` doesn't have this problem: it keeps the earn's original amount and records only the delta ([`pointsLedger.ts` L307–350](../../../../../apps/api/src/pointsLedger.ts)). Affected sources are those that reverse: misc task reopen ([`routes.ts` L1110–1121](../../../../../apps/api/src/routes.ts)) and a day's LeetCode count dropping to 0 ([`pointsAwards.ts` L189–191](../../../../../apps/api/src/pointsAwards.ts)).

## What to build

Category totals equal the sum of what each category actually contributed to the balance. A reversed earn nets to 0 in its category.

Preferred fix: stop rewriting the earn's `amount` in `reverseEarn`, the same way `adjustEarnAmount` already works. The earn keeps its original amount, `meta.superseded` marks it as reversed, and `effectiveEarnAmount` already returns 0 for superseded earns ([`pointsLedger.ts` L55–62](../../../../../apps/api/src/pointsLedger.ts)). Existing rows that were already rewritten need a one-time data fix that restores `amount` from `meta.reversed_amount`. This matches R4.3: no earn row is rewritten as a correction.

## Acceptance criteria

- [x] Earn, then reverse: the category total is 0 and the balance is unchanged from before the earn.
- [x] Earn, adjust, then reverse: the category total is 0.
- [x] Existing reversed earns in the database are repaired by a migration, and the summary of the real data then sums to the balance (before M7 spend events exist).
- [x] The points log still shows the earn and its reverse as two entries.
- [x] A test asserts that the category totals sum to the balance after a mix of earns, adjusts and reverses.

## Reuse notes

`effectiveEarnAmount` and the `meta.superseded` flag already carry everything the reader needs. Check every reader of `points_events.amount` for earn rows (the summary, the points log, any `SUM`) before changing what's stored.

Coordinate with M4-03, which changes what happens after a reversal.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run build` passes
- [x] `npm test` passes (known baseline aside)
- [x] API typecheck: no new errors
- [x] Reuse check done
- [x] Committed as `F08 M4-02: …`
- [x] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

- `reverseEarn` now only merges `superseded`, `reversed_amount` and `clawback_applied` into the earn's meta; `amount` keeps the original value.
- Migration `027_repair_reversed_earn_amounts.sql` restores `amount` on superseded earns stored as 0. It uses `meta.original_amount` first and falls back to `meta.reversed_amount`: for an earn that was adjusted before being reversed, `reversed_amount` is the adjusted value, while the stored `amount` must be the original one (adjust events carry the delta). Idempotent; re-runs match nothing.
- Readers checked: `completionsDiary.ts` and `tasks.ts` read `effectiveEarnAmount` / `current_amount` and skip superseded earns, so they're unaffected. `LedgerPointsPanel.tsx` shows `amount`, so a reversed earn now shows its original +amount next to the −amount reverse, which is what the log should say.
- Tests added in `points.api.test.ts`: earn then reverse; earn, adjust, reverse; mixed earns/adjusts/reverses across task and LeetCode with category totals summing to the balance; migration 027 repairs a zeroed earn and is a no-op on a second run. The first three fail against the old `reverseEarn` and pass with the fix (checked by running both).
- Real data (dev database, read-only query, 2026-10-13): 0 zeroed reversed earns, so 027 changes nothing there; balance 1765 equals the sum of all events.
- Full `npm test` 196/196, `npm run build` passes, API typecheck at the 17-error MT-01 baseline.
