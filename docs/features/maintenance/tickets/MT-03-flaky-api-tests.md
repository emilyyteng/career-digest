# MT-03: Make API integration tests deterministic

**Status:** Ready
**Blocked by:** (none)
**Implements:** n/a (maintenance)
**Type:** bug

## Found during

Checkpoint verification on 2026-10-12. The user agreed on 2026-10-12 to a maintenance ticket.

## Evidence

Six runs of the API suite (`npm test`) on 2026-10-12 against the same code gave 2, 1, 0, 0, 0 and 0 failures out of 192 tests. Failures seen:

- `src/tasks.api.test.ts`: "POST /api/tasks/:id/complete marks school/personal tasks completed"
- `src/rankContext.api.test.ts`: a hide-from-board / `teach` test (unexpected HTTP status, around `getFeedbackByPosting(quiet.id)`)

Setup (`apps/api/vitest.config.ts`): two projects, **unit** and **integration**. Integration runs one file at a time in a single fork. Both projects point `DATABASE_URL` at the same test database.

**Hypothesis (unconfirmed):** the two projects may run concurrently against the shared test database, or a test depends on state or ordering (time, sort order, leftover rows). Verify before fixing.

## What to build

The API test suite gives the same result on every run of unchanged code.

## Acceptance criteria

- [ ] Root cause identified and written into Verification notes, with evidence
- [ ] Fix addresses the cause; no retries, skips, or longer timeouts used to mask it
- [ ] 10 consecutive `npm test` runs pass with 0 failures
- [ ] `AGENTS.md` Known baseline no longer mentions flaky tests

## Out of scope

- Typecheck errors (MT-01).
- Rewriting tests beyond what the fix needs.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run build` passes
- [ ] Committed as `MT-03: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(Filled in when done.)
