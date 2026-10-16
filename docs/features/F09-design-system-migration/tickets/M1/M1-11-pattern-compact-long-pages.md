# M1-11: Pattern — compact long-page tactics (Q11 / R.10)

**Status:** In progress
**Blocked by:** (none)
**Implements:** R.10, R1.2, Q11
**Type:** docs
**Scheduled with:** shared prototype with M1-09 / M1-10 (`/prototype/f09/patterns`)

## What to build

Lock **tactics** for compacting long scroll-heavy pages (density, collapsible sections, sticky compose/actions, etc.) so M2 Tasks migration has a written standard. This ticket does **not** redesign Tasks — only documents the chosen approach in `design-system.md`.

## Proposed approach (for judgment)

Ordered tactics (Tasks first migrate target in M2):

1. **Section chips → one scroll well** (locked M1-07; tab-scoped counts)
2. **Paginate inside the well** (M1-09 defaults)
3. **28rem clamp** on the primary list body (M1-07)
4. Slightly tighter row density only after 1–3
5. Sticky compose / primary write only if actions still fall below the first viewport after 1–4

Do not re-open multi-select accordion stacks as the Tasks standard.

## Acceptance criteria

- [ ] Q11 answered with an ordered tactic set (what to try / require)
- [ ] Patterns section documents the standard; Tasks named as first migrate target (M2)
- [ ] Relates to M1-07 height policy where relevant (do not contradict)
- [ ] Prototype used: URL + verdict recorded
- [ ] `npm run check` passes (docs-only OK)

## Design questions (prototype tickets only)

1. Ordered tactic set for compact long pages?
2. Anything beyond chips + clamp + pager required in M1 docs (sticky compose, density)?

Prototype URL: `/prototype/f09/patterns` · surface **C** (`?compact=`)

## Reuse notes

- M0-01 Tasks notes; R.10; M2 owns implementation
- M1-07 locked Tasks **section chips → one scroll well** (tab-scoped counts) — treat as an established compaction tactic here; do not contradict

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M1-11: …`
- [ ] End-of-task report given

## Verification notes

(filled when done)
