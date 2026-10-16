# M1-07: Pattern — paired panel height and in-panel overflow (Q16)

**Status:** Done
**Blocked by:** (none)
**Implements:** R1.2, Q16 (paired panel heights)
**Type:** docs
**Scheduled with:** shared prototype with M1-08

## What to build

Lock the **vertical height policy** for multi-column and stacked list layouts. Progress Past work is the dual-column stress case; Tasks + unequal-density regions are the page-scroll / composition stress cases. Apply in surface waves (M2+), not in this ticket.

## Acceptance criteria

- [x] Q16 paired-panel height answered in the F09 spec Resolved section
- [x] `docs/design-system.md` Patterns states: fixed 28rem peer height, overflow-inside, stack breakpoint behavior, no single-column page min-height, Tasks section chips, mini-above-large
- [x] Progress Past work cited as dual-column stress case; Tasks / unequal density cited
- [x] Prototype used: URL + verdict recorded
- [x] No requirement to migrate Progress in this ticket (M2 / later apply)
- [x] `npm run check` passes (docs-only OK)

## Design questions (prototype tickets only)

1. List clamp / asymmetric / viewport / both fixed? → **both peers fixed 28rem**
2. Tasks stacked wells? → **section chips → one body**; counts match **active tab only**
3. Unequal-density peers? → **mini-containers stacked above larger wells**; Progress This week page layout deferred to M2
4. Stacked breakpoint: equal-height off? → **yes**

Prototype URL: `/prototype/f09/layout` (shared with M1-08; keep as reference while useful)

## Reuse notes

- M0-01 findings §14 Vertical rhythm / height
- Past work grid in `styles.css` / Progress pages
- M1-06 containerized chrome; M1-09 paginates inside a well; M1-11 may reference section chips

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M1-07: …`
- [x] End-of-task report given

## Verification notes

**2026-10-15 verdicts:**

| Axis | Lock |
|------|------|
| Dual-column peers | Both panels **fixed 28rem**; overflow inside (not viewport track; not asymmetric natural/clamp) |
| Columns stack | Equal-height off; natural flow |
| Single-column page | No forced min-height |
| Tasks many sections | Section chips → one scroll well; chip counts = active tab only |
| Unequal density | Mini above larger well; Progress This week composition → M2 |

Prototype last commit before lock docs: `82a4fdd` (exploration); lock commit below.

Typecheck + web build pass. API tests: unrelated failures in `workTime.api.test.ts` / `demo.api.test.ts` (reported; not this ticket).

Commit: `2a60bb0`
