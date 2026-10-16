# M1-13: Mechanical enforcement for variant-less controls (Q6)

**Status:** Done
**Blocked by:** M1-05
**Implements:** R1.3, Q6
**Type:** build

## What to build

Make variant-less controls fail `npm run check` (ESLint and/or a custom script). Turn enforcement on only after the Home pilot proves primitives. Document the rule and any allowlist for true exceptions.

## Acceptance criteria

- [x] Q6 answered (mechanism: custom Node script, not ESLint — no ESLint in repo)
- [x] Bare `<button>` / unclassed fields fail check (buttons: full production tree; fields: Home tree; prototype + `ui/` exempt)
- [x] Wired into `npm run check` as `check:ui` first step
- [x] Documented in `design-system.md` (+ AGENTS check line)
- [x] `npm run check` passes on the migrated tree

## Design questions (prototype tickets only)

n/a

## Reuse notes

- `scripts/check-ui-variants.mjs`; M1-02–05 primitives

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M1-13: …`
- [x] End-of-task report given

## Verification notes

**Q6:** `npm run check:ui` → `scripts/check-ui-variants.mjs`. Bare buttons fail everywhere under `apps/web/src` except `ui/` and `prototype/`. Unclassed fields enforced on Home only until M2 form waves.

Commit below.
