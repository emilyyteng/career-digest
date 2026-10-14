# M7-03: Collection, pity, and Night-skin persistence

**Status:** Ready
**Blocked by:** (none) — can parallel M7-01/M7-02
**Implements:** R7.4, R7.7 (from `../../spec.md`)
**Type:** build

## What to build

Persist gacha state the prototype kept in memory:

- Owned copy counts per classic and per CE (12 + 12), keyed by the **frozen v1 flavor ids**: `strawberry`, `matcha`, `blueberry`, `sesame`, `peach`, `lemon`, `cherry`, `redbean`, `chocobanana`, `raspberry`, `caramel`, `ube` (same as the rewards prototype).
- Pity (pulls since last CE).
- Whether each CE’s **Night** skin is unlocked (true once owned CE copies ≥ 2; may be derived).
- Which look is selected (Day vs Night) per CE once unlocked; default **Day**. Persist selection in this ticket’s schema.

Expose read APIs (or extend an existing progress/points payload) so the Collection and Banner UIs can load without rolling. Writes happen in M7-04.

## Acceptance criteria

- [ ] Migration creates durable storage for ownership counts, pity, Night unlock (derived OK), and selected Day/Night look per CE.
- [ ] Defaults: empty collection, pity 0, no Night skins, Day selected.
- [ ] Flavor keys are the twelve frozen ids above (edition `classic` | `collector`).
- [ ] Night unlock is a derived or stored flag equivalent to “CE copies ≥ 2”; friendship/refund caps still use the single CE count (R7.4, R7.7).
- [ ] Refundable extras = `max(0, owned − 6)` (kept copies = 6 once friendship is maxed).
- [ ] Read endpoint(s) return enough for Collection (counts, friendship level, refundable extras, Night unlock/selection) and Banner (balance is existing; pity).
- [ ] Tests cover empty state, incrementing counts (via test helpers or M7-04 if sequenced), Night unlock at the second CE copy, Day default selection, and refundable = 0 while owned ≤ 6.

## Reuse notes

Prototype types in [`gacha.ts`](../../../../../apps/web/src/prototype/rewards/gacha.ts) (`GachaState`, `FRIENDSHIP_MAX`, `variantKey`) and flavor ids in [`flavors.ts`](../../../../../apps/web/src/prototype/rewards/flavors.ts) are the shape reference; production code must not import from `prototype/`.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M7-03: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(filled when done)
