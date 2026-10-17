# M3-02: Custom weekly API + week-close Seeds

**Status:** Done
**Blocked by:** —
**Implements:** R3.1–R3.6, R3.9–R3.10, R3.4, R.7, B3–B4 (from `../../spec.md`)
**Type:** build

## What to build

API and domain for custom weekly targets: CRUD/archive/restore, mid-week target edits, ± progress, inclusion in weekly snapshot, week-close Seeds (+20/unit, +100 met), and display-only weeks-in-a-row (≥2) derived from closed records (same idea as `metWeeksStreaks` — **not** a stored counter).

## Acceptance criteria

- [x] **Create:** name + target (default **3**); reject at 6 active customs with clear message.
- [x] **Rename** / **archive** / **restore** (restore blocked at cap with message); archived do not consume cap.
- [x] **Patch target** mid-week (near-label stepper data); target ≥ 1; does not go through pencil semantics.
- [x] **± progress** for the current week only (done never &lt; 0); apps weekly progress remains task-derived only (no apps ± API here).
- [x] Weekly snapshot includes apps, LC, and active customs (creation order among customs); archived available for Archived UI.
- [x] Name + target **carry** into new weeks; **done resets** each week (R3.5).
- [x] Week close: customs pay same schedule as apps/LC — +20 per unit toward target, +100 flat when met (R3.4); points at close only.
- [x] `metWeeksStreak` (or equivalent) for customs from closed records; UI shows flame when ≥ 2 (R3.9).
- [x] No today-LC endpoints mixed into this surface.

## Edge cases

- ± when done = 0: decrement no-op or 400 — pick consistent with LC weekly.
- Target lowered below current done: allow (overflow display like LC) or clamp — match LC weekly behavior.
- Week boundary: after close, new week done = 0; streak updates from closed mets.
- Create/restore race at cap: never exceed 6 active.
- Archived goal: no ±; not in Active snapshot list.

## Tests

- [x] **Integration:** create → in snapshot; ± updates done; rename; archive/restore; restore at cap fails.
- [x] **Integration:** target patch persists across week boundary with done reset (simulate week start).
- [x] **Integration:** week close awards +20×units and +100 when met for a custom; unmet pays units only (align with existing week-close tests for LC/apps).
- [x] **Unit/integration:** consecutive met weeks → streak count; broken week resets streak.
- [x] Regression: apps/LC weekly snapshot and close behavior unchanged.

## Reuse notes

[`weeklyGoals.ts`](../../../../../apps/api/src/weeklyGoals.ts) close/ensure/pace/`metWeeksStreaks`; week-close Seeds paths used by LC/apps; extend rather than fork formulas. Reused `weeklyRecordPoints` / `POINTS`, `computePace`, `closeDueWeeks` hook; new source id `weeklyGoalSourceIdCustom`.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Reuse check done
- [x] Ticket status `Done`; board updated
- [x] Committed as `F11 M3-02: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

- `npm run check` clean (389 tests), including `customWeeklyGoals.api.test.ts`.
- − at done 0 → 409 (same idea as LC weekly).
- Overflow past target allowed; points at week close only via `closeCustomWeeklyWeek` from `closeWeek`.
