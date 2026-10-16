# M1-02: Custom habit streaks + points

**Status:** Done
**Blocked by:** (none — M1-01 Done)
**Implements:** R.3, R.4, R1.5–R1.7, R.6, B1, B5 (from `../../spec.md`)
**Type:** build

## What to build

Domain logic that treats each custom habit’s checkoff dates as qualifying days, computes `{ length, todayCounts }` with the same rules as LC/apps, and awards/reverses **today-only** streak points via the existing ledger formulas.

## Acceptance criteria

- [x] Load qualifying days for a habit from the checkoff table; compute view with `currentStreak` (or shared equivalent) from [`streaks.ts`](../../../../../apps/api/src/streaks.ts).
- [x] Today does not break the streak until the day ends (if today unchecked, length is the run through yesterday when that run exists).
- [x] On today checkoff: award daily `min(20, 2×length)` and milestone `5×length` at 5/10/20/30/50/100 when applicable — same helpers as LC/apps (`streakDailyPoints` / `streakMilestonePoints`); category `streak`.
- [x] On today undo: reverse today’s daily earn and any milestone that day completed (same reinstate/reverse pattern as `syncStreakForDay`).
- [x] Past local dates: changing checkoffs (if ever exposed) must **not** award or reverse points (R1.7 / R5.25 timing). F11 API may only expose today checkoff; domain still guards `localDate === today`.
- [x] Archived habits: no points while archived; days still exist for history; Active computation ignores archived habits (or callers pass only active).
- [x] Custom habits never alter LC/apps qualifying days or weekly LC/apps membership (B5).
- [x] Ledger `source_id` space is distinct per habit (e.g. `habit:<uuid>:<date>` / milestone keys including habit id) so LC/apps and habits do not collide.
- [x] Respect `streak_state.launch_date` the same way LC/apps do (no awards before launch).

## Edge cases

- Checkoff when length becomes 1 → pay day-1 daily; undo → reverse.
- Checkoff that completes a milestone length → pay daily + milestone; undo → reverse both.
- Re-checkoff after undo same day → reinstate (ledger reinstate path).
- Habit archived mid-day after checkoff: points already paid today stay unless product later defines clawback — **default: leave ledger as-is**; archived habit simply stops appearing Active and earns nothing on future days. Record in verification if code chooses otherwise.
- Empty checkoff set → `{ length: 0, todayCounts: false }`.
- Timezone: local dates use the same user tz as Progress (`localDateInTimezone`).

## Tests

- [x] **Unit:** `currentStreak` over habit day sets (today counts / not; gap breaks; yesterday-only run) — shared `streaks.test.ts` + habit integration coverage of day loading.
- [x] **Unit or integration:** today checkoff awards expected daily amount; undo reverses; milestone at length 5; no points when `localDate !== today`.
- [x] **Unit or integration:** second habit’s earns do not collide with first or with `lc:` / `apps:` source ids.
- [x] Existing LC/apps streak tests still pass unchanged.

## Reuse notes

[`streaks.ts`](../../../../../apps/api/src/streaks.ts) `currentStreak`, shared `syncStreakPointsForDay`, `ensureStreakLaunch`; [`pointsFormulas.ts`](../../../../../apps/api/src/pointsFormulas.ts); [`pointsLedger.ts`](../../../../../apps/api/src/pointsLedger.ts).

Added: `habitQualifyingDays`, `getHabitStreak`, `syncHabitStreakForDay`, `setHabitCheckoff`, `habitDailySourceId` / `habitMilestoneSourceId`. Mid-day archive: sync is a no-op (no award, no reverse) so prior earns stay.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md` (N/A — API)
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Ticket status `Done`; board updated
- [x] Committed as `F11 M1-02: …`
- [x] End-of-task report given, including **Issues found**

## Verification notes

`npm run check` passed (365 tests). Habit integration: `streaks.habits.api.test.ts` (9). Archived mid-day: leave ledger as-is (sync no-op while archived). Commit hash in board follow-up.
