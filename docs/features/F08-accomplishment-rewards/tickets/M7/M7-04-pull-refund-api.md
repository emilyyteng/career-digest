# M7-04: Pull and refund APIs

**Status:** Done
**Blocked by:** M7-01, M7-02, M7-03
**Implements:** R7.2, R7.4, R7.7 (from `../../spec.md`)
**Type:** build

## What to build

Server-authoritative banner math and inventory updates:

- **Pull ×1** and **Pull ×10** (cost 180 / 1,800). Reject when balance < cost.
- Each roll uses **OS CSPRNG** in production; pity and CE/classic rates match R7.7 (1.5%, soft 13, hard 20; no new-CE protection).
- Update ownership, pity, Night unlock (2nd CE copy), and write spend ledger events (and refund events when the user refunds).
- **Manual refund** of one refundable duplicate (classic +18, CE +90). Refundable only when owned count is **above 6**.
- Set Day/Night selection for a CE that has Night unlocked.

## Acceptance criteria

- [x] `POST` pull ×1 spends 180 when affordable and returns the result (flavor, edition, new/dupe, copies after, pity at pull, hard-pity flag).
- [x] Pull ×10 spends 1,800 and returns ten results; order is stable for the response.
- [x] Pull is rejected when balance < cost (including negative balance).
- [x] Pity resets only on a CE hit; hard pity guarantees a CE on the 20th pull since the last CE.
- [x] Second CE copy for a flavor unlocks Night for that CE; first copy does not.
- [x] `refundableCount = max(0, owned − 6)`; refund is rejected when owned ≤ 6.
- [x] Refund one refundable copy credits 18 (classic) or 90 (CE) and decrements the count by 1; after refund, owned is still ≥ 6.
- [x] Ledger shows matching spend/refund events with enough meta for Pull history.
- [x] Tests use an injected deterministic RNG; cover pity ladder, hard pity, Night unlock, refund above 6, refund rejected at 6, and insufficient balance.

## Reuse notes

[`catCakeGacha.ts`](../../../../../apps/api/src/catCakeGacha.ts); ledger helpers from M7-02; inventory from M7-03. No prototype imports.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F08 M7-04: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

Routes: `POST /api/rewards/pull`, `POST /api/rewards/refund`, `POST /api/rewards/look`. Production RNG via `node:crypto` `randomInt`; tests inject scripted RNG.
