# M7-07: Collection album UI

**Status:** Draft
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

- [ ] Grid shows all 24 variants; unowned read as undiscovered.
- [ ] Friendship and refundable counts match server state.
- [ ] Refund one (and optionally refund-all if product keeps it) only when owned &gt; 6; updates Seeds balance; never offered at friendship &lt; 5.
- [ ] Night toggle appears only after unlock; switching look does not change ownership or pity.
- [ ] Album layout is the grid (not bakery shelf) as the v1 product layout.
- [ ] No production imports of prototype code.

## Reuse notes

Prototype [`CollectionPrototypePage.tsx`](../../../../../apps/web/src/prototype/rewards/CollectionPrototypePage.tsx), [`FriendshipDots.tsx`](../../../../../apps/web/src/prototype/rewards/FriendshipDots.tsx), [`CatCakeCard.tsx`](../../../../../apps/web/src/prototype/rewards/CatCakeCard.tsx) as reference. Production cat modules from M7-06/M7-07 shared folder.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M7-07: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(filled when done)
