# M3-06: Delete F11 M0 prototypes

**Status:** Done
**Blocked by:** —
**Implements:** R.0 (from `../../spec.md`); `AGENTS.md` Prototypes lifecycle
**Type:** build

## What to build

Remove throwaway F11 M0 prototype code and DEV routes once production UI that cited them has shipped.

## Acceptance criteria

- [x] Delete `apps/web/src/prototype/f11-habits-and-weekly-targets/` (all files).
- [x] Remove DEV-only lazy imports and routes for `/prototype/f11/habits` (+ strip, weekly) from [`App.tsx`](../../../../../apps/web/src/App.tsx).
- [x] No remaining references to those paths in production or docs that claim they still exist (ticket/spec may keep historical URLs in verification notes).
- [x] `npm run check` passes.
- [x] Feature may close after this + all M1–M3 tickets Done (changelog/roadmap in a separate milestone/feature close commit if required by `AGENTS.md`).

## Edge cases

- Do not delete while any open ticket still lists the prototype as the build reference.
- Git history remains the archive.

## Tests

- [x] Production build has no prototype chunk for f11 (DEV-gated routes already tree-shaken; confirm no broken imports).
- [x] `npm run check` passes.

## Reuse notes

N/A — deletion.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Ticket status `Done`; board updated
- [x] Committed as `F11 M3-06: …`
- [x] End-of-task report given, including **Issues found**

## Verification notes

- Removed `apps/web/src/prototype/f11-habits-and-weekly-targets/` and `/prototype/f11/habits*` routes from `App.tsx`.
- Historical prototype URLs remain in closed ticket verification notes only.
