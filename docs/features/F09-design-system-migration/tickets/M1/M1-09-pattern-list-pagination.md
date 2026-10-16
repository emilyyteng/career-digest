# M1-09: Pattern — long-list pagination defaults (Q8 / R.7)

**Status:** In progress
**Blocked by:** (none)
**Implements:** R.7, R1.2, Q8
**Type:** docs
**Scheduled with:** shared prototype with M1-10 / M1-11 (`/prototype/f09/patterns`)

## What to build

Lock default pagination for long lists: page size, control placement, and whether calendar/day windows (Progress Past work) are a documented special case vs the general pattern. Promote R.7 from Proposed to Established when the user confirms the rule. No requirement to paginate every list in this ticket.

## Proposed approach (for judgment)

- **Default:** classic Prev / page / Next under the list (or inside a clamped well), page size **25**.
- Optional duplicate pager above when the well is tall.
- Reject infinite scroll / “load more” as the system default.
- **Special case:** calendar-anchored time series (Past work) may use a day / **7-day window** instead of numbered pages — Progress-only, not the general rule.
- Future migrate targets: completions diary; long boards inside 28rem wells (pairs with M1-07).

## Acceptance criteria

- [ ] Q8 answered; R.7 Established (or explicitly left Proposed with reason)
- [ ] `design-system.md` Patterns documents list pagination defaults + Past work exception if any
- [ ] Completions diary / similar called out as future migrate targets
- [ ] Prototype used: URL + verdict recorded
- [ ] `npm run check` passes (docs-only OK)

## Design questions (prototype tickets only)

1. Page size / control placement for the general list rule?
2. Load more / infinite vs classic pager as default?
3. Is Past work’s 7-day window a documented special case?

Prototype URL: `/prototype/f09/patterns` · surface **A** (`?page=`)

## Reuse notes

- F08 M8 Past work 7-day window; F09 Current behavior row on ledger completions
- API lists already use `pageSize` default 25 in places (`api.ts`)

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M1-09: …`
- [ ] End-of-task report given

## Verification notes

(filled when done)
