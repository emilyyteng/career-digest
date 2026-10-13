# M4-02: Category totals subtract a reversed earn twice

**Status:** Ready
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

- [ ] Earn, then reverse: the category total is 0 and the balance is unchanged from before the earn.
- [ ] Earn, adjust, then reverse: the category total is 0.
- [ ] Existing reversed earns in the database are repaired by a migration, and the summary of the real data then sums to the balance (before M7 spend events exist).
- [ ] The points log still shows the earn and its reverse as two entries.
- [ ] A test asserts that the category totals sum to the balance after a mix of earns, adjusts and reverses.

## Reuse notes

`effectiveEarnAmount` and the `meta.superseded` flag already carry everything the reader needs. Check every reader of `points_events.amount` for earn rows (the summary, the points log, any `SUM`) before changing what's stored.

Coordinate with M4-03, which changes what happens after a reversal.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run build` passes
- [ ] `npm test` passes (known baseline aside)
- [ ] API typecheck: no new errors
- [ ] Reuse check done
- [ ] Committed as `F08 M4-02: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(Filled in when done.)
