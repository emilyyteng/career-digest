# M6-03: Status page departures UI

**Status:** Ready
**Blocked by:** M6-02
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

- [ ] Status shows the departures section fed by M6-02.
- [ ] Per-day sections; today open by default.
- [ ] Fields and reason labels match R6.2.
- [ ] Task-removed rows highlighted + **task removed** copy; optional filter works.
- [ ] Day-level task-removed count shown only when &gt; 0.
- [ ] Follows design system; no prototype imports in production.

## Reuse notes

[`Status.tsx`](../../../../../apps/web/src/pages/Status.tsx) ops layout; M6-02 client in [`api.ts`](../../../../../apps/web/src/api.ts); collapse/expand patterns already on Status or Progress day stacks if any fit; filter control patterns from F09 interim chips only if already shippable — otherwise a simple Status-local toggle using existing `secondary` / `ui-btn` variants.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M6-03: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(filled when done)
