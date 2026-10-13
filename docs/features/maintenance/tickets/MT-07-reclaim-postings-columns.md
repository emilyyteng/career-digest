# MT-07: Reclaim dropped-column slots on the dev `postings` table

**Status:** Draft (not scheduled)
**Blocked by:** MT-06
**Implements:** n/a (maintenance)
**Type:** cleanup

## Found during

F08 M4-03 verification, 2026-10-13. The user chose on 2026-10-13 not to rebuild now and to keep this ticket so it isn't forgotten.

## Evidence

Before MT-06, every `migrate()` re-ran `003` (add `postings.cycle_status`) and `007` (drop it). On 2026-10-13 the dev `postings` table had 841 dropped columns, 865 of Postgres's 1,600 column slots in use. Postgres never frees dropped-column slots; only rebuilding the table does. MT-06 stops the growth, so roughly 735 slots remain for future columns. Nothing is broken.

## What to build

Rebuild the dev `postings` table so its dropped-column slots are freed, with no data loss. For example: take a full backup, then dump and restore the table (or the whole database) and check row counts and foreign keys (`applications`, `posting_feedback`) before and after.

## Acceptance criteria

- [ ] Backup taken first and its restore checked.
- [ ] `postings` has 0 dropped columns afterwards.
- [ ] Row counts for `postings` and every table that references it match before and after.
- [ ] The app works against the rebuilt database (Jobs, ranked list, applications linked to postings).

## Out of scope

- Schema changes to `postings`.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] Committed as `MT-07: …` (if any repo change is needed)
- [ ] End-of-task report given, including **Issues found**

## Verification notes

(Filled in when done.)
