# M7-02: Ledger spend and refund events

**Status:** Draft
**Blocked by:** M7-01
**Implements:** R7.2, R4.2 (from `../../spec.md`)
**Type:** build

## What to build

Extend the global ledger so pulls and manual duplicate refunds can move Seeds. Add ledger `kind`s (or an equivalent established pattern) for **spend** and **refund**, plus a category such as `gacha` (name locked in implementation to match the category check constraint), so Earnings and Pull history can separate work earns from banner activity.

This ticket is API/schema only: recording helpers and tests. The pull/refund product APIs are M7-04.

## Acceptance criteria

- [ ] Migration(s) allow spend and refund events (update `kind` check; add category for gacha/spend as needed). Do not edit applied migration files.
- [ ] Helpers can insert a spend that decreases `balance_after` by the cost and a refund that increases it, with source metadata suitable for pull history (flavor, edition, pity, etc. can be stubbed until M7-04).
- [ ] Category totals and the balance stay consistent with earn / reverse / adjust / spend / refund.
- [ ] Spends and refunds appear in the points/Seeds event API shape used by Progress today (so M7-08/M7-09 can filter them).
- [ ] Tests cover spend, refund, and a mix with earns; a spend that would leave the balance below the remaining cost is not this ticket’s job (M7-04), but recording a spend when balance is already negative after M7-01 must work.

## Reuse notes

[`pointsLedger.ts`](../../../../../apps/api/src/pointsLedger.ts), [`pointsFormulas.ts`](../../../../../apps/api/src/pointsFormulas.ts) `PointsCategory`, [`025_points_ledger.sql`](../../../../../apps/api/src/sql/025_points_ledger.sql) and later category migrations (e.g. streak).

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Reuse check done
- [ ] Committed as `F08 M7-02: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(filled when done)
