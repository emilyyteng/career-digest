# M6-01: Departure log schema and write paths

**Status:** Ready
**Blocked by:** (none)
**Implements:** R6.1, R6.2 (storage), R6.5, R6.6 (task-removed semantics), R6.7 (retention / purge) (from `../../spec.md`)
**Type:** build

## What to build

Persist board departures before the posting row is deleted, so Status can explain vanished application tasks (R6.4).

- New migration (next free `0NN_….sql`; do not edit applied files) for a `board_departures` (or equivalent) table: title, company display string, location, reason (`left_board` | `duplicate`), `task_removed` boolean, `departed_at` timestamptz, and whatever ids are useful for tests (optional `posting_id` is fine even though the posting will be gone).
- **Write before delete** on in-scope paths only:
  - Board-gone deletes in `reconcileRemovedFromBoard` (after determining the posting will be deleted, not retained for applied+).
  - Duplicate-merge deletes of the Simplify row in `mergeDuplicatePostings`.
- **Do not** log filter rejects (`dropUntrackedRejected`) or applied+ retentions (`removed_from_board_at` only).
- **`task_removed`:** true only when an open application task is **deleted** in that event. Snapshot this *before* `clearTodoPipelineForGonePostings` / task deletes. Duplicate merges that only **repoint** `tasks.posting_id` must log `task_removed = false`.
- Company string at write time uses the Jobs/Tasks rule (Simplify → `department` when set).
- **Purge:** delete rows whose local calendar day is before “yesterday” relative to a chosen server clock **or** purge entries older than the next local day per R6.7. **Must not** purge inside the read/GET handler. Run purge on a day boundary — prefer at the start of ingest and/or merge-duplicate jobs (and document which). No backfill of historical departures (R6.5).

## Acceptance criteria

- [ ] Migration creates the table; `migrate()` applies cleanly on a fresh DB.
- [ ] Board-gone delete inserts a `left_board` row with correct fields and `task_removed` when an open app task was deleted.
- [ ] Applied+ retained postings produce **no** departure row.
- [ ] Duplicate Simplify delete inserts a `duplicate` row; `task_removed` is false when the task was only repointed.
- [ ] Filter-reject deletes produce **no** departure row.
- [ ] Purge removes expired rows without being invoked from the log GET (GET may land in M6-02; if this ticket adds a temporary GET for tests, it still must not purge-on-read).
- [ ] API/integration tests cover the write and purge rules above.

## Reuse notes

[`ingest.ts`](../../../../../apps/api/src/ingest.ts) `reconcileRemovedFromBoard` / `clearTodoPipelineForGonePostings`; [`mergeDuplicatePostings.ts`](../../../../../apps/api/src/mergeDuplicatePostings.ts); employer display pattern in [`tasks.ts`](../../../../../apps/api/src/tasks.ts) / [`jobs.ts`](../../../../../apps/api/src/jobs.ts) (`CASE WHEN source = 'simplify' THEN department…`).

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Reuse check done
- [ ] Committed as `F08 M6-01: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(filled when done)
