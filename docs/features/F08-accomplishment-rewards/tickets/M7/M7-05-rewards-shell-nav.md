# M7-05: Rewards nav shell and Seeds chrome

**Status:** Draft
**Blocked by:** (none) for routing; balance read can use existing points API until M7-02 lands
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

User-facing currency label is **Seeds** on this shell (balance chip). Broader “points” → “Seeds” copy elsewhere may land with M7-08 or a small follow-up in this ticket if cheap.

Placeholder page bodies are fine; real UIs are M7-06–M7-10.

## Acceptance criteria

- [ ] Nav shows Rewards; active state works for `/rewards/*`.
- [ ] All five routes render inside a shared Rewards layout (sub-nav or tabs).
- [ ] Balance is shown as Seeds (number from existing ledger balance API).
- [ ] Follows `docs/design-system.md` interim button/nav patterns; no new global element CSS.
- [ ] Prototype routes under `/prototype/rewards` remain DEV-only and unchanged.

## Reuse notes

[`App.tsx`](../../../../../apps/web/src/App.tsx) nav/routes; Progress layout patterns; design-system interim `ui-btn` / segmented controls if useful for sub-nav.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M7-05: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(filled when done)
