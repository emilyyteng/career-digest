# M7-09: Pull history

**Status:** Draft
**Blocked by:** M7-04, M7-05; Earnings patterns from M7-08
**Implements:** R7.8 (from `../../spec.md`)
**Type:** build

## What to build

`/rewards/history` lists **banner spends** (pulls): a pull-centric history, separate from Earnings.

Cake **refunds** live on Earnings (M7-08) under category Cake — do not duplicate them here unless a pull-session detail needs a one-line refund reference.

Each pull row (or expandable group for ×10) should make clear:

- When
- Flavor and edition (classic / CE)
- New vs duplicate; friendship level; refundable only when owned &gt; 6
- Pity at pull; hard pity if applicable
- seeds spent (180 or share of ×10)

**Lifetime spend:** mirror Earnings’ lifetime gain chrome — show lifetime spend (sum of `|amount|` for `kind = spend`, or equivalent) near the top, alongside the ranged spend total if range control is included.

Optional range control may match Earnings; day grouping is welcome for consistency.

## Acceptance criteria

- [ ] History shows spend events only (no work earns; refunds stay on Earnings / Cake).
- [ ] Lifetime spend is visible similarly to Earnings’ lifetime earned.
- [ ] ×1 and ×10 pulls are attributable; ×10 can show as one session with ten results or ten rows — pick one UX and stick to it.
- [ ] CE vs classic and Night unlock moments are understandable from the row or detail (Night unlock itself may only appear on Collection).
- [ ] Empty state when the user has never pulled.
- [ ] No production imports of prototype code.

## Reuse notes

Ledger events from M7-02/M7-04 meta; Rewards shell from M7-05. Earnings day-grouping / range patterns from M7-08.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] Committed as `F08 M7-09: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(filled when done)
