# M7-08: Earnings log on Rewards

**Status:** Draft
**Blocked by:** M7-05; M7-02 for spend kinds existing so Earnings can exclude them cleanly
**Implements:** R7.8, R7.10, R8.2 (from `../../spec.md`)
**Type:** build

## What to build

Move **earned** Seed history from Progress → Ledger → Points onto `/rewards/earnings`.

- Range control: **Today / This week / Last 7 days / This month / All time**.
- **Category bars** for the **selected range** (not only lifetime). Include gacha **refunds** under user-facing category **Cake** (storage category `gacha`; sum earn/refund side only — do not net pull spends into Cake).
- Event list of **earns** (and earn-side reverse/adjust as today) **plus Cake refunds**, **grouped by day** even when the range spans many days.
- Remove or stub the Points panel on Progress so currency accounting is not duplicated (completions stay). User-facing label from the shared display-name constant (R7.10; currently seeds).

Pull spends belong on Pull history (M7-09), not here. Lifetime chrome on the Rewards shell already uses `lifetimeEarned` from `/api/points` (non-spend sum).

## Acceptance criteria

- [ ] `/rewards/earnings` shows only earning-side activity for the selected range.
- [ ] Changing the range updates both the category bars and the day-grouped log.
- [ ] Days with no events are omitted or clearly empty; order is newest day first (unless documented otherwise).
- [ ] Progress no longer hosts the full points ledger UI (link to Rewards Earnings is OK).
- [ ] Currency copy uses the shared display-name constant (no scattered `"Seeds"` / `"points"` literals for the product name).
- [ ] Follows design-system variants; reuse existing summary/event API where possible (extend with `from`/`to` or range if needed).

## Reuse notes

[`LedgerPointsPanel.tsx`](../../../../../apps/web/src/features/progress/) (path may vary), [`pointsLedger.ts`](../../../../../apps/api/src/pointsLedger.ts) `getPointsSummary` / events list. Extend rather than duplicate.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] Committed as `F08 M7-08: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(filled when done)
