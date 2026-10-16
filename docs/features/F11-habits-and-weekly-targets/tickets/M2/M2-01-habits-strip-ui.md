# M2-01: Habits strip on Home + Progress

**Status:** Draft
**Blocked by:** M1-03
**Implements:** R1.8–R1.10, R1.5, R1.9, R.5, R.7, R1.14, Q11, Q14 (from `../../spec.md`)
**Type:** build

## What to build

Production **Habits** strip shared by Home and Progress → This week, matching M0-01 verdict **D**: mark hit-target checkoff, ghost archived, ChromeTabs Active/Archived, create slot, per-custom pencil (rename/archive + confirm).

Prototype reference: `/prototype/f11/habits/strip` (keep until this ticket and M2-02 are Done).

## Acceptance criteria

- [ ] Heading **Habits**; same chrome on **Home** and **Progress** (R1.8).
- [ ] Active / Archived as **ChromeTabs**; Archived disabled when no archived customs; Archived shows **customs only** (no apps/LC).
- [ ] Active order: Apps, LC (derived display-only), customs by creation order, **create** slot when active customs &lt; 3; create gone at cap.
- [ ] Apps/LC: `N completed today` subtitle; no pencil/archive; not interactive for checkoff (R.5, R1.9).
- [ ] Customs: mark ✓/− top-right like Apps/LC marks; pencil beside `{name} daily streak`; subtitle **done** / **not yet**; checkoff/undo wired to API (Q11, R1.5, R1.10).
- [ ] Pencil → ModalLayer: rename + Archive (danger) + Cancel + Save; Archive requires **confirm** modal; rename/archive call API.
- [ ] Create flow: name modal; respects cap; clear error if API rejects.
- [ ] Archived: **ghost stamp** look; Restore; restore-at-cap shows clear message; restoring last archived returns to Active and disables Archived tab (Q14).
- [ ] Home: **Update progress →** bottom-right of the strip → Progress This week (R1.8).
- [ ] Pill metrics/spacing align with existing apps/LC streak pills; pencil does not reflow the label line.
- [ ] Design system: component variants / tokens only; shared `ModalLayer`; no prototype imports in production.

## Edge cases

- Zero customs: create slot visible; Archived disabled.
- Three customs: no create slot; restore blocked with message.
- Empty / overlong create or rename names: surface API validation.
- Loading and error states for strip fetch/mutations (no silent failure).
- Apps/LC still render if customs API fails (degrade gracefully if split fetches).

## Tests

- [ ] Prefer component/integration coverage where the repo already tests UI; otherwise manual verification checklist in verification notes covering: checkoff, undo, create under/at cap, archive+confirm, restore at cap, Active/Archived switch, Home Update progress link.
- [ ] No prototype code imported by production (`rg` / build boundary).
- [ ] `npm run check` passes (`check:ui`, types, build, API tests).

## Reuse notes

[`TodayStrip.tsx`](../../../../../apps/web/src/features/progress/TodayStrip.tsx) / `today-streak-*` styles as baseline; `ChromeTab`, `Button`, `ModalLayer`, `TextField`; M1-03 API client. Copy patterns from prototype — do not import prototype modules.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Ticket status `Done`; board updated
- [ ] Committed as `F11 M2-01: …`
- [ ] End-of-task report given, including tests and **Issues found**

## Verification notes

_(filled when done)_
