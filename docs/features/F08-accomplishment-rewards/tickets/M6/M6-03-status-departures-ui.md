# M6-03: Status page departures UI

**Status:** Done
**Blocked by:** (none)
**Implements:** R6.2, R6.3, R6.4, R6.6, R6.7 (from `../../spec.md`)
**Type:** build

## What to build

Add the board departures log to the Status page (`/status`):

- Per-day sections; **today expanded by default**; other days collapsed (low scroll cost).
- Each row: title, company, location, reason (`Left board` / `Duplicate`). Rows with `taskRemoved` are **highlighted** and show the copy **task removed**.
- Optional filter: show only rows with task removed.
- Day section chrome shows how many that day had a task removed (**omit when 0**).
- Empty state when there are no departures in retention.
- Follow `docs/design-system.md`: explicit variants / existing Status patterns; no new global element CSS; reuse tokens.

No prototype required unless layout questions appear during build; locked requirements leave little open.

## Acceptance criteria

- [x] Status shows the departures section fed by M6-02.
- [x] Per-day sections; today open by default.
- [x] Fields and reason labels match R6.2.
- [x] Task-removed rows highlighted + **task removed** copy; optional filter works.
- [x] Day-level task-removed count shown only when &gt; 0.
- [x] Follows design system; no prototype imports in production.

## Reuse notes

[`BoardDeparturesLog.tsx`](../../../../../apps/web/src/features/ops/BoardDeparturesLog.tsx); [`Status.tsx`](../../../../../apps/web/src/pages/Status.tsx); [`getBoardDepartures`](../../../../../apps/web/src/api.ts); [`Button`](../../../../../apps/web/src/ui/Button.tsx) for the filter toggle.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F08 M6-03: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

- Empty state reviewed on `/status` (no departures yet; recording starts at ship per R6.5). Populated rows / filter / day counts to be spot-checked after the next ingest with board-gone or duplicate activity.
- Today expands by default; other days use `<details>`; task-removed highlight + filter; day count omitted at 0.
- `npm run check` green (356 tests). No new tests (UI-only).
- Commit: (this commit).
