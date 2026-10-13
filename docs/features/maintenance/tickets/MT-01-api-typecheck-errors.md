# MT-01: Fix API typecheck errors and keep them from coming back

**Status:** Done
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

- [x] Group A: confirm the shared root cause at each call site before changing it; if any error has a different cause, stop and report
- [x] Group A: fixed by typing pool checkouts as `PoolClient`; transactions still begin, commit/rollback and release as before
- [x] Group B: **ask the user** whether creating an application should always complete its open application tasks before fixing; record the answer in this ticket
- [x] Group C: `req.params.id` narrowed to `string` without changing route behavior
- [x] `npx tsc --noEmit -p apps/api` reports 0 errors
- [x] A typecheck command exists for the API (e.g. a `typecheck` script) and a single root command runs the API typecheck alongside the existing build and tests (e.g. `npm run check`)
- [x] `AGENTS.md` Known baseline no longer lists typecheck errors; its Definition of done references the new command
- [x] `npm test` passes

## Out of scope

- Consolidating the duplicated `Queryable` alias (MT-04). Use the existing alias in each file.
- Fixing flaky tests (MT-03).
- Pre-commit hooks or CI. The goal here is one command that agents and the user run.

## Reuse notes

Use the existing `Queryable` alias in each file being fixed; don't introduce another one.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run build` passes
- [x] `npm test` passes
- [x] API typecheck reports 0 errors
- [x] Committed as `MT-01: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

- **Group A (14 errors), one root cause, confirmed at all 7 sites by reading:** `const client = "connect" in db ? await db.connect() : null` (`tasks.ts` 6 sites, `interviews.ts` 1). `PoolClient` also has a `connect` method, so the `in` check doesn't narrow `Pool | PoolClient`; TypeScript typed `client` as the base `Client` (no `release`), and every use of `client` or `queryable` failed. It was also a latent runtime bug: given a `PoolClient`, the code would call `connect()` on an already-connected client. Fixed with `db instanceof pg.Pool`, so `db.connect()` returns a `PoolClient`. Transaction begin, commit/rollback and release are unchanged.
- **Group B (2 errors):** the user chose (2026-10-13) to keep the current behavior, so the dead `input.status !== "todo"` checks in `createApplication` were removed; creating an application always completes its open application tasks, as it did at runtime before.
- **Group C (1 error):** `routes.ts` reads `:id` as one string (`req.params as { id: string }`); multer's handler typing had widened it.
- **Commands:** `npm run typecheck` (API, `tsc --noEmit -p .`) and root `npm run check` (typecheck, web build, API tests; stops at the first failure). `AGENTS.md` Definition of done and Known baseline use it; README lists both commands.
- **Results:** `npm run typecheck` 0 errors; `npm run check` passes (208/208 tests).
- Not covered: the API tsconfig excludes test files (MT-08). CI (`.github/workflows/test.yml`) runs tests and the web build but not the typecheck; CI was out of scope here.
