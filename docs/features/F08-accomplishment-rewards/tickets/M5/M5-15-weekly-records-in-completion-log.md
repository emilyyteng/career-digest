# M5-15: Weekly records in the completion log

**Status:** Ready
**Blocked by:** M5-05, done (the `weekly` entries from the completions diary API; split out 2026-10-13)
**Implements:** R5.8 (display) (from `../../spec.md`)
**Type:** build

## What to build

When a week closes, the Progress completion log shows one row per goal on the close day, so the user can see how each week went next to the tasks and applications they finished.

1. **Ledger rows:** entries of kind `weekly` from `GET /progress/completions` render as rows in [`LedgerCompletionsPanel.tsx`](../../../../../apps/web/src/features/progress/LedgerCompletionsPanel.tsx) on the close date. Titles are `Apps 6/10` and `LC 12/10`; points go in the row's aside, like the other kinds.
2. **Meta text (M5-06 verdict, Q5 variant A, 2026-10-13):**
   - Missed: `Week of Oct 5 · 6 × 20`
   - Met: `Week of Oct 5 · 12 × 20 + 100 · target met`
   - 0/0 apps: `Week of Oct 5 · no tagged applications`, with no points shown
3. **Filter tab:** a `weekly` tab in `TYPE_TABS` (L11–17), after `reflections`. Its count works like the other tabs.

Reference: `/prototype/f08/weekly/weekly-record` (variant A).

As built in M5-05, `GET /api/progress/completions` already returns these items: `kind: "weekly"`, the title, the meta text as `subtitle`, `points` (0 for 0/0), a `weekly` object (slot, weekStart, target, done, met, points), and `stats.allTime.weekly` for the tab count. Without this ticket they already show in the `all` tab with the generic row style. Add `"weekly"` to the web `CompletionKind` type.

## Acceptance criteria

- [ ] A closed week with 6/10 apps shows `Apps 6/10`, meta `Week of Oct 5 · 6 × 20`, and +120 on the close day.
- [ ] A met LC week of 12/10 shows `LC 12/10`, meta `Week of Oct 5 · 12 × 20 + 100 · target met`, and +340.
- [ ] A 0/0 apps week shows `Apps 0/0` with meta `Week of Oct 5 · no tagged applications` and no points.
- [ ] The `weekly` tab shows only weekly rows; `all` includes them.
- [ ] Weeks before the switch-over (R5.22) show no rows.
- [ ] Follows the existing ledger row styles; any styling issue found is logged in F09, not fixed here (`docs/design-system.md` hard rule 7).

## Reuse notes

Reuse the existing ledger row rendering and tab logic in `LedgerCompletionsPanel.tsx`; the new kind adds a title and meta formatter, not a new row component. The prototype's formatter in `apps/web/src/prototype/f08-weekly/` shows the wording; don't import it from production code.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M5-15: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(Filled in when done.)
