# M3-06: Delete F11 M0 prototypes

**Status:** Draft
**Blocked by:** M2-01, M2-02, M3-03, M3-04, M3-05 (all Done — last consumers of prototype references)
**Implements:** R.0 (from `../../spec.md`); `AGENTS.md` Prototypes lifecycle
**Type:** build

## What to build

Remove throwaway F11 M0 prototype code and DEV routes once production UI that cited them has shipped.

## Acceptance criteria

- [ ] Delete `apps/web/src/prototype/f11-habits-and-weekly-targets/` (all files).
- [ ] Remove DEV-only lazy imports and routes for `/prototype/f11/habits` (+ strip, weekly) from [`App.tsx`](../../../../../apps/web/src/App.tsx).
- [ ] No remaining references to those paths in production or docs that claim they still exist (ticket/spec may keep historical URLs in verification notes).
- [ ] `npm run check` passes.
- [ ] Feature may close after this + all M1–M3 tickets Done (changelog/roadmap in a separate milestone/feature close commit if required by `AGENTS.md`).

## Edge cases

- Do not delete while any open ticket still lists the prototype as the build reference.
- Git history remains the archive.

## Tests

- [ ] Production build has no prototype chunk for f11 (DEV-gated routes already tree-shaken; confirm no broken imports).
- [ ] `npm run check` passes.

## Reuse notes

N/A — deletion.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Ticket status `Done`; board updated
- [ ] Committed as `F11 M3-06: …`
- [ ] End-of-task report given, including **Issues found**

## Verification notes

_(filled when done)_
