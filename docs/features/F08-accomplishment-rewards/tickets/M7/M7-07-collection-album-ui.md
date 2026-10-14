# M7-07: Collection album UI

**Status:** Done
**Blocked by:** M7-03, M7-04, M7-05; shared cat modules with M7-06
**Implements:** R7.4, R7.7 (from `../../spec.md`)
**Type:** build

## What to build

Product Collection page at `/rewards/collection`: **album grid** of all 12 classics and 12 CEs.

- Silhouette (or locked placeholder) until owned.
- Friendship dots (5) from owned count; show refundable extras only beyond **6 kept copies** (friendship must be maxed before any refund).
- **Manual** refund control when refundable &gt; 0 (calls M7-04); no refund UI while owned ≤ 6.
- For each CE with Night unlocked: a **Day / Night toggle** (no Seed cost, no friendship spend). Default Day until toggled.
- Detail or expand pattern can follow the prototype album; keep chrome on design-system variants.

## Acceptance criteria

- [x] Grid shows all 24 variants; unowned read as undiscovered.
- [x] Friendship and refundable counts match server state.
- [x] Refund one (and optionally refund-all if product keeps it) only when owned &gt; 6; updates Seeds balance; never offered at friendship &lt; 5.
- [x] Night toggle appears only after unlock; switching look does not change ownership or pity.
- [x] Album layout is the grid (not bakery shelf) as the v1 product layout.
- [x] No production imports of prototype code.

## Reuse notes

Shared CatCake / CatCakeCard / FriendshipDots from M7-06. `ui-segmented` + `ui-btn` for Day/Night. Refund/look APIs from M7-04. Outlet `refreshSeeds` after refund.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F08 M7-07: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

- Album grid: Classics row + Collector's Editions row; silhouette until owned.
- Refund one only when refundable &gt; 0 (owned &gt; 6); no refund-all in v1 product.
- Day/Night segmented control only when `nightUnlocked` (CE copies ≥ 2); look persisted via `POST /api/rewards/look`.
