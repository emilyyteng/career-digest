# MT-06: Track applied migrations so each runs once

**Status:** Done
**Blocked by:** (none)
**Implements:** n/a (maintenance)
**Type:** bug

## Found during

F08 M4-03 verification, 2026-10-13. Integration tests skipped with "tables can have at most 1600 columns". The user agreed the same day to a maintenance ticket, made it the priority, and approved the approach below.

## Evidence

- `migrate()` runs every file in `apps/api/src/sql` on every call and records nothing ([`db.ts` L17–26](../../../../apps/api/src/db.ts)). It's called on API startup (`index.ts` L20; `tsx watch` restarts on every save), by every script, and once per integration test file (`test/integrationSetup.ts` L11).
- `003_cycle_status.sql` adds `postings.cycle_status`; `007_drop_cycle_status.sql` drops it. Each run leaves one more dropped column, and Postgres counts dropped columns toward its 1,600 limit.
- On 2026-10-13 `postings` had 1,576 dropped columns on `career_digest_test` (full) and 841 on the dev database.
- The same design also re-runs data updates (for example `014`, `026`, `027`) forever, lets an edited old migration silently change every database, and lets two processes migrate at once.

## What to build

1. A `schema_migrations` table: file name, checksum, applied time. `migrate()` runs only files not recorded there.
2. Each file runs in its own transaction together with its tracking row, so a failure leaves nothing half-applied.
3. A Postgres advisory lock around the whole run, so concurrent starts wait instead of racing.
4. If an applied file's checksum changes, `migrate()` stops with an error that names the file and says to add a new migration instead.
5. Bootstrap: on a database without the table, every file runs once more (as today, so it's safe) and is then recorded. Nothing is marked by hand.

## Acceptance criteria

- [x] A second `migrate()` on an up-to-date database runs no files and leaves the count of dropped columns on every table unchanged (test).
- [x] An edited applied migration makes `migrate()` fail with a clear error naming the file (test).
- [x] Two concurrent `migrate()` calls both succeed and each file runs once (test).
- [x] A failing migration rolls back and isn't recorded (test).
- [x] `career_digest_test` is dropped and recreated; the suite runs on it with integration tests enabled. The scratch database `career_digest_scratch_test` is dropped.
- [x] The dev database is bootstrapped by the next `migrate()` with no data change, and its `postings` dropped-column count stops growing.

## Out of scope

- Reclaiming the dropped columns already on the dev `postings` table (MT-07).
- The flaky 404s (MT-03).
- Switching to a migration library.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run build` passes
- [x] `npm test` passes (MT-03 flakiness aside)
- [x] API typecheck: no new errors
- [x] Committed as `MT-06: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

- `migrate()` in `db.ts` takes an advisory lock on one connection, creates `schema_migrations` if missing, skips recorded files (stopping if a checksum changed), and runs each new file plus its tracking row in one transaction. It takes an optional `sqlDir` so tests can use throwaway files. `npm run migrate` now prints what it applied.
- Tests: `migrate.integration.test.ts`, 4 tests (second run is a no-op with no new dropped columns; edited file refused; three concurrent runs apply a file once; a failing file rolls back and isn't recorded). They use files named `9xx_mt06_*` in a temp folder and remove their tracking rows and tables afterwards.
- No migration file uses statements that can't run in a transaction (`CONCURRENTLY`, `ADD VALUE`, its own `BEGIN`/`COMMIT`); checked by search.
- Test database: `career_digest_test` dropped and recreated (2026-10-13; no other connections first). Fresh, it has 1 dropped column on `postings` (003 then 007, once). After 5 full `npm test` runs it's still 1. Results: 208/208 in 3 runs, 1 unrelated failure in 2 runs (MT-03).
- Dev database: bootstrapped when the running `tsx watch` dev server restarted on the `db.ts` edit. All 27 files recorded, points ledger unchanged (sum and balance 1765), `postings` at 845 dropped columns (841 earlier in the day, from restarts before tracking). A further `npm run migrate` printed "Nothing to apply" and the count stayed at 845. Reclaiming those is MT-07.
- `career_digest_scratch_test` dropped.
