# M1-11: Pattern — compact long-page tactics (Q11 / R.10)

**Status:** Done
**Blocked by:** (none)
**Implements:** R.10, R1.2, Q11
**Type:** docs
**Scheduled with:** shared prototype with M1-09 / M1-10 (`/prototype/f09/patterns`)

## What to build

Lock **tactics** for compacting long scroll-heavy pages so M2 Tasks migration has a written standard. This ticket does **not** redesign Tasks — only documents the chosen approach in `design-system.md`.

## Acceptance criteria

- [x] Q11 answered with an ordered tactic set
- [x] Patterns section documents the standard; Tasks named as first migrate target (M2)
- [x] Relates to M1-07 height policy (chips / 28rem clamp) — no contradiction
- [x] Prototype used: URL + verdict recorded
- [x] `npm run check` passes (docs-only OK)

## Design questions (prototype tickets only)

1. Ordered tactic set? → **chips → one well → pager → 28rem clamp → density → sticky compose if needed**
2. Beyond chips + clamp + pager in M1 docs? → density and sticky compose only as later steps in the ordered list

Prototype URL: `/prototype/f09/patterns` · surface **C**

## Reuse notes

- M0-01 Tasks notes; R.10; M2 owns implementation
- M1-07 section chips; M1-09 `Pager`

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M1-11: …`
- [x] End-of-task report given

## Verification notes

**2026-10-15 verdicts:** ordered tactics as recommended; Tasks first migrate in M2.

Prototype exploration: `dab1805`. Lock commit below.
