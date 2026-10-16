# M2-01: Habits strip on Home + Progress

**Status:** Done
**Blocked by:** (none — M1 Done)
**Implements:** R1.8–R1.10, R1.5, R1.9, R.5, R.7, R1.14, Q11, Q14 (from `../../spec.md`)
**Type:** build

## What to build

Production **Habits** strip shared by Home and Progress → This week, matching M0-01 verdict **D**: mark hit-target checkoff, ghost archived, ChromeTabs Active/Archived, create slot, per-custom pencil (rename/archive + confirm).

Prototype reference: `/prototype/f11/habits/strip` (keep until this ticket and M2-02 are Done).

## Acceptance criteria

- [x] Heading **Habits**; same chrome on **Home** and **Progress** (R1.8).
- [x] Active / Archived as **ChromeTabs**; Archived disabled when no archived customs; Archived shows **customs only** (no apps/LC).
- [x] Active order: Apps, LC (derived display-only), customs by creation order, **create** slot when active customs &lt; 3; create gone at cap.
- [x] Apps/LC: `N completed today` subtitle; no pencil/archive; not interactive for checkoff (R.5, R1.9).
- [x] Customs: mark ✓/− top-right like Apps/LC marks; pencil beside `{name} daily streak`; subtitle **done** / **not yet**; checkoff/undo wired to API (Q11, R1.5, R1.10).
- [x] Pencil → ModalLayer: rename + Archive (danger) + Cancel + Save; Archive requires **confirm** modal; rename/archive call API.
- [x] Create flow: name modal; respects cap; clear error if API rejects.
- [x] Archived: **ghost stamp** look; Restore; restore-at-cap shows clear message; restoring last archived returns to Active and disables Archived tab (Q14).
- [x] Home: **Update progress →** bottom-right of the strip → Progress This week (R1.8).
- [x] Pill metrics/spacing align with existing apps/LC streak pills; pencil does not reflow the label line.
- [x] Design system: component variants / tokens only; shared `ModalLayer`; no prototype imports in production.

## Edge cases

- Zero customs: create slot visible; Archived disabled.
- Three customs: no create slot; restore blocked with message.
- Empty / overlong create or rename names: surface API validation.
- Loading and error states for strip fetch/mutations (no silent failure).
- Apps/LC still render if customs API fails (degrade gracefully if split fetches).

## Tests

- [x] Prefer component/integration coverage where the repo already tests UI; otherwise manual verification checklist in verification notes covering: checkoff, undo, create under/at cap, archive+confirm, restore at cap, Active/Archived switch, Home Update progress link.
- [x] No prototype code imported by production (`rg` / build boundary).
- [x] `npm run check` passes (`check:ui`, types, build, API tests).

## Reuse notes

Baseline from former [`TodayStrip.tsx`](../../../../../apps/web/src/features/progress/TodayStrip.tsx) / `today-streak-*` metrics; production [`HabitsStrip.tsx`](../../../../../apps/web/src/features/progress/HabitsStrip.tsx). `ChromeTab`, `Button`, `ModalLayer`, `TextField`; M1-03 API client. Add reflection / Log LC deferred to M2-02.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Ticket status `Done`; board updated
- [x] Committed as `F11 M2-01: …`
- [x] End-of-task report given, including tests and **Issues found**

## Verification notes

`npm run check` passed (371 tests). No production imports of `prototype/f11`. Manual checklist (dev): checkoff/undo, create under & at cap, archive+confirm, restore at cap (error message), Active/Archived tabs, Home Update progress → `/progress`. Commit hash in board follow-up.
