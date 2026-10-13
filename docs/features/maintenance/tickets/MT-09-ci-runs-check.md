# MT-09: CI runs `npm run check`

**Status:** Done
**Blocked by:** MT-01, MT-08 (`npm run check` and a typecheck that covers the tests)
**Implements:** n/a (maintenance)
**Type:** tooling

## Found during

MT-01 and MT-08, 2026-10-13. The user agreed the same day to a small ticket, implemented right away.

## Evidence

`.github/workflows/test.yml` ran `npm run test -w @career-digest/api` and `npm run build -w @career-digest/web`, but not the API typecheck. So type errors could merge without CI noticing, which is how MT-01's 17 errors built up. Locally, `AGENTS.md` → Definition of done already uses `npm run check`.

## What to build

CI runs the same command as the local Definition of done: `npm run check` (API typecheck, web build, then API tests), so CI and local can't drift.

## Acceptance criteria

- [x] The workflow's test and build steps are replaced by one step running `npm run check`.
- [x] The step still runs with `TEST_DATABASE_URL` pointing at the CI Postgres service, so integration tests run instead of being skipped.
- [x] `npm run check` passes locally.

## Out of scope

- Other CI changes (Node version, caching, extra jobs, web tests).
- `npm audit` in CI (MT-10 looks at the audit warnings first).

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Committed as `MT-09: …`
- [x] End-of-task report given, including **Issues found**

## Verification notes

2026-10-13:

- `.github/workflows/test.yml`: the "Unit and integration tests (API)" and "Build web" steps are replaced by "Typecheck, build and test" (`npm run check`). `TEST_DATABASE_URL` is set at job level, so the step inherits it unchanged. The order is now typecheck, then build, then tests (before: tests, then build). It still stops at the first failure.
- Locally: `npm run check` passes (0 type errors, web build OK, 208/208 tests).
- Not run on GitHub: nothing has been pushed, and `act` isn't installed. The first CI run after a push is the real check.
