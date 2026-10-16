# M1-09: Pattern — long-list pagination defaults (Q8 / R.7)

**Status:** Done
**Blocked by:** (none)
**Implements:** R.7, R1.2, Q8
**Type:** docs
**Scheduled with:** shared prototype with M1-10 / M1-11 (`/prototype/f09/patterns`)

## What to build

Lock default pagination for long lists: page size, control placement, and whether calendar/day windows (Progress Past work) are a documented special case vs the general pattern. Promote R.7 from Proposed to Established when the user confirms the rule. No requirement to paginate every list in this ticket.

## Acceptance criteria

- [x] Q8 answered; R.7 Established
- [x] `design-system.md` Patterns documents list pagination defaults + Past work exception; shared `Pager` contract (no select)
- [x] Completions diary / Jobs pager debt called out as migrate targets
- [x] Prototype used: URL + verdict recorded
- [x] `npm run check` passes (docs-only OK)

## Design questions (prototype tickets only)

1. Page size / control placement? → **bottom `Pager`, size 25**
2. Load more / infinite vs classic pager? → **classic; reject load-more as default**
3. Past work 7-day window? → **Progress special case**
4. Jobs jump `<select>`? → **not in the standardized `Pager`**

Prototype URL: `/prototype/f09/patterns` · surface **A**

## Reuse notes

- F08 M8 Past work 7-day window; Jobs `.pager` + jump select is debt
- API `pageSize` default 25 in `api.ts`

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M1-09: …`
- [x] End-of-task report given

## Verification notes

**2026-10-15 verdicts:** bottom pager; standardize shared `Pager` (Prev / n/pages / Next; no page-jump or page-size select); size 25; Past work 7-day window = special case; reject load-more default.

Prototype exploration: `dab1805`. Lock commit below.

Commit: `b700154`
