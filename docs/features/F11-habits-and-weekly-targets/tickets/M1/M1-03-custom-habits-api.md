# M1-03: Custom habits HTTP API + today payload

**Status:** Done
**Blocked by:** (none — M1-02 Done)
**Implements:** R1.1–R1.10, R.5, R.7, R1.9 (payload shape), B1–B2, B4, B6 (from `../../spec.md`)
**Type:** build

## What to build

HTTP API for creating, renaming, archiving, restoring, and checking off custom daily habits for **today**, plus extending Progress today (and any list endpoints the strip needs) so the UI can render Active/Archived customs beside derived apps/LC.

## Acceptance criteria

### Mutations

- [x] **Create** habit: trimmed name required; max 50 chars; empty rejected; duplicates allowed; rejected when active custom count ≥ 3 with a clear error message (R.7); new habit starts with no checkoffs / length 0.
- [x] **Rename:** updates label only; does not reset checkoff history or identity (R1.3, B1).
- [x] **Archive:** sets archived; habit leaves Active; frees a custom cap slot; does not hard-delete (R1.6, R.10).
- [x] **Restore:** clears archived; rejected at custom cap with clear message (no silent swap) (R.7).
- [x] **Checkoff today / undo today:** boolean only; calls M1-02 points sync for today; cannot check off “for” another date via this API (R1.5, R1.7).

### Reads

- [x] List or include in today payload: active customs in **creation order** with `{ id, name, length, todayCounts }` (and archived list for Archived view: customs only, no apps/LC).
- [x] Extend `GET /progress/today` (or documented companion) so clients get apps/LC streaks **and** custom habit streak views without a second round-trip if practical; apps/LC remain derived and unchanged (R.5).
- [x] Custom subtitle data is `todayCounts` → UI maps to done / not yet (R1.9); do not invent a “count completed today” for customs.

### Caps & safety

- [x] Cap counts **active** customs only; archived do not consume (B4).
- [x] Apps/LC cannot be archived or renamed through this API (B6).
- [x] Invalid ids → 404; validation errors → 400 with readable messages.

## Edge cases

- Create at exactly 3 active → 4th create fails; archive one → create succeeds.
- Restore at 3 active → fails with message naming the cap.
- Rename to same name as another habit → allowed.
- Rename to whitespace / >50 → rejected.
- Double checkoff today → idempotent (still done; no double earn).
- Undo when not checked → idempotent no-op (no spurious reverse).
- Concurrent create near cap: still never exceed 3 active (transaction or equivalent).

## Tests

- [x] **Integration:** create → appears in today payload with length 0 / todayCounts false.
- [x] **Integration:** checkoff → todayCounts true, length ≥ 1, streak ledger earn present; undo → reverses earn and todayCounts false.
- [x] **Integration:** archive removes from active list / frees cap; restore blocked at cap; restore succeeds under cap.
- [x] **Integration:** rename persists; checkoff history / length continuity after rename.
- [x] **Integration:** create rejected at cap; empty name rejected.
- [x] **Regression:** LC/apps streak fields on today payload unchanged in shape and behavior.

## Reuse notes

[`customHabits.ts`](../../../../../apps/api/src/customHabits.ts); M1-02 `setHabitCheckoff` / streak views; routes beside Progress. Companion `GET /habits`; mutations under `/habits`. Cap enforced with `SELECT … FOR UPDATE` in create/restore transactions.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md` (N/A — API)
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Ticket status `Done`; board updated
- [x] Committed as `F11 M1-03: …`
- [x] End-of-task report given, including **Issues found**

## Verification notes

`npm run check` passed (371 tests). `customHabits.api.test.ts` (6). Archived habits reject checkoff at the API. Commit hash in board follow-up.
