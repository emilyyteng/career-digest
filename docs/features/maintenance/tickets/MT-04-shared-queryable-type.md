# MT-04: Share one `Queryable` type across the API

**Status:** Ready
**Blocked by:** MT-01 (both touch the same database-typing code; doing MT-01 first avoids conflicting edits)
**Implements:** n/a (maintenance)
**Type:** refactor

## Found during

MT-01 scoping on 2026-10-12. The user agreed on 2026-10-12 to a maintenance ticket.

## Evidence

The same alias, `type Queryable = Pool | PoolClient;`, is declared privately in 11 files under `apps/api/src/`:

`applications.ts`, `homeUpcoming.ts`, `interviews.ts`, `pointsAwards.ts`, `pointsLedger.ts`, `progress.ts`, `taskCategories.ts`, `taskSubtasks.ts`, `tasks.ts`, `trackedBoards.ts`, `weeklyGoals.ts`.

None of them export it, so each new module copies it again.

## What to build

One exported `Queryable` type in a shared API module. All 11 files import it instead of declaring their own. No behavior change.

## Acceptance criteria

- [ ] Exactly one `Queryable` declaration in `apps/api/src/`, exported from a shared module (pick an existing database module if one fits; otherwise say why a new one is needed)
- [ ] All 11 files import it; no local copies remain
- [ ] API typecheck still reports 0 errors (MT-01's command)
- [ ] `npm test` passes

## Out of scope

- Changing which connection types are accepted.
- Other refactors in the touched files.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Committed as `MT-04: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(Filled in when done.)
