# M3-05: Home Targets for custom weeklies

**Status:** Draft
**Blocked by:** M3-02
**Implements:** R3.2 (from `../../spec.md`)
**Type:** build

## What to build

Show **unmet custom weekly targets** on Home **Targets** (Sunday / unmet pattern) alongside apps/LC weekly target rows.

Prototype reference: `/prototype/f11/habits/weekly` Home Targets mock.

## Acceptance criteria

- [ ] When Home shows weekly Targets (existing Sunday / unmet rules), each unmet **active** custom weekly appears with the same family of row treatment as apps/LC targets (R3.2).
- [ ] Met customs (done ≥ target) do not appear.
- [ ] Archived customs do not appear.
- [ ] Row links or copy navigate toward Progress This week where sensible (match apps/LC target row behavior).
- [ ] No change to apps/LC target membership rules beyond adding customs to the feed.

## Edge cases

- No customs / all met: Targets section behaves as today (apps/LC only or empty).
- Custom with same display name as a daily habit: still shows (separate namespace).
- Mid-week Home: only show Targets when existing Home rules say to (don’t invent a new day rule).

## Tests

- [ ] API/unit if Home upcoming builder is extended: customs included/excluded correctly.
- [ ] Manual: seed unmet custom → visible on Targets when apps/LC targets would show; mark met → gone.
- [ ] `npm run check` passes.

## Reuse notes

[`homeUpcoming.ts`](../../../../../apps/api/src/homeUpcoming.ts) / Home Targets UI from F08; M3-02 snapshot fields.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] Ticket status `Done`; board updated
- [ ] Committed as `F11 M3-05: …`
- [ ] End-of-task report given, including **Issues found**

## Verification notes

_(filled when done)_
