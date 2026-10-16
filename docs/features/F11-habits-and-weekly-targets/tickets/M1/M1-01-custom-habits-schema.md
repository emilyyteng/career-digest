# M1-01: Custom daily habits schema

**Status:** Draft
**Blocked by:** (none)
**Implements:** R1.1–R1.4, R1.6, R.7, R.8, R.10, B1, B4 (from `../../spec.md`)
**Type:** build

## What to build

Database support for named custom **daily** habits and their **qualifying days** (boolean checkoffs). Streak **length is not stored** — it will be derived from checkoff days in M1-02 (same pattern as LC/apps).

## Acceptance criteria

- [ ] Migration adds habit identity storage: stable id, display name, created_at (creation order), archived_at (null = active). No hard-delete path.
- [ ] Migration adds per-habit qualifying days (local calendar date + habit id). Presence of a day = checked off / qualifies; absence = not. Unique (habit_id, local_date).
- [ ] Name column can hold trimmed strings up to 50 characters (API enforces empty/length in M1-03; DB may use a reasonable varchar).
- [ ] Duplicate names among habits are allowed at the DB layer (identity is the row).
- [ ] Archived habits remain in the table (soft archive only); checkoff history is retained with the habit.
- [ ] Daily habit tables are a **separate namespace** from any future custom weekly targets (R.8) — no shared id space with weekly customs.
- [ ] Migration is additive, re-runnable where required (`IF NOT EXISTS` / guarded), and never edits a prior committed migration file.
- [ ] Fresh migrate + API tests still pass (`npm run check`).

## Edge cases

- Archiving does not delete checkoff rows (restore later must see history; length may show a break after missed days — R1.6).
- No `length` / `current_streak` column — length is computed later from days.
- Cap (3 active customs) is **not** enforced by a DB constraint; leave for API (R.7).

## Tests

- [ ] Migration applies cleanly on empty DB and on current schema (covered by existing migrate integration tests once file is added).
- [ ] No unit tests required beyond migrate suite unless schema helpers are introduced.

## Reuse notes

Follow migration conventions in `apps/api/src/sql/` (next free number). Pattern: soft archive columns elsewhere; LC qualifying days via `leetcode_daily` (customs need their own checkoff table instead).

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md` (N/A — API/SQL only)
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Ticket status `Done`; board updated
- [ ] Committed as `F11 M1-01: …`
- [ ] End-of-task report given, including **Issues found**

## Verification notes

_(filled when done)_
