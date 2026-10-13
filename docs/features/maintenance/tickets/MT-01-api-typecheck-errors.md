# MT-01: Fix API typecheck errors and keep them from coming back

**Status:** Ready
**Blocked by:** (none)
**Implements:** n/a (maintenance)
**Type:** bug

## Found during

Checkpoint verification on 2026-10-12, before the docs-process setup. On 2026-10-12 the user agreed to one ticket for all 17 errors, handled outside feature work, with guarding against regressions included in scope.

## Evidence

`npx tsc --noEmit -p apps/api` reports 17 errors (line numbers as of `70c005d`). They fall into three groups with different causes.

### Group A: `Client` vs `PoolClient` typing (14 errors, shared root cause)

A connection variable typed as `Client` (or `Pool | Client`) is passed where `Queryable` (`Pool | PoolClient`) or `PoolClient` is expected, or has `.release()` called on it.

| File | Lines | Error |
|------|-------|-------|
| `apps/api/src/tasks.ts` | 386, 480, 666, 906, 919 | `Pool \| Client` not assignable to `Queryable` |
| `apps/api/src/tasks.ts` | 912 | `Client` not assignable to `Queryable` |
| `apps/api/src/tasks.ts` | 793 | `Client` not assignable to `PoolClient` |
| `apps/api/src/tasks.ts` | 410, 567, 681, 872, 943, 984 | `release` does not exist on `Client` |
| `apps/api/src/interviews.ts` | 611 | `release` does not exist on `Client` |

13 predate M2. Line 906 (`transferTaskReflectionsToApplication(queryable, …)`) came with M2 (`d201cde`).

### Group B: comparison against `"todo"`, which is outside the status type (2 errors)

`apps/api/src/applications.ts` lines 230 and 259 check `input.status !== "todo"`, but `"todo"` isn't in the `ApplicationStatus` type (`"applied" | "interviewing" | "accepted" | "declined"`).

`"todo"` is still a live database status. Every application task has a to-do application row behind it, inserted directly in `tasks.ts`. It never reaches `createApplication`, though, because `POST /api/applications` rejects backlog statuses. So the condition is always true at runtime: creating an application always completes its open application tasks. That matches the intent of `4258616` ("Complete open application task when marking Applied from Jobs").

**Fix direction (updated 2026-10-13):** remove the check, which keeps current behavior. Separately, F08 R2.13 requires the Jobs path to complete the task through the same flow as Tasks, so the code here is likely to change in that bug fix too.

### Group C: route parameter typing (1 error)

`apps/api/src/routes.ts` line 737 passes `req.params.id` (typed `string | string[]`) to `addApplicationDocument`, which expects `string`.

### Why this went unnoticed

The API `build` script only prints a message (`apps/api/package.json`); nothing in the normal workflow runs `tsc` on the API. The web build does typecheck (`tsc -b && vite build`).

## What to build

1. The API typechecks cleanly: all 17 errors resolved, with no unintended behavior change.
2. A single command typechecks the API (and ideally runs every check in the Definition of done), so new type errors fail loudly instead of accumulating. `AGENTS.md` → Definition of done and Known baseline are updated to use it.

## Acceptance criteria

- [ ] Group A: confirm the shared root cause at each call site before changing it; if any error has a different cause, stop and report
- [ ] Group A: fixed by typing pool checkouts as `PoolClient`; transactions still begin, commit/rollback and release as before
- [ ] Group B: **ask the user** whether creating an application should always complete its open application tasks before fixing; record the answer in this ticket
- [ ] Group C: `req.params.id` narrowed to `string` without changing route behavior
- [ ] `npx tsc --noEmit -p apps/api` reports 0 errors
- [ ] A typecheck command exists for the API (e.g. a `typecheck` script) and a single root command runs the API typecheck alongside the existing build and tests (e.g. `npm run check`)
- [ ] `AGENTS.md` Known baseline no longer lists typecheck errors; its Definition of done references the new command
- [ ] `npm test` passes (flaky baseline aside, see MT-03)

## Out of scope

- Consolidating the duplicated `Queryable` alias (MT-04). Use the existing alias in each file.
- Fixing flaky tests (MT-03).
- Pre-commit hooks or CI. The goal here is one command that agents and the user run.

## Reuse notes

Use the existing `Queryable` alias in each file being fixed; don't introduce another one.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run build` passes
- [ ] `npm test` passes (known baseline aside)
- [ ] API typecheck reports 0 errors
- [ ] Committed as `MT-01: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(Filled in when done.)
