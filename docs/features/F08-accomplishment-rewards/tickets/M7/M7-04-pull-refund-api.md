# M7-04: Pull and refund APIs

**Status:** Draft
**Blocked by:** M7-01, M7-02, M7-03
**Implements:** R7.2, R7.4, R7.7 (from `../../spec.md`)
**Type:** build

## What to build

Server-authoritative banner math and inventory updates:

- **Pull ×1** and **Pull ×10** (cost 180 / 1,800). Reject (or no-op with a clear error) when balance &lt; cost.
- Each roll uses **OS CSPRNG** in production; pity and CE/classic rates match R7.7 (1.5%, soft 13, hard 20; no new-CE protection).
- Update ownership, pity, Night unlock (2nd CE copy), and write spend ledger events (and refund events when the user refunds).
- **Manual refund** of one refundable duplicate (classic +18, CE +90). A copy is refundable only when owned count is **above 6** (friendship maxed: original + 5 friendship copies kept). Reject when `count ≤ 6`. Refunds therefore cannot undo Night unlock (which requires only 2 CE copies).
- Optional: set Day/Night selection for a CE that has Night unlocked.

## Acceptance criteria

- [ ] `POST` (or equivalent) pull ×1 spends 180 when affordable and returns the result (flavor, edition, new/dupe, copies after, pity at pull, hard-pity flag).
- [ ] Pull ×10 spends 1,800 and returns ten results; order is stable for the response.
- [ ] Pull is rejected when balance &lt; cost (including negative balance).
- [ ] Pity resets only on a CE hit; hard pity guarantees a CE on the 20th pull since the last CE.
- [ ] Second CE copy for a flavor unlocks Night for that CE; first copy does not.
- [ ] `refundableCount = max(0, owned − 6)`; refund is rejected when owned ≤ 6.
- [ ] Refund one refundable copy credits 18 (classic) or 90 (CE) and decrements the count by 1; after refund, owned is still ≥ 6.
- [ ] Ledger shows matching spend/refund events with enough meta for Pull history.
- [ ] Tests use an injected deterministic RNG; cover pity ladder, hard pity, Night unlock, refund above 6, refund rejected at 6, and insufficient balance.

## Reuse notes

Logic mirror of [`gacha.ts`](../../../../../apps/web/src/prototype/rewards/gacha.ts) (`rollOnce`, `GACHA_CONFIG`, friendship helpers). Port to `apps/api` (or shared package); do not import prototype. Ledger helpers from M7-02; inventory from M7-03.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M7-04: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(filled when done)
