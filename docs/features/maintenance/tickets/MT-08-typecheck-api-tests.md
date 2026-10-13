# MT-08: Typecheck API test files too

**Status:** Done
**Blocked by:** MT-01
**Implements:** n/a (maintenance)
**Type:** bug

## Found during

MT-01, 2026-10-13. The user agreed the same day to a ticket, resolved in the same pass after MT-01.

## Evidence

`apps/api/tsconfig.json` excludes `src/**/*.test.ts`, `src/**/*.api.test.ts` and `src/test/**`, so `npm run typecheck` never sees the tests or the test helpers. Vitest strips types without checking them, so type errors there pass silently.

Typechecking everything under `src` on 2026-10-13 (after MT-01) gave 3 errors:

- `src/test/apiClient.ts` and `src/staticWeb.api.test.ts`: no type declarations for `supertest` (`@types/supertest` isn't installed), so supertest is `any` in every API test.
- `src/jobs.api.test.ts` L209: passes `null` where the seed helper's type allows `number | undefined`.

## What to build

`npm run typecheck` covers the API's test files and test helpers, with 0 errors.

## Acceptance criteria

- [x] The API typecheck includes `*.test.ts`, `*.api.test.ts`, `*.integration.test.ts` and `src/test/**`.
- [x] `@types/supertest` is a dev dependency of the API, matching the installed supertest major version.
- [x] The 3 errors are fixed without changing what any test checks.
- [x] `npm run check` passes.

## Out of scope

- Web test files (the web build already typechecks its sources).
- CI changes.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Committed as `MT-08: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

2026-10-13:

- `apps/api/tsconfig.json` no longer has an `exclude` list, so the typecheck covers all of `src`, tests and helpers included.
- `@types/supertest` ^7.2.1 was added for supertest 7. That fixed both TS7016 errors. `apiClient()` now returns `supertest.Agent` without a cast.
- `jobs.api.test.ts` L209 (TS2322): the "dismiss on needs-description" test passed `null` scores to `seedRankedPosting`, which turned each `null` into a score of 90 and a ranked date via `??`. So the posting the test meant to be unranked was secretly ranked. The test now uses `seedPosting`, which leaves the posting unranked as the test name says. Its assertions are unchanged and it still passes. The setup now matches the test's intent, though before the fix the test was not covering that case.
- `npm run check`: typecheck 0 errors, web build OK, API tests 208/208 (28 files, integration included).
