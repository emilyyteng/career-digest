# M7-08: Earnings log on Rewards

**Status:** Done
**Blocked by:** M7-05; M7-02 for spend kinds existing so Earnings can exclude them cleanly
**Implements:** R7.8, R7.10, R8.2 (from `../../spec.md`)
**Type:** build

## What to build

Move **earned** Seed history from Progress → Ledger → Points onto `/rewards/earnings`.

- Range control: **Today / This week / Last 7 days / This month / All time**.
- **Category bars** for the **selected range**, counting **earn-side only** (lifetime-earnings amounts: work + Cake refunds; never net pull spends). Gacha refunds labeled **Cake**.
- Event list of earns (and earn-side reverse/adjust) **plus Cake refunds**, **grouped by day**; no pull spend rows. Badge **total:** = running lifetime earned through that event.
- Remove or stub the Points panel on Progress so currency accounting is not duplicated (completions stay). User-facing label from the shared display-name constant (R7.10; currently seeds).

Pull spends belong on Pull history (M7-09), not here. Lifetime chrome on the Rewards shell already uses `lifetimeEarned` from `/api/points` (non-spend sum).

## Acceptance criteria

- [x] `/rewards/earnings` shows only earning-side activity for the selected range.
- [x] Changing the range updates both the category bars and the day-grouped log.
- [x] Days with no events are omitted or clearly empty; order is newest day first (unless documented otherwise).
- [x] Progress no longer hosts the full points ledger UI (link to Rewards Earnings is OK).
- [x] Currency copy uses the shared display-name constant (no scattered `"Seeds"` / `"points"` literals for the product name).
- [x] Follows design-system variants; reuse existing summary/event API where possible (extend with `from`/`to` or range if needed).
- [x] Bars have Cake (not negative gacha); event badge says **total:** not balance.

## Reuse notes

Ledger bar/log patterns from Progress Points panel; `GET /api/rewards/earnings`; `CURRENCY_DISPLAY`; `ui-segmented` for range.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] Committed as `F08 M7-08: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

- Bars + log follow range; both exclude `kind = spend`.
- `gacha` refunds appear as **Cake** with positive points in-range.
- Progress Ledger → Points stubs with link to `/rewards/earnings`.
