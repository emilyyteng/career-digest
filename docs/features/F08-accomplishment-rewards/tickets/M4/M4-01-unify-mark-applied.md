# M4-01: Mark applied from Jobs has the same outcome as from Tasks

**Status:** Done
**Blocked by:** (none)
**Implements:** R2.1b, R2.10, R2.13, R2.21 (from `../../spec.md`)
**Type:** bug
**Scheduled with:** M5 (same code as the weekly-goal rework)

## Found during (bug tickets only)

F08 spec audit of shipped milestones, 2026-10-12. Confirmed from the UI on 2026-10-13, when the user agreed to ticket it under M4.

## Evidence (bug tickets only)

Both pages open the same `CompleteWorkModal`, but they call different endpoints.

- **Tasks** calls `POST /api/tasks/:id/complete`, which uses `completeTask`:
  - marks the application applied
  - moves the task's reflections to it ([`tasks.ts` L880–916](../../../../../apps/api/src/tasks.ts), transfer at L905)
  - saves reflection minutes as the task's actual time (corrected 2026-10-13: it didn't. Both web callers send `actualMinutes: null` for application tasks, so `completeTask` cleared the task's time on this path too)
  - checks the weekly apps goal ([`routes.ts` L1067–1081](../../../../../apps/api/src/routes.ts))
- **Jobs** (both the card and the job detail page) calls `POST /api/applications` ([`JobsPage.tsx` L509–543](../../../../../apps/web/src/features/jobs/JobsPage.tsx), [`JobDetailPage.tsx` L152–182](../../../../../apps/web/src/features/jobs/JobDetailPage.tsx)). `createApplication` then completes the open task with a bare update ([`applications.ts` L229–232](../../../../../apps/api/src/applications.ts) → [`tasks.ts` L999–1013](../../../../../apps/api/src/tasks.ts)). Compared with Tasks:
  - reflections already linked to the task stay on the completed task (conflicts with R2.1b)
  - the task gets no actual minutes (conflicts with R2.10)
  - the weekly apps goal isn't checked (conflicts with R2.13)

  The +5 earn and the modal's own reflection are correct on this path ([`routes.ts` L429–452](../../../../../apps/api/src/routes.ts)).

Why two endpoints exist: Jobs can mark applied on a posting that was never added to Tasks, so there may be no task to complete. That needs a way to create the application, not a separate set of rules.

A third, side door (R2.21, folded in 2026-10-13): an application row that still backs an open application task (status `todo`) is hidden from every list and search ([`applications.ts` L95, L120](../../../../../apps/api/src/applications.ts)), but its page still opens by URL. It preselects "applied" ([`ApplicationDetailPage.tsx` L87, L261](../../../../../apps/web/src/features/applications/ApplicationDetailPage.tsx)), and saving goes through the status-update route ([`routes.ts` L460–511](../../../../../apps/api/src/routes.ts)), acting as a mark-applied that skips everything above.

## What to build

One server-side mark-applied operation that every path calls:

- the Tasks card and task detail (`POST /api/tasks/:id/complete` for application tasks)
- the Jobs card and job detail (`POST /api/applications` with `status: "applied"` for a posting)

Given a task, or a posting that may or may not have an open application task, it:

1. Finds the application, or creates one if the posting has none, and sets it to applied with `applied_at`.
2. If an open application task exists, completes it the same way `completeTask` does: moves its reflections to the application (R2.1b), saves the reflection's minutes as the task's actual time (R2.10), and resolves interview threads as today.
3. Links the modal's reflection, if any, to the application, with its minutes.
4. Records one application earn (+5, plus the reflection add-on), never two.
5. Applies the same weekly apps handling as the Tasks path. Today that's the immediate bonus check. After M5 it's the week-close scoring (R5.9), and this operation should be the single hook M5 extends.

The two endpoints can stay as thin wrappers. The web client doesn't need to change beyond what the shared response requires.

Close the side door (R2.21): mark applied becomes the only way a to-do-backed row turns into an application.

- The API rejects status changes on an application whose status is `todo`, with an error that points to mark applied.
- Its application page redirects to the open application task's detail page.

## Acceptance criteria

