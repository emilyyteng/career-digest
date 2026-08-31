# Spec: Unified Tasks backlog + Applications tracker split

## Problem Statement

The user uses Career Digest to manage internship applications and interviews, but as a master's student they also have school assignments (readings, homework) and personal actions (schedule an interview from a Calendly link) with due dates. The current **Needs attention** home view helps for interviews and application **to-dos**, but school work does not fit the application model, and the mental model is split awkwardly: application **to-dos** behave like tasks (due dates, countdowns, still on Jobs) while living under **Applications**.

They need one **Tasks** backlog for everything they must *do* (apply to a role, finish homework, schedule an interview), separate from **Applications** as an informational tracker for roles they have already applied to (and their pipeline metadata). Completing an **application task** should mean they applied; completing school/personal tasks should archive for reference only. None of this should affect LLM job ranking or posting feedback.

## Solution

Introduce a **Tasks** page and nav item that unifies:

- **Application tasks** (category: application) — linked to a digest posting when applicable, or a manual application intent; optional due date; completing moves the **Application** tracker to **Applied** with `applied_at` set to now (editable later on Application detail).
- **School tasks** and **Personal tasks** — title, optional organization (school/employer label), optional URL, optional due date, optional notes; completing moves to a **Completed** tab on Tasks only.

**Home → Needs attention** becomes two sections: **Interviews** (unchanged) then **Tasks** (up to 4 open tasks, sorted by due date, undated after dated, no Applications subsection).

**Applications** page becomes tracker-only: tabs **All**, **Applied**, **Interviewing**, **Accepted**, **Declined** (no **To-do**). **Add application +** defaults to **Applied**. Application detail page remains for metadata, notes, documents, and editing applied date—but not for the action backlog.

**Jobs** cards: replace **To-do ★** with **Add to tasks** / **Remove from tasks** (creates/deletes an application task with no default due date; posting stays on Jobs while task is open).

Task cards mirror current application to-do cards: countdown when `due_at` set, pencil → edit modal (title, organization, link, due, notes; link digest posting for application tasks), X → delete confirmation. Complete → confirmation modal for all categories. Footer link: **Apply ↗** (application + URL) or **Open link ↗** (school/personal + URL).

Category is **locked at creation** (v1). Priority badges and low-priority home deprioritization are out of scope.

## User Stories

