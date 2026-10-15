# M8-04: Past work surface

**Status:** Blocked
**Blocked by:** M8-01, M8-02
**Implements:** R8.4, R8.7 (from `../../spec.md`); kind filters kept (Q65)
**Type:** build

## What to build

Implement `/progress/past` following the M8-01 verdict for Past work.

Locked going in (spec):

- Completions live here (not under ledger)
- Kind filters stay
- Month calendar selects the focus day
- Working hypothesis until M8-01 locks: day edit panel + completions for the **7 days ending on the selected day**; Lifetime owns all-time totals

Apply the M8-01 answer to Q55 (edit panel vs completions content split). Prefer a server query for the completions window when needed, with tests.

Do **not** implement the superseded 1-day / 7-day pagination control unless the prototype verdict brings a form of it back.

## Acceptance criteria

- [ ] `/progress/past` matches the M8-01 Past work verdict (calendar, week window, filters, edit/completions split)
- [ ] Completions reachable without the old ledger tab
- [ ] After-the-fact reflection linking works as locked in M8-01 (R8.7)
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
