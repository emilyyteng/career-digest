# M8-04: Past work surface

**Status:** Done
**Blocked by:** (none)
**Implements:** R8.4, R8.7, R8.13 (from `../../spec.md`); kind filters kept (Q65)
**Type:** build

## What to build

Implement `/progress/past` following the M8-01 verdict for Past work.

Locked (R8.4 / M8-01 A):

- Left: calendar + always-editable day panel (LC, interviews above apps, reflections; no misc-task list; no Edit-this-day checkbox)
- Right: completions for the **7 days ending on the selected day**
- Kind filters without the **`weekly goals`** tab; weekly rows remain in **`all`**
- Overlap between day panel and log is fine
- Calendar intensity per R8.13: apps + LC raw count, proportional gradient (no clamp to 3), no effort checkmarks

Prefer a server query for the completions window when needed, with tests. No standalone 1-/7-day pagination control.

## Acceptance criteria

- [x] `/progress/past` matches locked A layout and day-panel rules (R8.4)
- [x] Completions week window + filters (no `weekly goals` tab); reachable without ledger
- [x] Day panel always editable; reflection linking per R8.7
- [x] Calendar marks follow R8.13 (raw apps+LC, unclamped gradient, no effort marks); prefer owning the shared intensity scale here for M8-05 reuse
- [x] API/tests cover any new completions window query
- [x] Follows `docs/design-system.md`

## Reuse notes

`LedgerCompletionsPanel` (window + hide stats/weekly tab), `HistoryCalendar`, `intensityScale` (shared with heatmaps), day detail + interviews from API, reflection compose/edit. Deleted unrouted `ProgressPage` / `LedgerPointsPanel` after mining. Prototype `/prototype/f08/progress/past-work` kept as reference.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F08 M8-04: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

- Dual column A; day panel always editable; LC misc-only; interviews above apps; no misc tasks in panel.
- Completions: `endDate` + `days=7`; empty days shown; no weekly-goals kind tab.
- `intensityScale.ts` + calendar/heatmap use raw ∝ peak (no clamp to 3, no effort ✓).
- Tests: completions window filter; day `interviewRows` empty array assertion.
- `npm run check` green (343 tests). Board hash in follow-up.