1. As a digest user, I want a **Tasks** page listing all open actions, so that I can see internship applies, homework, and personal errands in one place.
2. As a digest user, I want **Open** and **Completed** tabs on Tasks, so that finished school/personal work stays visible for reference without cluttering my active list.
3. As a digest user, I want to add a **school task** with title and optional due date, so that I can track readings and homework next to career deadlines.
4. As a digest user, I want to add a **personal task** (e.g. schedule interview from Calendly), so that non-school actions appear in the same backlog.
5. As a digest user, I want to complete a school or personal task with confirmation, so that I do not accidentally close items.
6. As a digest user, I want completed school/personal tasks in **Completed**, so that I can refer back without them appearing in **Open** or Home attention.
7. As a digest user, I want completed **application tasks** to **not** appear in Completed, so that applied roles only live under Applications.
8. As a digest user, I want completing an **application task** to set the Application to **Applied** with today's date automatically, so that the tracker updates without extra steps.
9. As a digest user, I want a confirmation modal before completing any task, so that completion is intentional.
10. As a digest user, I want to edit applied date on Application detail after completing an application task, so that I can correct the date if I applied earlier.
11. As a digest user, I want **Add to tasks** on a Jobs card to create an application task with no due date, so that I can flag roles quickly and set deadlines later.
12. As a digest user, I want **Remove from tasks** on a Jobs card to delete the application task, so that the button toggles like today's to-do star.
13. As a digest user, I want jobs with an open application task to remain visible on Jobs ranked lists, so that I can still browse and compare roles I plan to apply to.
14. As a digest user, I want application tasks linked to postings to show company/title/location from the posting when available, so that cards match today's to-do application cards.
15. As a digest user, I want manual application tasks to use organization + title fields without requiring location, so that school-style cards are not forced to show empty location.
16. As a digest user, I want school/personal tasks to omit location on cards, so that the UI matches non-job work.
17. As a digest user, I want an optional **organization** field (school, employer, etc.) on tasks, so that cards show context like company on application tasks.
18. As a digest user, I want optional **URL** on any task, so that I can jump to apply links, readings, or scheduling pages.
19. As a digest user, I want **Apply ↗** on application tasks when a URL exists, so that the CTA matches applying behavior.
20. As a digest user, I want **Open link ↗** on school/personal tasks when a URL exists, so that generic links are clearly non-apply actions.
21. As a digest user, I want no footer link when a task has no URL, so that the card stays clean.
22. As a digest user, I want a pencil button opening an **edit details** modal, so that I can change link, due date, notes, title, and organization without a full detail page.
23. As a digest user, I want cancel/outside-click on the edit modal to confirm before discarding edits, so that I do not lose changes accidentally.
24. As a digest user, I want to link a digest posting to a manual application task via the edit modal, so that "link posting" from Application detail is still possible without a dedicated task detail route.
25. As a digest user, I want an X button with delete confirmation on every open task card, so that I can remove mistakes (and recreate with correct category if needed).
26. As a digest user, I want Home **Needs attention → Tasks** to show up to four open tasks sorted by earliest due date, so that I can prioritize against interviews at a glance.
27. As a digest user, I want undated open tasks on Home without a countdown, so that nagging items (schedule interview) still appear but without a fake deadline.
28. As a digest user, I want **See more →** on Home Tasks linking to the Tasks page, so that I can view the full backlog when there are more than four items.
29. As a digest user, I want Home **Needs attention** to list **Interviews** then **Tasks** only, so that Applications no longer duplicate the backlog.
30. As a digest user, I want the Applications page **All** tab to include Applied, Interviewing, Accepted, and Declined only, so that "all" means tracker statuses not backlog.
31. As a digest user, I want the Applications page default view to remain sensible (e.g. **All** or **Applied** as today), so that I can browse my pipeline without to-dos mixed in.
32. As a digest user, I want **Add application +** to default to **Applied** status, so that new tracker rows are post-apply by default.
33. As a digest user, I want to add Applications only for Applied+ statuses, so that "need to apply" always flows through Tasks.
34. As a digest user, I want interview pipelines to remain on the Interviews page, so that standing interview obligations stay separate from Tasks.
35. As a digest user, I want scheduling an interview (Calendly link) to be a **personal task**, so that completing it does not create an interview until I manually add the pipeline.
36. As a digest user, I want Tasks to have no effect on job ranking, feedback, or ingest, so that career digest scoring stays independent of my homework.
37. As a digest user, I want existing application **to-do** rows migrated to **application tasks**, so that I do not lose my current backlog on deploy.
38. As a digest user, I want category locked after task creation, so that completion behavior stays predictable; I can delete and recreate if I picked wrong.
39. As a digest user, I want optional notes on tasks editable in the modal, so that I can capture short context without a detail page.
40. As a digest user, I want due date editing on the card (like apply-by today) for quick updates, so that I do not always open the modal for date changes.
41. As a digest user, I want Tasks nav entry in the header, so that the backlog is as visible as Jobs and Applications.
42. As a digest user, I want Application detail to drop **To-do** from the status picker, so that status changes reflect tracker stages only.
43. As a digest user, I want deleting an application task from Jobs to remove the task without deleting the posting, so that behavior matches today's remove-from-to-do.
44. As a digest user, I want creating an application task from a posting to create or sync the backing Application row in **todo**-equivalent state until completion, so that Jobs visibility rules stay consistent.
45. As a digest user, I want manual application tasks (no posting) to still complete into **Applied** on Applications, so that manually tracked applies join the tracker after I apply.

## Implementation Decisions

### Domain model

