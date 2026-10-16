# M3-01: Custom weekly targets schema

**Status:** Draft
**Blocked by:** (none — may start after M1-03; UI waits on M2-03)
**Implements:** R3.1, R3.5, R3.10, R.7, R.8, R.10, B3, B4 (from `../../spec.md`)
**Type:** build

## What to build

Database support for **custom weekly targets** as a separate namespace from daily habits: identity (name, target, archive), and per-week progress that resets while name/target carry forward.

## Acceptance criteria

- [ ] Migration for custom weekly goal identity: id, name, target_count (default 3 at create time in API), created_at, archived_at.
- [ ] Per-week progress storage for customs (week_start + goal id + done count), aligned with how LC/apps weekly rows/records work so close-week and streaks can extend cleanly in M3-02.
- [ ] Separate tables/namespace from daily custom habits (R.8); same display name allowed in both systems.
- [ ] Soft archive only (no hard delete) (R.10).
- [ ] Additive, re-runnable-safe migration; no edits to prior committed SQL files.
- [ ] `npm run check` passes after migrate.

## Edge cases

- Target must remain ≥ 1 at DB or API layer (API enforces in M3-02).
- Archived goals retain historical week rows for weeks-in-a-row history after restore.
- Cap not enforced in DB constraints.

## Tests

- [ ] Migration covered by migrate integration suite.

## Reuse notes

[`weeklyGoals.ts`](../../../../../apps/api/src/weeklyGoals.ts) / existing weekly goal SQL tables as patterns; do not overload apps/LC slots for customs.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Reuse check done
- [ ] Ticket status `Done`; board updated
- [ ] Committed as `F11 M3-01: …`
- [ ] End-of-task report given, including **Issues found**

## Verification notes

_(filled when done)_
