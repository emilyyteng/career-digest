# M7-06: Banner pull UI (one-by-one)

**Status:** Draft
**Blocked by:** M7-04, M7-05; cat modules from M7-07 (or land art in this ticket if M7-07 is folded)
**Implements:** R7.2, R7.6, R7.7 (from `../../spec.md`)
**Type:** build

## What to build

Product Banner page at `/rewards/banner`, following prototype variant **C** (one-by-one reveal):

- Pull ×1 / ×10 using M7-04; buttons disabled when balance &lt; cost.
- Pity meter and next-pull CE chance.
- One-by-one reveal; Skip jumps to results; never auto-advances; honor `prefers-reduced-motion`.
- Results show classic vs CE, new vs dupe / friendship / refundable, hard pity when applicable.
- Fast first paint: no multi-second sync sim on load (stats/sim belong in Rules or a deferred panel, not blocking the banner).

Promote CatCake SVG modules into production (e.g. `apps/web/src/features/rewards/`) in this ticket or M7-07 — **no imports from `prototype/`**.

## Acceptance criteria

- [ ] ×1 and ×10 call the real API; UI balance and pity update from the response.
- [ ] Buttons disabled when unaffordable (including negative balance).
- [ ] Reveal is one-by-one; Skip works; no auto-advance.
- [ ] Reduced motion: no disorienting animation requirement.
- [ ] Cats readable at card sizes used on the page; CE Day look for new CE (Night toggle is Collection).
- [ ] Page stays responsive on load (no 3s+ sync work on mount).
- [ ] Production code does not import `apps/web/src/prototype/**`.

## Reuse notes

Prototype [`PullPrototypePage.tsx`](../../../../../apps/web/src/prototype/rewards/PullPrototypePage.tsx), [`CatCake.tsx`](../../../../../apps/web/src/prototype/rewards/CatCake.tsx), [`gacha.ts`](../../../../../apps/web/src/prototype/rewards/gacha.ts) as reference only. Shared `ModalLayer` if any modal is needed.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M7-06: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(filled when done)
