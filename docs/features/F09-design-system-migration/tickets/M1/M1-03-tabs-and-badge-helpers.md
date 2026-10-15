# M1-03: Tabs / chrome-tab and badge role helpers

**Status:** Ready
**Blocked by:** (none) — M1-01 Done
**Implements:** R.1, R1.1, Q5, Q18
**Type:** build

## What to build

Shared **chrome-tab** / in-page tab styles (display font; squared radius; active = gray wash + ink text + ink border) for app nav, feature subnav, and page tabs — same language, scale may differ. Badge/chip helpers mapped to color roles: priority RYG, kind (interview/goal), job status, score/streak (domain tech), liked (warn).

## Acceptance criteria

- [ ] Tab / chrome-tab variants documented and implemented without production blue/pink-lift active states for new usage
- [ ] App nav can adopt chrome-tab (or equivalent) without a one-off look
- [ ] Badge helpers cover the role map in `design-system.md`; no new page-local hex for these meanings
- [ ] Catalogue updated in `design-system.md`
- [ ] `npm run check` passes

## Design questions (prototype tickets only)

n/a

## Reuse notes

- Lab `.f09-chrome-tab` / pill patterns as visual reference (`548ba4e`)
- Existing `PriorityBadge`, job `.badge.*` — extend or wrap rather than fork forever

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M1-03: …`
- [ ] End-of-task report given

## Verification notes

(filled when done)
