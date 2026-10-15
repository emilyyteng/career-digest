# M1-13: Mechanical enforcement for variant-less controls (Q6)

**Status:** Draft
**Blocked by:** M1-05
**Implements:** R1.3, Q6
**Type:** build

## What to build

Make variant-less controls fail `npm run check` (ESLint and/or a custom script — decide in-ticket with user if unclear). Turn enforcement on only after the Home pilot proves primitives. Document the rule and any allowlist for true exceptions.

## Acceptance criteria

- [ ] Q6 answered (mechanism chosen)
- [ ] Bare `<button>` / unclassed fields in production app code fail check (prototype paths exempt or separate)
- [ ] Wired into `npm run check` (via MT-01 host if applicable)
- [ ] Short doc note in `design-system.md` or AGENTS pointing at the rule
- [ ] `npm run check` passes on the migrated tree

## Design questions (prototype tickets only)

n/a

## Reuse notes

- MT-01 check pipeline if present; M1-02–05 primitives

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M1-13: …`
- [ ] End-of-task report given

## Verification notes

(filled when done)