- [x] Marking applied from the Jobs card, job detail, Tasks card and task detail gives identical results for the same starting data: application status and `applied_at`, task status, task actual minutes, reflection links, points events, and weekly-goal effect.
- [x] A reflection linked to the task before marking applied ends up linked to the application, on every path.
- [x] With a reflection that has minutes, the task's `actual_minutes` equals the reflection's minutes, on every path.
- [x] Exactly one `application_applied` earn exists per application, whichever path is used, including if two paths are tried in a row.
- [x] A posting with no task, marked applied from Jobs, still creates the application and earns as today.
- [x] Changing an already-applied application's status on its own page earns nothing again (unchanged).
- [x] A status change on a to-do-backed application is rejected by the API (status, task, points and reflections unchanged), and the error says to use mark applied.
- [x] Opening a to-do-backed application's page by URL lands on its open task's detail page. (Checked by reading and the build; not run in a browser.)
- [x] Applications at applied or later still change status on their own page as today.
- [x] Integration tests cover the Jobs path with an existing task that has a linked reflection and is tagged for the weekly apps goal, comparing it against the Tasks path.

## Reuse notes

Extract from `completeTask` ([`tasks.ts`](../../../../../apps/api/src/tasks.ts)) and `transferTaskReflectionsToApplication` ([`progress.ts`](../../../../../apps/api/src/progress.ts)). Reuse `awardApplicationApplied` ([`pointsAwards.ts`](../../../../../apps/api/src/pointsAwards.ts)), which already records one earn per application. Don't add a third endpoint unless both wrappers prove awkward.

This ticket keeps today's points and time rules (reflection minutes saved as the task's actual time). M5-04 then changes them (R5.31): the time moves onto the application and the earn becomes +5 + minutes + 20 if a reflection. Build the shared operation so that change lands in one place.

MT-01 removed the dead `"todo"` check in `createApplication` (2026-10-13); creating an application still always completes its open application tasks.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F08 M4-01: …`
- [x] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

2026-10-13:

- **One operation:** `markApplied` ([`markApplied.ts`](../../../../../apps/api/src/markApplied.ts)). Inside one transaction it:
  1. locks the application and refuses it unless it's a to-do (409)
  2. sets it to applied
  3. completes its open application task, with the modal's reflection minutes as the task's actual time (or keeps the existing time if there's no reflection)
  4. moves the task's reflections to the application
  5. links the modal's reflection to the application
  6. records one earn

  After commit it runs the weekly apps check.
- **Who calls it:**
  - `POST /tasks/:id/complete` for application tasks
  - `POST /applications` with status applied: Jobs card and detail, and the manual add form when it saves as applied
  - `ensureApplicationToMarkApplied` finds or creates the to-do row inside the same transaction.
  - `completeTask` now completes misc tasks only, so there's no second mark-applied implementation.
- **Side door closed (R2.21):**
  - `PATCH /applications/:id` with a status on a to-do row returns 409 with a "Use Mark applied" message.
  - `POST /applications` with a non-applied status on a posting whose row is a to-do is refused the same way. The UI never sent that, but it was the same side door.
  - `GET /applications/:id` returns `openTaskId`; the application page redirects to `/tasks/:openTaskId` for to-do rows.
- **Fixed along the way:** changing an application to applied on its own page after it had already earned returned the old earn as `points`, so the page showed a "+N points" banner for nothing. `awardApplicationApplied` now reports whether it created the earn, and only a new earn is returned.
- **Same as before:**
  - Thread resolution: "applied" has no thread resolution (`applicationResolutionFromStatus`), so neither path ever resolved threads; the operation doesn't call it.
  - Timezone: neither web caller sends `tz`, so the weekly apps check runs in UTC on both paths. Moved to M5-05, which replaces this check with week close (2026-10-13).
- **Notes (follow-up, 2026-10-13):** the user decided the modal's notes go on the application on both paths (R2.13). `markApplied` appends them to the application's existing notes, separated by a blank line. Before, Tasks appended them to the task and Jobs replaced the application's notes.
- **Tests:** [`markApplied.api.test.ts`](../../../../../apps/api/src/markApplied.api.test.ts), 8 integration tests:
  - Tasks and Jobs parity: a tagged task with a linked reflection, comparing application, task, reflections, points events and the weekly bonus
  - a second mark applied from the other path, both orders
  - a posting with no task
  - to-do-backed status change refused, via `PATCH` and `POST`
  - `openTaskId`
  - status changes on applied rows
  - manual applied
  - no reflection keeps the task's existing time

  Run against the code before this ticket, 7 of the 8 fail. The parity test shows Jobs missing the +100 weekly bonus and leaving the task's reflection on the task.
- **Existing test updated:** `applications.api.test.ts` "PATCH updates status and appliedAt" relied on the side door (to-do → applied). It now moves an applied application to interviewing.
- **`npm run check`:** typecheck 0 errors, web build OK, 216/216 tests.
