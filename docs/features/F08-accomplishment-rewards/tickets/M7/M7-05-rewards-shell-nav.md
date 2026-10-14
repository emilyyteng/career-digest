# M7-05: Rewards nav shell and Seeds chrome

**Status:** Done
**Blocked by:** (none)
**Implements:** R7.1, R7.10 (from `../../spec.md`)
**Type:** build

## What to build

Add **Rewards** to app nav and a shell with five child routes:

| Route | Label |
|-------|--------|
| `/rewards/collection` | Collection |
| `/rewards/banner` | Banner |
| `/rewards/earnings` | Earnings |
| `/rewards/history` | Pull history |
| `/rewards/rules` | Rules |

`/rewards` redirects to Collection (or Banner — pick one and document in the ticket verification notes; default **Collection**).

User-facing currency label comes from a **shared display-name constant** (R7.10), defaulting to Seeds on this shell (balance chip). Broader “points” → display-name copy elsewhere may land with M7-08 or a small follow-up in this ticket if cheap. Introduce the constant here (or in a tiny shared module both web and Rules can import) so later tickets reuse it instead of string literals.

Placeholder page bodies are fine; real UIs are M7-06–M7-10.

## Acceptance criteria

- [x] Nav shows Rewards; active state works for `/rewards/*`.
- [x] All five routes render inside a shared Rewards layout (sub-nav or tabs).
- [x] Balance uses the shared currency display-name constant (currently Seeds) with the number from the existing ledger balance API.
- [x] Changing that one constant would rename the label on this shell without editing scattered string literals in the shell.
- [x] Follows `docs/design-system.md` interim button/nav patterns; no new global element CSS.
- [x] Prototype routes under `/prototype/rewards` remain DEV-only and unchanged.

## Reuse notes

[`App.tsx`](../../../../../apps/web/src/App.tsx) nav/routes; nested `Outlet` layout; reused `.ledger-balance-*` for the balance chip; sub-nav styled like `.ledger-subtab` via feature classes (`.rewards-subnav-link`). Currency labels: [`currencyDisplay.ts`](../../../../../apps/web/src/currencyDisplay.ts).

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F08 M7-05: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

- `/rewards` redirects to **Collection** (`/rewards/collection`).
- Top nav `NavLink` to `/rewards` (no `end`) so all `/rewards/*` keep Rewards active.
- Sub-nav uses `div role="navigation"` so it is not hit by global `nav a` header styles.
- `CURRENCY_DISPLAY.plural` on the balance chip; singular/plural helpers ready for later tickets.
- `npm run check` green (334 tests) on this commit.