- New **`tasks`** table is the source of truth for the action backlog.
- Task fields (conceptual): `id`, `category` (`application` | `school` | `personal`), `status` (`open` | `completed`), `title`, `organization` (nullable; company/school label), `url` (nullable), `notes` (nullable), `due_at` (nullable timestamptz), `posting_id` (nullable, unique among open application tasks per posting), `application_id` (nullable FK to applications), `completed_at`, `created_at`, `updated_at`.
- **Category is immutable** after insert (v1).
- **Application tasks** must reference an **Application** row (created on task creation when needed). Posting-linked tasks use `posting_id` + application with linked posting; manual application tasks use application with manual company/title fields.
- Completing an **application** task: set linked application `status = applied`, `applied_at = now()`, clear `due_at` on application; mark task `completed` (or delete task row—either way it must not appear in Open or Completed tabs; prefer `completed` for audit/migration simplicity with filter excluding application category from Completed UI).
- Completing **school/personal**: task `status = completed`, `completed_at = now()`; no Application status change.
- Deleting a task: hard delete open task; for application tasks, delete or revert linked application if it was only a todo-backlog row (same rules as today's DELETE application todo—posting remains).

### Jobs list integration

- Jobs SQL filter remains: posting visible if no application OR application in todo-equivalent state (open application task / `applications.status = 'todo'` during transition).
- Jobs API returns whether an open **application task** exists for the posting (replace or alias `applicationStatus === 'todo'` for UI).
- **Add to tasks** POST creates application-category task + backing application; no default `due_at`.
- **Remove from tasks** DELETE removes application task and todo application row; posting unchanged.

### Applications tracker

- Remove **`todo`** from `APPLICATION_STATUSES` for API validation and UI tabs.
- **GET /api/applications**: never return todo rows (or migrate todos to tasks and delete todo status rows).
- **POST /api/applications**: default status `applied`; reject `todo` status.
- Application detail: remove To-do from status dropdown; hints updated per CONTEXT.md.
- **All** tab order/counts: interviewing, applied, accepted, declined (existing sort semantics without todo).

### Tasks API

- `GET /api/tasks?status=open|completed` — list with counts for both tabs; open sorted `due_at ASC NULLS LAST`, then `created_at DESC` for undated; completed sorted `completed_at DESC` (school/personal only in completed response).
- `POST /api/tasks` — create with category, title, optional fields; application category creates/links application as needed.
- `PATCH /api/tasks/:id` — update editable fields (not category).
- `POST /api/tasks/:id/complete` — category-specific completion (application → applied + applied_at now).
- `DELETE /api/tasks/:id` — delete with application-task cleanup rules.
- Optional: `POST /api/tasks/from-posting` or overload POST with `postingId` for Jobs button (may reuse existing posting-link patterns).

### Home API

- Remove `todo` / `todoTotal` from home dashboard (or repurpose `todoTotal` as open task count).
- Add `tasks` array + `taskTotal` under needs attention (or nested in `needsAttention.tasks`).
- Remove Applications subsection from Home UI; keep Interviews subsection.
- Task rows for home: title, organization label, due label + ISO for countdown, same 4-item cap.

### Web UI

- New **Tasks** page: Open | Completed tabs; **Add task +** with category selector on create.
- Reuse application-card visual patterns (countdown, footer apply-by form for due date on open tasks, row-actions).
- **TaskEditModal**: title, organization, url, due date/time, notes; for application tasks also link posting search (reuse jobs suggest pattern from Application detail).
- **CompleteTaskConfirm** and **DeleteTaskConfirm** modals.
- **Jobs** / **JobDetail**: rename button, wire to tasks API.
- **Applications**: remove todo tab; update Add Application form default status.
- **App** nav: add Tasks link.
- **Home**: replace Applications attention block with Tasks block.

### Migration

- One-time migration SQL: for each `applications` row with `status = 'todo'`, insert open `application` task linked to that application (and posting if present); copy `due_at`, title, company, url from application/posting as today.
- After migration, optionally normalize todo applications or keep dual until completion paths are verified (tasks are UI source of truth).

### Type shape (decision-rich)

```
TaskCategory = 'application' | 'school' | 'personal'
TaskStatus = 'open' | 'completed'

Task {
  id, category, status, title,
  organization: string | null,
  url: string | null,
  notes: string | null,
  dueAt: string | null,
  postingId: string | null,
  applicationId: string | null,
  completedAt: string | null,
  createdAt, updatedAt
}
```

## Testing Decisions

### What to test

Test **observable HTTP behavior** and DB outcomes—not React component internals. Assert response shapes, sort order, visibility rules, and cross-entity effects (complete application task → application applied).

### Primary seam (proposed—confirm before implement)

**One integration test module** at the API boundary: `tasks.api.test.ts` (mirroring `applications.api.test.ts` and `home.api.test.ts`), using existing `dbHarness` + Postgres test DB + `apiClient` supertest pattern.

Coverage targets:

- Create/list open and completed tasks by category
- Complete application task → application `applied` + `applied_at` set; task absent from open and completed lists
- Complete school/personal → appears in completed only
- Delete application task from posting; posting still exists; Jobs filter still shows posting
- POST task from posting (Add to tasks) creates open application task without `due_at`
- Home dashboard returns tasks slice (max 4, sort order) and no application todo slice
- Applications list excludes todo; POST application rejects todo
- Migration fixture: legacy todo application yields open application task (if migration tested via SQL seed + read)

Extend **`home.api.test.ts`** for Tasks attention payload rather than many UI tests.

Prior art: `applications.api.test.ts`, `home.api.test.ts`, `ingest.integration.test.ts`, `dbHarness.ts` seed helpers.

### Not tested in v1

- Edit modal React behavior (covered by API PATCH tests)
- Visual parity with CSS
- E2E browser tests

## Out of Scope

- Priority badges and low-priority home suppression
- Task categories beyond application / school / personal
- Changing category after creation
- Full task detail page route (modal-only editing)
- Automatic interview thread creation from tasks
- LLM ranking, feedback, or ingest changes
- Notifications/reminders push/email
- Recurring tasks
- Subtasks or checklists
- Sharing/collaboration

## Further Notes

- Glossary: see root `CONTEXT.md` for **Task**, **Application task**, **Application** (tracker), **Needs attention**.
- Interview scheduling workflow: personal task → user marks complete → user manually creates interview thread/step on Interviews page.
- Legacy URL `?status=starred` on Applications may redirect to todo tab today; redirect to Tasks or remove.
- `applications.status = 'todo'` may remain internally during migration/backing rows until fully retired; user-facing "to-do" terminology retires except Jobs button state labels.

## Testing seam confirmation

**Proposed single seam:** API integration tests for `/api/tasks` + extensions to `/api/home` and Jobs posting flags, using the existing Postgres harness—no new test infrastructure.

Please confirm this matches your expectations before `/to-tickets` splits implementation.
