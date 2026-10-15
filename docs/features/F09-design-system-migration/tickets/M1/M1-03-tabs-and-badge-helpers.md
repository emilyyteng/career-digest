# M1-03: Tabs / chrome-tab and badge role helpers

**Status:** Done
**Blocked by:** (none) — M1-01 Done
**Implements:** R.1, R1.1, Q5, Q18
**Type:** build

## What to build

Shared **chrome-tab** / in-page tab styles (display font; squared radius; active = gray wash + ink text + ink border) for app nav, feature subnav, and page tabs — same language, scale may differ. Badge/chip helpers mapped to color roles: priority RYG, kind (interview/goal), job status, score/streak (domain tech), liked (warn).

## Acceptance criteria

- [x] Tab / chrome-tab variants documented and implemented without production blue/pink-lift active states for new usage
- [x] App nav can adopt chrome-tab (or equivalent) without a one-off look
- [x] Badge helpers cover the role map in `design-system.md`; no new page-local hex for these meanings
- [x] Catalogue updated in `design-system.md`
- [x] `npm run check` passes

## Design questions (prototype tickets only)

n/a

## Reuse notes

- Lab `.f09-chrome-tab` / pill patterns as visual reference (`548ba4e`)
- Existing `PriorityBadge`, job `.badge.*` — extend or wrap rather than fork forever
- Reused: `.secondary` escape for button tabs; `PriorityBadge` now wraps `Badge`

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M1-03: …`
- [x] End-of-task report given

## Verification notes

**2026-10-15:**

- Added `ChromeTab` / `ChromeTabLink` / `chromeTabClass` and `Badge` / `badgeClass` in `apps/web/src/ui/`
- Proof: app nav; Progress + Rewards subnav; Tasks open/completed tabs; Home kind + rank score; `RankBadges` / `PostingDates` / `ApplicationMetaBadges`; `PriorityBadge` → compact Badge
- Score/streak tones use domain tech (purple) per Q18; goal kind uses domain reward (not amber)
- No growth of `button:not(...)` chain
- `npm run check` pass
- Commit: `26329b2`
