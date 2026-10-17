# M3-05: Home Targets for custom weeklies

**Status:** Done
**Blocked by:** —
**Implements:** R3.2 (from `../../spec.md`)
**Type:** build

## What to build

Show **unmet custom weekly targets** on Home **Targets** (Sunday / unmet pattern) alongside apps/LC weekly target rows.

Prototype reference: `/prototype/f11/habits/weekly` Home Targets mock.

## Acceptance criteria

- [x] When Home shows weekly Targets (existing Sunday / unmet rules), each unmet **active** custom weekly appears with the same family of row treatment as apps/LC targets (R3.2).
- [x] Met customs (done ≥ target) do not appear.
- [x] Archived customs do not appear.
- [x] Row links or copy navigate toward Progress This week where sensible (match apps/LC target row behavior).
- [x] No change to apps/LC target membership rules beyond adding customs to the feed.

## Edge cases

- No customs / all met: Targets section behaves as today (apps/LC only or empty).
- Custom with same display name as a daily habit: still shows (separate namespace).
- Mid-week Home: only show Targets when existing Home rules say to (don’t invent a new day rule).

## Tests

- [x] API/unit if Home upcoming builder is extended: customs included/excluded correctly.
- [x] Manual: seed unmet custom → visible on Targets when apps/LC targets would show; mark met → gone.
- [x] `npm run check` passes.

## Reuse notes

[`homeUpcoming.ts`](../../../../../apps/api/src/homeUpcoming.ts) `loadWeeklyGoalTargetItems`; Home weekly_goal row UI unchanged (title `Weekly · {name}`, `slot: "custom"` + `customGoalId`).

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] Ticket status `Done`; board updated
- [x] Committed as `F11 M3-05: …`
- [x] End-of-task report given, including **Issues found**

## Verification notes

- Integration test in `homeWeeklyGoals.api.test.ts`: unmet active custom on Sunday; met + archived omitted.
- `npm run check` clean (390 tests).
