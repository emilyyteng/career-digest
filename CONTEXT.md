# Career Digest

A personal internship digest and career tracker: ranked job postings from ingest, application tracking, interview pipelines, and a unified action backlog for anything that needs doing before deadlines.

## Language

**Task**:
An open action item with an optional due date, listed on the Tasks page and in Home “Needs attention.” Not the same as an interview step.
_Avoid_: To-do (use only for legacy UI strings during migration), reminder, item

**Application task**:
A task whose completion means you applied (or advanced a manual application intent). Linked to a job posting when the role came from the digest, or standalone when you added the application manually. Completing it moves the tracker to Applied—not the Completed tasks list.
_Avoid_: Application to-do, starred application

**School task**:
A non-career task (readings, homework, assignments). Completing it marks the task done and keeps it in Completed for reference only.
_Avoid_: Assignment (too narrow), homework (too narrow)

**Personal task**:
A non-career, non-school action (appointments, schedule interview via Calendly, errands). Same completion behavior as school tasks.
_Avoid_: Misc task

**Application** (tracker):
A row on the Applications page representing a role you have already applied to or are past the “must apply” stage. Informational: status, applied date, notes, documents, description—not the action backlog.
_Avoid_: To-do application (retired concept once Tasks ships)

**Needs attention**:
The Home card grouping time-sensitive items. After the Tasks redesign: **Interviews** then **Tasks** (not Applications).
_Avoid_: Dashboard alerts

**Interview pipeline**:
An active interview thread with steps; separate from Tasks. Scheduling a Calendly slot is a task; the scheduled interview lives in Interviews.
_Avoid_: Interview task (ambiguous with Application task)

**Application prep** (progress lane):
The applications side of Progress: volume from applications logged (heatmap fill) plus Effort via application-side reflection logs (company research, targeted responses, behavioral prep). Distinct from Technical prep and from the Interview pipeline.
_Avoid_: Application progress (ambiguous with Outcomes), outreach

**Technical prep** (progress lane):
The problem-solving side of Progress: volume primarily from a daily LeetCode solve count, plus Effort via technical reflection logs (tricky concepts, interview problems worked). Distinct from Application prep.
_Avoid_: LeetCode only (too narrow for the lane), coding activity

**Activity** (progress):
Daily volume within a prep lane—applications logged (Application prep) or LeetCode count (Technical prep). **Earned credit** per day is on a 0–5 scale (`min(raw_count, 5)`); raw totals are stored but not headline-promoted. Distinct from Effort and Outcome.
_Avoid_: Progress (too vague), productivity

**Earned credit**:
The 0–5 Activity score shown on heatmaps and Home (e.g. `3/5 apps`). Not binary—partial credit motivates short days. Raw volume may exceed 5 but is de-emphasized in primary UI.
_Avoid_: Full credit day (binary), points

**Effort** (progress):
Deep work within a prep lane, logged as reflection entries. One reflection that day is enough for Effort credit on that lane; more entries are allowed. Not inferred from application type or LeetCode count alone.
_Avoid_: Depth (UI label only), targeted application (v1 uses reflection instead of a subtype)

**Outcome** (progress):
Period totals (day, week, month—local TZ; week Sunday–Saturday): applications logged, LeetCode solves, deep-work units (reflection entry count). Progress outcomes, not interview-pipeline status.
_Avoid_: Results, pipeline outcomes (those live under Interviews/Applications)

**Application logged**:
An application row counted toward Application-prep Activity on the calendar date of its `applied_at` (including retroactive edits). One application = one unit of volume regardless of how hard the apply was.
_Avoid_: Application sent (ambiguous timing), apply event

**Reflection log**:
A user-written Effort entry scoped to Application prep or Technical prep—not required to link to a specific application. Distinct from Application notes on the tracker (form answers, apply metadata).
_Avoid_: Deep work task, targeted application

**Today tab** (Progress):
Primary Progress tab: today strip, week/month Outcome, dual stacked heatmaps (overview only), and log-today (LC stepper + reflection compose). Happy path for deep work; not a day browser.
_Avoid_: Applications tab (old heatmap-lane tabs), Progress home

**History tab** (Progress):
Progress tab for granular day records: calendar day picker, view-first day detail, accordion notes; Edit this day unlocks backfill/edits. Not a second Progress page.
_Avoid_: Archive, calendar page
