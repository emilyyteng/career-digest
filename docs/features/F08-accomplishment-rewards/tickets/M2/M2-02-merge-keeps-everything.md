# M2-02: Application merges keep everything from the removed application

**Status:** Done
**Blocked by:** (none)
**Implements:** R2.22, and R2.17 with M2-01 (from `../../spec.md`)
**Scheduled with:** M5 (found during M5-04)
**Type:** bug

## Found during (bug tickets only)

M5-04's end-of-task report, 2026-10-13. The user agreed to the proposed fix and to ticket and fix it the same day. M2-01 (reflections only) is folded in, since it's the same operation.

## Evidence (bug tickets only)

Checked by reading, 2026-10-13. Three code paths merge two applications into one, each with its own partial logic:

1. **Nightly duplicate-posting merge** (`repointApplication` in `mergeDuplicatePostings.ts`, when a Simplify posting and its board posting both have an application): moved documents and interview threads, merged notes and status, then deleted the removed application.
2. **Linking a posting from the application page** (`patchApplication` with `postingId`, `applications.ts`): moved only documents, merged notes and status, then deleted the other application on that posting.
3. **Linking a posting from an application task** (`linkApplicationToPosting`, `tasks.ts`): the same as 2.

What was lost, per the foreign keys in migrations 001, 013, 015 and 017:

- In every path: the removed application's time, and its applied date. Its reflections and application tasks were unlinked (`ON DELETE SET NULL`) instead of moved (M2-01, R2.17).
- In paths 2 and 3: its interview threads, with every step, were deleted by `ON DELETE CASCADE` on `interview_threads.primary_application_id`.
- In path 3: the task's application took the task's notes right after the merge, overwriting the merged notes.
- In path 1: tasks pointing at the Simplify posting lost their posting (`tasks.posting_id ON DELETE SET NULL`).
- Points: the removed application's earn stayed under its deleted id. If the survivor had no earn (it was still to-do and became applied through the merge), editing its time created a second earn, so one application was paid twice.

## What to build

One shared operation, `mergeApplicationInto(survivor, removed)`, used by all three paths inside their transaction, so a merge never loses anything and never changes points (R2.22).

## Edge cases

The user approved the overall fix; these are the specific rules for each case:

- **Which application survives:** unchanged from before. On the nightly merge, the board posting's application survives; when linking a posting, the application being edited survives.
- **Status:** the further-along status wins (`todo` < `applied` = `declined` < `interviewing` < `accepted`), as before. Notes are combined, as before, skipping text one already contains.
- **Time:** the survivor's time if it has one, otherwise the removed one's. Either way, the survivor's completed application tasks are set to it, so the task and application never disagree. A blank result changes no task.
- **Applied date:** the survivor's, otherwise the removed one's. A to-do result has none and keeps a due date (the survivor's, otherwise the removed one's); past to-do there's no due date.
- **Earn:** if only the removed application earned, its earn, with its adjusts and reversals, moves to the survivor. If both earned, both stay as they are, and the survivor's later time edits adjust only its own earn. If neither earned, nothing happens. The balance never changes at a merge.
- **Reflections and tasks:** every reflection and task linked to the removed application moves to the survivor. A reflection's interview step link is kept, since the step moves too.
- **Open application tasks:** if the merged status is past to-do, the survivor's open application tasks close, and their reflections move to the application, as mark applied does (R2.1b). Linking a posting that was already applied to from an open task therefore closes that task.
- **Interview threads:**
  - Only the removed application has a thread: the membership moves to the survivor.
  - Both are in the same thread: the removed membership is dropped.
  - Each has its own thread: the removed thread folds into the survivor's. Its steps move over, keep their ids (so their earns and reflection links stay), and come after the survivor's steps. Its other linked applications join the survivor's thread. The survivor's label is kept, otherwise the removed thread's. If the removed thread was active, the merged thread is active (a resolved survivor thread reopens); otherwise the survivor thread's status is kept. If both threads had an open step, both stay open.
  - Any thread whose primary was the removed application now has the survivor as primary.
- **Fields from the posting or a manual application** (description, URL, company, title, location): the survivor's, otherwise the removed one's.
- **Nightly merge with only the Simplify application:** unchanged: the application is moved to the board posting, not merged. Tasks on the Simplify posting move to the board posting in both cases.

## Acceptance criteria

- [x] Reflections on the removed application end up on the survivor, with interview step links intact; the survivor's own reflections are unchanged (M2-01).
- [x] The survivor keeps its own time; with none, it takes the removed one's, and its completed application task shows the same time.
- [x] If only the removed application earned, the earn moves to the survivor, the balance is unchanged, and a later time edit on the survivor adds one adjust and no second earn.
- [x] If both earned, both earns stay and the balance is unchanged.
- [x] The removed application's tasks move to the survivor; an open application task closes when the merged status is past to-do, and its reflections move to the application; a task on a merged-away Simplify posting moves to the board posting.
- [x] Each application having its own thread: one thread remains, with both threads' steps in order and the same step ids; step earns are untouched; an active removed thread reopens a resolved survivor thread.
- [x] Linking a posting from the application page no longer deletes the other application's interview thread; time, notes, status and earn carry over.
- [x] Linking a posting from an application task does the same, closes the task when the merged status is past to-do, and the task and application show the same merged notes and time.
- [x] Integration tests cover each case above.

## Reuse notes

- New `applicationMerge.ts` (`mergeApplicationInto`, `mergeNotes`, `pickMergedApplicationStatus`) replaces the three copies of the notes merge and the status ranking in `mergeDuplicatePostings.ts`, `applications.ts` and `tasks.ts`. It imports neither of those modules, so there's no import cycle.
- The time sync matches `setApplicationActualMinutes`; the task close matches `completeOpenApplicationTasksForApplication` plus mark applied's reflection transfer. Both are inlined as SQL, since importing `applications.ts` or `tasks.ts` would create a cycle.
- Test seeds from `test/dbHarness.ts`; earns from `awardApplicationApplied` and `awardInterviewFinish`.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md` (no UI change)
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F08 M2-02: …`
- [x] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

Done 2026-10-13. Checked by running `npm run check`; the new `applicationMerge.api.test.ts` (9 tests) covers every acceptance criterion through the real entry points (`runMergeDuplicatePostings`, `PATCH /api/applications/:id`, `PATCH /api/tasks/:id`). The existing merge tests in `mergeDuplicatePostings.integration.test.ts` still pass unchanged.

- The task PATCH's write to the application now clears the due date when the application is past to-do, and the task's own write leaves its actual time alone unless the request sets it. Without those, the task path would overwrite the merge's time sync.
- Not checked against real data: no merge was run on the local database.
- The user confirmed the edge-case choices on 2026-10-13: folding two threads into the survivor's, an active removed thread reopening the survivor's thread, closing the open application task when the merged status is past to-do, and keeping both earns when both applications earned.
