# M5-16: LeetCode tab in the completion log; rename weekly to weekly goals

**Status:** Draft (waits on Q52–Q54)
**Blocked by:** M5-01 (per-tier day storage, built 2026-10-13)
**Implements:** R5.33, R5.34 (from `../../spec.md`)
**Type:** build

## What to build

The user wants to see how much LeetCode they've solved over time. Solves aren't completions, so they have no row in the completion log today; the dev data has 18 past days with solves (53 solves), most from before the points ledger, and none of it is visible in the log.

1. **A `leetcode` tab** in [`LedgerCompletionsPanel.tsx`](../../../../../apps/web/src/features/progress/LedgerCompletionsPanel.tsx) `TYPE_TABS` (L11–18), treated as a special tab like weekly: its badge shows an all-time count, and selecting it lists LeetCode by date under the existing day headings.
   - Count and rows: Q52 and Q54 (Proposed: the badge is total solves; one row per day with at least one solve, titled `LC 3 solved`, meta `1 easy · 1 medium · 1 hard`, points in the aside when the day's LeetCode earn is above 0).
   - Whether rows and their count also appear in `all`: Q53 (Proposed: no).
   - Untiered days count as medium (R5.20).
2. **API:** `GET /api/progress/completions` ([`completionsDiary.ts`](../../../../../apps/api/src/completionsDiary.ts)) gains a `leetcode` kind built from `leetcode_daily` (days with `count > 0`, newest first) and `stats.allTime.leetcode`. The points come from the day's `leetcode_daily` earn (`effectiveEarnAmount`), 0 when it's reversed or missing.
3. **Rename:** the `weekly` tab label becomes `weekly goals` (R5.34). The kind value stays `weekly`, and the row's kind badge stays `weekly` (Proposed).
4. **Tab order (Proposed):** all, tasks, apps, interviews, reflections, weekly goals, leetcode.

## Acceptance criteria

(Final once Q52–Q54 are answered.)

- [ ] The `leetcode` tab's badge shows the all-time count chosen in Q52.
- [ ] Selecting it shows one row per day with solves, newest first, with the Q54 title, tier meta and points; a pre-ledger day shows no points.
- [ ] A day with no tiers recorded reads as medium; a day whose count was lowered to 0 shows no row.
- [ ] `all` follows Q53.
- [ ] The weekly tab reads `weekly goals`; its rows and count are unchanged.
- [ ] Tests cover the diary's `leetcode` items and count, untiered days as medium, zero days excluded, and the points shown.

## Reuse notes

- `CompletionRow` renders the row; the new kind adds a title and meta from the API, not a new component (as M5-15 did for weekly).
- `readLeetcodeTiers` in [`progress.ts`](../../../../../apps/api/src/progress.ts) shows the medium-is-the-rest read.
- Any styling issue found is logged in F09, not fixed here.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M5-16: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(Filled in when done.)
