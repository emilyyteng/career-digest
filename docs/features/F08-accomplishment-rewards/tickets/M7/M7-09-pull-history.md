# M7-09: Pull history

**Status:** Done
**Blocked by:** M7-04, M7-05; Earnings patterns from M7-08
**Implements:** R7.8 (from `../../spec.md`)
**Type:** build

## What to build

`/rewards/history` lists **banner spends** (pulls): a pull-centric history, separate from Earnings.

Cake **refunds** live on Earnings (M7-08) under category Cake — do not duplicate them here unless a pull-session detail needs a one-line refund reference.

Each pull row (or expandable group for ×10) should make clear:

- When
- Flavor and edition (classic / CE)
- New vs duplicate; friendship level; refundable only when owned &gt; 6; n-th time variant was pulled
- Pity at pull; hard pity if applicable
- seeds spent (180 or share of ×10)

**Lifetime spend:** mirror Earnings’ lifetime gain chrome — show lifetime spend (sum of `|amount|` for `kind = spend`, or equivalent) near the top, alongside the ranged spend total if range control is included.

Optional range control may match Earnings; day grouping is welcome for consistency.

## Acceptance criteria

- [x] History shows spend events only (no work earns; refunds stay on Earnings / Cake).
- [x] Lifetime spend is visible similarly to Earnings’ lifetime earned.
- [x] ×1 and ×10 pulls are attributable; ×10 can show as one session with ten results or ten rows — pick one UX and stick to it.
- [x] CE vs classic and Night unlock moments are understandable from the row or detail (Night unlock itself may only appear on Collection).
- [x] Empty state when the user has never pulled.
- [x] No production imports of prototype code.
- [x] Each result records/shows the n-th time that variant was pulled (survives refunds).

## Reuse notes

Ledger spend meta from M7-04; Earnings range/day patterns; `CURRENCY_DISPLAY`; flavor names from `flavors.ts`.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] Committed as `F08 M7-09: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

- UX: one session card per spend (`×1` or `×10`) with nested result lines.
- `timesPulled` written into spend `meta.results` at pull time; history API backfills older rows missing the field.
- Badge **spent:** = running lifetime spend after that session.
