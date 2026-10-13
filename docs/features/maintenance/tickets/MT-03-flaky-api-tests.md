# MT-03: Make API integration tests deterministic

**Status:** Done
**Blocked by:** (none; MT-06 is done)
**Implements:** n/a (maintenance)
**Type:** bug

## Found during

Checkpoint verification on 2026-10-12. The user agreed on 2026-10-12 to a maintenance ticket.

## Evidence

Six runs of the API suite (`npm test`) on 2026-10-12 against the same code gave 2, 1, 0, 0, 0 and 0 failures out of 192 tests. Failures seen:

- `src/tasks.api.test.ts`: "POST /api/tasks/:id/complete marks school/personal tasks completed"
- `src/rankContext.api.test.ts`: a hide-from-board / `teach` test (unexpected HTTP status, around `getFeedbackByPosting(quiet.id)`)

Setup (`apps/api/vitest.config.ts`): two projects, **unit** and **integration**. Integration runs one file at a time in a single fork. Both projects point `DATABASE_URL` at the same test database.

**More evidence, 2026-10-13** (F08 M4-03 verification; the user asked for this to be tracked separately and worked after the test database is fixed):

- The failures are unexpected **404 Not Found** responses from valid routes, in a different file each run: `tasks.api.test.ts` (`GET /api/tasks?view=open`, complete on an application task), `demo.api.test.ts` (`GET /api/jobs?view=ranked`), `progress.api.test.ts` (`POST /api/progress/reflections`, the heatmap test), `interviews.api.test.ts` (`GET /api/interviews/:id`).
- Rate: on a fresh scratch database, 2 of 5 runs failed on commit `84bf883` (before M4-03) and 5 of 8 with the M4-03 changes (`9d155a5`). Each failing run had exactly 1 failure out of 196 or 204 tests. Each file passes when run alone.
- Not the cause, but it hides this: `career_digest_test` has hit Postgres's 1600-column limit on `postings` (MT-06), so integration tests currently skip there. Fix that first, or the suite can't be measured.

**Hypothesis (unconfirmed):** the two projects may run concurrently against the shared test database, or a test depends on state or ordering (time, sort order, leftover rows). Verify before fixing.

## What to build

The API test suite gives the same result on every run of unchanged code.

## Acceptance criteria

- [x] Root cause identified and written into Verification notes, with evidence
- [x] Fix addresses the cause; no retries, skips, or longer timeouts used to mask it
- [x] 10 consecutive `npm test` runs pass with 0 failures
- [x] `AGENTS.md` Known baseline no longer mentions flaky tests

## Out of scope

- Typecheck errors (MT-01).
- Rewriting tests beyond what the fix needs.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run build` passes
- [x] Committed as `MT-03: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

**Root cause: the test requests sometimes reached a different program on the machine, not the API.** The database and the test ordering weren't involved.

- `apiClient()` passed a fresh Express app to supertest. Supertest 7.2.2 starts it with `app.listen(0)`, which binds every interface (`::`), then always requests `http://127.0.0.1:<port>` (`node_modules/supertest/lib/test.js` L60–69).
- On macOS, binding `[::]:P` succeeds even when another process already listens on `127.0.0.1:P`, and a connection to `127.0.0.1:P` then goes to that process. This machine runs many local listeners on high ports (Vite, editor helpers).
- Proof: a standalone script listened on `127.0.0.1:P` with a stand-in server returning 404, then bound a second server with `listen(P)`. The bind succeeded on `::`; a request to `127.0.0.1:P` got the stand-in's 404, and a request to `[::1]:P` reached the second server.
- Matching evidence: logging every 404 the app sent during 6 full runs showed only 404s that tests expect. None of the 3 failing requests in those runs reached the app at all.
- The earlier non-404 failure (`rankContext.api.test.ts`, "unexpected HTTP status") fits the same cause.

**Fix:** `test/apiClient.ts` now starts one server per test file in `beforeAll`, bound to `127.0.0.1` (so the OS only hands out ports free on that address), closes it in `afterAll`, and gives supertest the server's URL. No test changed, and nothing retries or waits longer.

**Results:** 10 consecutive `npm test` runs: 208/208 each. Before the fix, 2 of 6 runs failed with the same code. Build passes; API typecheck at the 17-error MT-01 baseline. No new test: the collision depends on another process holding the same port, which a test can't arrange reliably.
