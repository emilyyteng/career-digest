# M7-06: Banner pull UI (one-by-one)

**Status:** Done
**Blocked by:** M7-04, M7-05
**Implements:** R7.1 (tab order/redirect), R7.2 (lifetime chrome), R7.6, R7.7, R7.10 (from `../../spec.md`)
**Type:** build

## What to build

Product Banner page at `/rewards/banner`, following prototype variant **C** (one-by-one reveal):

- Pull ×1 / ×10 using M7-04; buttons disabled when balance &lt; cost.
- Pity meter and next-pull CE chance.
- One-by-one reveal; Skip jumps to results; never auto-advances; honor `prefers-reduced-motion`.
- Results show classic vs CE, new vs dupe / friendship / refundable, hard pity when applicable.
- Fast first paint: no multi-second sync sim on load (stats/sim belong in Rules or a deferred panel, not blocking the banner).

Promote CatCake SVG modules into production (e.g. `apps/web/src/features/rewards/`) in this ticket or M7-07 — **no imports from `prototype/`**.

Also in this ticket (2026-10-14): Rewards chrome — lowercase **seeds**, `{balance} seeds ({lifetimeEarned} lifetime)`, tab order Banner-first, `/rewards` → Banner; API `lifetimeEarned` on `/api/points`.

## Acceptance criteria

- [x] ×1 and ×10 call the real API; UI balance and pity update from the response.
- [x] Buttons disabled when unaffordable (including negative balance).
- [x] Reveal is one-by-one; Skip works; no auto-advance.
- [x] Reduced motion: no disorienting animation requirement.
- [x] Cats readable at card sizes used on the page; CE Day look for new CE (Night toggle is Collection).
- [x] Page stays responsive on load (no 3s+ sync work on mount).
- [x] Production code does not import `apps/web/src/prototype/**`.
- [x] Chrome shows lowercase seeds + lifetime; tabs Banner → Collection → …; redirect to Banner.

## Reuse notes

Prototype Pull/CatCake as reference only. Shared `ui-btn` / design-system patterns. Promoted modules under `features/rewards/` (+ `catCake.css`). `CURRENCY_DISPLAY` for labels. Outlet context refreshes balance after pulls.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F08 M7-06: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

- `/rewards` → `/rewards/banner`.
- Lifetime = `SUM(amount) WHERE kind <> 'spend'`; balance = lifetime − pull spends.
- Gacha refunds remain category `gacha` (Cake label on Earnings in M7-08).
- Reduced motion: pull results land in full revealed grid (no sequential boxes).
- Skip from sequential/waiting jumps straight to revealed results.
