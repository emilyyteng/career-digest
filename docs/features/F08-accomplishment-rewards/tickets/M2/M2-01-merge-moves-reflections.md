# M2-01: Merging duplicate postings moves reflections to the surviving application

**Status:** Done
**Blocked by:** (none)
**Implements:** R2.17 (from `../../spec.md`)
**Type:** bug

## Found during (bug tickets only)

F08 spec audit, 2026-10-13. The user agreed to ticket it under M2 the same day.

## Evidence (bug tickets only)

When both duplicate postings have an application, `mergeApplications` moves documents, interview threads and thread memberships to the surviving application ([`mergeDuplicatePostings.ts` L184–205](../../../../../apps/api/src/mergeDuplicatePostings.ts)), then deletes the removed one ([L217](../../../../../apps/api/src/mergeDuplicatePostings.ts)). It never touches `reflection_logs`, so the reflections' `application_id` is cleared by `ON DELETE SET NULL` and they become unattached. That conflicts with R2.17.

When only the removed posting has an application, the application itself is moved (L176–181), so its reflections stay attached. That case is fine.

## What to build

When two applications merge, every reflection linked to the removed application is relinked to the surviving one, including reflections that also point at an interview step. The interview step link is kept, since its thread moves to the surviving application in the same merge.

## Acceptance criteria

- [x] Merge where both postings have applications: reflections from the removed application end up linked to the surviving one, with their interview step links intact.
- [x] The surviving application's own reflections are unchanged.
- [x] Points don't change (R2.19).
- [x] An integration test covers the merge with reflections on both applications, one of them linked to an interview step.

## Reuse notes

Add the update next to the existing `interview_threads` update in `mergeApplications`, inside the same transaction.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Reuse check done
- [x] Committed (in M2-02's commit, `F08 M2-02: …`, since it's the same operation)
- [x] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

Done 2026-10-13 as part of [M2-02](./M2-02-merge-keeps-everything.md), which replaced every merge path with one shared operation. The first test in `applicationMerge.api.test.ts` covers the reflection moves; M2-02's earn tests show the balance doesn't change at a merge.
