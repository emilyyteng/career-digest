# M1-01: Custom daily habits schema

**Status:** Done
**Blocked by:** (none)
**Implements:** R1.1–R1.4, R1.6, R.7, R.8, R.10, B1, B4 (from `../../spec.md`)
**Type:** build

## What to build

Database support for named custom **daily** habits and their **qualifying days** (boolean checkoffs). Streak **length is not stored** — it will be derived from checkoff days in M1-02 (same pattern as LC/apps).

## Acceptance criteria

- [x] Migration adds habit identity storage: stable id, display name, created_at (creation order), archived_at (null = active). No hard-delete path.
- [x] Migration adds per-habit qualifying days (local calendar date + habit id). Presence of a day = checked off / qualifies; absence = not. Unique (habit_id, local_date).
- [x] Name column can hold trimmed strings up to 50 characters (API enforces empty/length in M1-03; DB may use a reasonable varchar).
- [x] Duplicate names among habits are allowed at the DB layer (identity is the row).
- [x] Archived habits remain in the table (soft archive only); checkoff history is retained with the habit.
- [x] Daily habit tables are a **separate namespace** from any future custom weekly targets (R.8) — no shared id space with weekly customs.
- [x] Migration is additive, re-runnable where required (`IF NOT EXISTS` / guarded), and never edits a prior committed migration file.
- [x] Fresh migrate + API tests still pass (`npm run check`).

## Edge cases

- Archiving does not delete checkoff rows (restore later must see history; length may show a break after missed days — R1.6).
- No `length` / `current_streak` column — length is computed later from days.
- Cap (3 active customs) is **not** enforced by a DB constraint; leave for API (R.7).

## Tests

- [x] Migration applies cleanly on empty DB and on current schema (covered by existing migrate integration tests once file is added).
- [x] No unit tests required beyond migrate suite unless schema helpers are introduced.

## Reuse notes

Follow migration conventions in `apps/api/src/sql/` (next free number). Pattern: soft archive columns elsewhere; LC qualifying days via `leetcode_daily` (customs need their own checkoff table instead).

Added `042_custom_daily_habits.sql`: `custom_habits` + `custom_habit_days` (PK habit_id+local_date, CASCADE).

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md` (N/A — API/SQL only)
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Ticket status `Done`; board updated
- [x] Committed as `F11 M1-01: …`
- [x] End-of-task report given, including **Issues found**

## Verification notes

`npm run check` passed (migrate.integration.test included). Tables: `custom_habits` (id, name varchar(50), created_at, archived_at), `custom_habit_days` (habit_id, local_date). Commit hash in board follow-up.
