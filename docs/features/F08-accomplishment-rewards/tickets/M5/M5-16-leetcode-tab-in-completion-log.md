# M5-16: LeetCode tab in the completion log; rename weekly to weekly goals

**Status:** Done
**Blocked by:** M5-01, done (per-tier day storage)
**Implements:** R5.33, R5.34 (from `../../spec.md`)
**Type:** build

## What to build

The user wants to see how much LeetCode they've solved over time. Solves aren't completions, so they have no row in the completion log today; the dev data has 18 past days with solves (53 solves), most from before the points ledger, and none of it is visible in the log.

1. **A `leetcode` tab** in [`LedgerCompletionsPanel.tsx`](../../../../../apps/web/src/features/progress/LedgerCompletionsPanel.tsx) `TYPE_TABS` (L11–18), treated as a special tab like weekly: its badge shows an all-time count, and selecting it lists LeetCode by date under the existing day headings.
   - **Count (Q52):** the badge is total solves, all time.
   - **Rows (Q54):** one row per day with at least one solve, titled `LC: 3 solved`, meta `1 easy · 1 medium · 1 hard`, and the day's LeetCode points in the aside when above 0.
   - **`all` (Q53):** LeetCode day rows also show in `all`, like every other kind. The `leetcode` tab counts total solves; `all` counts one per LeetCode day row (a day with N solves is N on `leetcode` and 1 on `all`).
   - Untiered days count as medium (R5.20).
2. **API:** `GET /api/progress/completions` ([`completionsDiary.ts`](../../../../../apps/api/src/completionsDiary.ts)) gains a `leetcode` kind built from `leetcode_daily` (days with `count > 0`, newest first) and `stats.allTime.leetcode`. The points come from the day's `leetcode_daily` earn (`effectiveEarnAmount`), 0 when it's reversed or missing.
3. **Rename:** the `weekly` tab label becomes `weekly goals` (R5.34). The kind value and the row's kind badge stay `weekly` (Q54).
4. **Tab order (Q54):** all, tasks, apps, interviews, reflections, weekly goals, leetcode.

## Acceptance criteria

- [x] The `leetcode` tab's badge shows total solves, all time.
- [x] Selecting it shows one row per day with solves, newest first: `LC: 3 solved`, meta `1 easy · 1 medium · 1 hard`, and the day's points; a pre-ledger day shows no points.
- [x] A day with no tiers recorded reads as medium; a day whose count was lowered to 0 shows no row.
- [x] `all` shows LeetCode day rows among the other kinds, and its count adds one per LeetCode day (not the solve total).
- [x] The weekly tab reads `weekly goals`; its rows and count are unchanged.
- [x] Tests cover the diary's `leetcode` items and count, untiered days as medium, zero days excluded, and the points shown.

## Reuse notes

- `CompletionRow` renders the row; the new kind adds a title and meta from the API, not a new component (as M5-15 did for weekly).
- `readLeetcodeTiers` in [`progress.ts`](../../../../../apps/api/src/progress.ts) shows the medium-is-the-rest read.
- Any styling issue found is logged in F09, not fixed here.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F08 M5-16: …`
- [x] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

**Done 2026-10-13** (commit hash on the board).

- API: `GET /api/progress/completions` accepts `kind=leetcode`. Days with `count > 0` become items titled `LC: N solved`, meta `e easy · m medium · h hard` (untiered → medium), `localDate` = the day, points from the day's `leetcode_daily` earn (0 when missing or reversed). `stats.allTime.leetcode` is total solves; `leetcodeDays` is the day count for `all`.
- UI: [`LedgerCompletionsPanel.tsx`](../../../../../apps/web/src/features/progress/LedgerCompletionsPanel.tsx) tab order all → … → weekly goals → leetcode; weekly label only; `all` badge adds `leetcodeDays`. Rows reuse `CompletionRow` with no new variant class (default style).
- Tests: `completionsDiary.api.test.ts` (3) — untiered medium, zero days omitted, points when earned, `all` includes days, badge vs `all` counts. Checked by running; UI by reading and the build, not in a browser.
