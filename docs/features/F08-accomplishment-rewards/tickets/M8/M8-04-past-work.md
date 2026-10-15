# M8-04: Past work surface

**Status:** Blocked
**Blocked by:** M8-02
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

- [ ] `/progress/past` matches locked A layout and day-panel rules (R8.4)
- [ ] Completions week window + filters (no `weekly goals` tab); reachable without ledger
- [ ] Day panel always editable; reflection linking per R8.7
- [ ] Calendar marks follow R8.13 (raw apps+LC, unclamped gradient, no effort marks); prefer owning the shared intensity scale here for M8-05 reuse
- [ ] API/tests cover any new completions window query
- [ ] Follows `docs/design-system.md`

## Reuse notes

`LedgerCompletionsPanel`, `HistoryCalendar`, history day detail from `ProgressPage`, reflection compose/edit. Prototype: `/prototype/f08/progress/past-work`.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M8-04: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(Filled in when done.)
