# Changelog

Development history and planned work for Career Digest. For setup, see [docs/SETUP.md](./SETUP.md).

Features are grouped by product area. Each feature opens with **Why** (motivation). Completed features end with **Result**. Milestone details sit under a **Milestones** dropdown so the page stays scannable.

Status tags: **[Parked]** · **[In progress]** · **[Upcoming]** (not yet implemented — plan reference only). After an upcoming feature ships, trim plan detail, mark complete, and add **Result**.

---

## Feature: Job board ingest & ranking

**Why:** Pull internship postings into one board, enrich descriptions, rank with your preferences, and keep company boards fresh without manual busywork.

**Milestones**

### Milestone 1 — Job ingest & open board API

Pull internship listings from Greenhouse, Lever, Ashby, and Simplify into Postgres, with US location filtering, season/recency rules, and retention that keeps applied roles even when a posting leaves the board.

- Multi-ATS adapters and verified company list
- `npm run discover-boards` scans Simplify ATS URLs (Greenhouse/Lever/Ashby/Oracle); Oracle boards over 250 jobs deferred for Simplify hybrid (`ORACLE_DISCOVER_MAX_JOBS`; `--write` to append)
- Simplify ingest for **miscellaneous** apply URLs only (skips direct ATS host links; oracle hybrid rows stay on Simplify until merge)
- After ingest, merge collapses duplicates when an ATS board has the same job id (`gh_jid` embeds, Oracle `/job/{id}`; `npm run merge-postings`)
- `GET /api/jobs` for open internships (not yet applied; open **application tasks** stay visible)



### Milestone 2.5 — Jobs list UI

First React surface for browsing the digest board (split from original Milestone 2; applications half lives under Applications tracker).

- Jobs list with status/source browsing as the open board grew



### Milestone 3 — Descriptions & scraping

Fill missing job descriptions for Simplify miscellaneous URLs by scraping apply pages, with sanitized HTML extraction and retry backoff so ranking only runs on postings with real JD text.

- `scrape_status` tracking and host-specific retry windows
- Skip blank descriptions during rank (saves OpenAI tokens)
- Ashby/Lever/Greenhouse JDs from board JSON at ingest
- User-dismissed mismatches leave the needs-description tab
- Editable apply/posting URLs on job and application detail pages



### Milestone 4 — OpenAI ranking & daily digest pipeline

Score and sort roles with OpenAI using your feedback and tracker history as preference signals, then automate ingest → scrape → light rank via board refresh and an optional daily cron.

- Batch ranking (`npm run rank`) and live drip (`npm run rank:live`, `rank:live-backlog`)
- Client rate gate (RPM/RPD/TPM), stall recovery, rerank queue
- Board refresh UI, heart/mismatch feedback, rank badges and dismissible batch banner
- Jobs tabs: ranked, mismatches, unranked, needs description (search/sort per tab)
- Up to 75 recent likes and dismissals per rank prompt; 12 tracker rows
- Rank system prompt loaded from gitignored `config/rank-profile.md` (see `config/rank-profile.example.md`)



### Milestone 9 — Hide from board vs Mark as mismatch

Quiet board cleanup without teaching the ranker, while keeping one **Mismatches** tab.

- `posting_feedback.teach` — dismissals with `teach=false` stay off Ranked but are omitted from rank prompts
- Mark as mismatch dialog: **Use as ranking feedback** toggle (default on); off hides notes and does not teach
- Job detail: **Hide {employer} from board** when ≥2 ranked siblings (display employer); confirm list with X-to-keep
- Progress History/Today: correct Simplify display employer; Apps list on Today tab



### Milestone 14 — Tracked boards in Postgres

ATS board list moves from `config/companies.ts` to `tracked_boards`. Daily board refresh runs Simplify discover (with write) before ingest; `npm run discover-boards -- --write` upserts the same table.

**Result:** Open internships flow from multi-ATS ingest through scrape and preference-aware ranking, with teach vs quiet-hide controls and board configuration owned in Postgres as part of daily refresh.

---



## Feature: Applications tracker

**Why:** Track the application pipeline (materials, status, deadlines) separately from browsing the open job board.

**Milestones**

### Milestone 2 — Local applications tracker UI

React application tracker alongside the jobs board (jobs list split out as Milestone 2.5 under ingest).

- Applications list with status tabs
- Application detail with documents and optional posting link
- Nullable `posting_id` for manual-only applications



### Milestone 5 — Applications workflow

Polish the tracker for day-to-day use: pipeline statuses, rich job descriptions, document preview, and UI details that make applying and reviewing materials faster.

- Applications **to-do** tab (legacy; later migrated to **Tasks** — see Tasks backlog)
- Status badges (to-do / applied / interviewing / accepted / declined) plus source on every card
- Apply-by deadlines and countdown timers on to-do / application-task cards
- Status tabs including accepted and declined; date applied; status-change ordering
- Rich-text JD paste, scroll-box descriptions, location autocomplete
- In-browser PDF/image preview for uploaded materials
- Modal add-application form; save/upload flash confirmations

**Result:** A full applications pipeline with statuses, materials preview, deadlines, and detail pages — later complemented by Tasks for “still need to apply” work.

---



## Feature: Interviews & ops shell

**Why:** Follow interview threads with clear next steps; see Home and pipeline health without digging through logs.

**Milestones**

### Milestone 6 — Interviews, home, and ops dashboards

Track interview pipelines per company, see what needs attention at a glance, and monitor ingest/rank/scrape health.

- Interview threads with linear steps, countdown timers, workspace, and resolve flow
- Home dashboard: greeting, last digest, interviews and tasks attention, new & top picks
- Pipeline Status page (`/status`) and `GET /api/ops` / `GET /api/home`
- Sakura-terminal UI theme, favicon, nav routing

*(Home later grows under **Home — Upcoming & weekly goals**; interview finish-step UX continues under accomplishment work.)*

**Result:** Interview threads, first Home dashboard, and Status/ops monitoring with a consistent sakura-terminal UI shell.

---



## Feature: Tasks backlog

**Why:** One place for “what I need to do” (application tasks + misc life/school work), distinct from the applications pipeline tracker.

**Milestones**

### Milestone 7 — Unified Tasks backlog

Separate **what you need to do** from the **Applications tracker**.

- **Tasks** page (`/tasks`): **open** and **completed** tabs for school, personal, and application tasks
- **Add to tasks** / **Remove from tasks** on Jobs (replaces to-do star); completing an application task marks **Applied**
- School/personal tasks archive to **completed**; application tasks do not
- Manual application tasks and link-to-posting from the edit modal
- Legacy application to-dos migrated to open application tasks; Applications tracker is pipeline-only (no to-do tab)
- Home **Needs attention** shows **Interviews** then **Tasks** (up to four open tasks, sorted by due date)



### Milestone 11 — Tasks categories board (pass 1)

Stacked Open sections by category (Applications first; School / Reading / Writing / Admin + custom), per-section Add, refile misc tasks, migrate school→School and personal→Admin.

### Milestone 13 — Tasks subtasks, priority, estimates

Misc task checklists (one-level) with own due dates on Home Upcoming; P0/P1/P2 stoplight + minute estimates on tasks/subtasks; parent complete auto-completes open children. Daily Progress apps/LC cap **3**. Follow-on polish: Edit subtasks modal, drag reorder, duplicate task+subtasks.

**Result:** Tasks is the actionable backlog — categorized open work, application tasks tied to mark-applied, subtasks/priority/estimates, with completed misc work archived on the Completed tab.

---



## Feature: Progress tracker

**Why:** Daily and weekly motivation for the internship search — applications sent, LeetCode, and deep-work reflections — with Today/History views and a Home strip.

**Milestones**

### Milestone 8 — Progress tracker

Activity / Effort / Outcome for internship search motivation.

- `leetcode_daily` and `reflection_logs` tables
- Progress APIs (`/api/progress/*`) including dated LeetCode + reflection edit
- **Progress** page (`/progress`): **Today** (strip, week/month Outcome, dual heatmaps, log) and **History** (calendar dig-in, view-first edit)
- Application activity derived from `applications.applied_at` (local calendar date)
- Home today strip (`Today: n/3 apps · n/3 LC · deep work ✓` / `no deep work`)

*(Later accomplishment work may repurpose or absorb Progress into past-work / rewards IA — see that feature.)*

**Result:** Progress Today/History with heatmaps, LC + reflection logging, and a Home today strip tied to daily caps.

---



## Feature: Home — Upcoming & weekly goals

**Why:** Make the week scannable from Home — dated work ahead, deadline vs target, and LC/apps weekly pace — without living on the Progress page.

**Milestones**

### Milestone 12 — Home upcoming this week

Home **Upcoming this week** replaces Needs attention: overdue + next 7 local days, interviews and tasks in one list grouped by day (Today / Tomorrow / weekday · date), dated actionable items only (pending/scheduled — not awaiting employer), no 4-cap.

### Milestone 15 — Weekly goals, due kinds, Home progress strip

Document work already shipped after Milestone 12 / 13 that had not yet been changelogged.

- `due_kind`: **deadline** vs **target** on tasks/subtasks; Home splits Deadlines (flat + countdown) from Targets (7-day buckets)
- `weekly_goals`: LC count target + apps task-set membership; Home **This week** strip with equal-flex bars and ahead/behind pace
- Targets: two-column day sections, overdue bucket, earliest subtask per parent only, single-line truncated titles
- Today row: apps / LC / deep work + **Update progress →**; finish-step default outcome **waiting on them**
- Related migrate fix for `tasks_due_at_kind_pair` when replaying legacy application-task SQL

**Result:** Home shows Deadlines vs Targets for the week, a compact Today + This week progress strip, and weekly goal pacing alongside upcoming work.

---



## Feature: Portfolio demo & docs hygiene **[Parked]**

**Why:** Support a hosted portfolio sandbox (fictional seed, gated ranking side effects, demo banner) and quieter public docs for sharing the project.

**Milestones**

### Milestone 10 — Portfolio Demo mode + docs hygiene

Internal support for a hosted portfolio sandbox (fictional seed, gated ranking side effects, demo banner) plus quieter public docs (local agent glossary/ADRs/specs gitignored; changelog kept).

Demo hosting path was started then parked; docs hygiene pieces remain in effect. Resume only if/when a public demo deploy is prioritized again.

---



## Feature: Accomplishment, detail pages & rewards **[In progress]**

**Why:** Turn completing work into a visible, motivating loop — clearer task and application detail, reflections attached to real work, recurring tasks, one global points economy, self-care rewards, and a calmer Home / Progress information architecture — without cluttering every surface at once.

No **Result** yet; plan below is the working roadmap. Items tagged **[Upcoming]** are not implemented. After each milestone ships, trim plan prose and move detail into concise shipped notes; when the whole feature lands, add **Result**.

**Milestones**

### Milestone 0 — Quick fixes & changelog restructure

- Restructure this changelog into feature sections (Why / Milestones dropdown / Result), document Milestone 15, and keep upcoming plan referenceable here
- Fix target-this-week jump: keep Applications sort order frozen after load (toggling only updates the checkbox)
- Gone posting → delete open application task + todo application row so the posting is removed (applied+ still retained)
- Add Task modal: Deadline / Target dropdown (parity with edit/card)
- Weekly LC stepper progress delta bumps today’s daily LC stepper by the same amount
- Home Upcoming: **1-week / 2-week** range preset (per-browser `localStorage`)

*Deferred from M0:* weekly goal target dates on Home → Milestone 5 (needs Progress label/note design).



### Milestone 1 — Detail pages (three surfaces)

Prototype pass (dev `/prototype/m1`) locked the layout; production surfaces shipped. **No shared completion-modal work here** — modal unification moves to Milestone 2.

**Shipped**

1. `**/tasks/:taskId**` — misc + application tasks: contained header, compact Complete/Mark applied, weekly ★ for app tasks, **Deadline/Target: mm/dd/yyyy** + live **12h pie-circles + countdown**, checkable/draggable subtasks (earliest-due urgency subtitle) or scrollable JD, **Edit details | Reflections** placeholder, equal-height columns
2. **Application pipeline** (`/applications/:id`) — status **rail**: Stage + Documents (Upload… / remove) + Link posting; main column fixed-height JD scroll / Notes / Reflections placeholder; subtitle `org · location · Applied: date` + badges
3. Home Upcoming + Tasks titles → detail; Completed tab shows checked subtasks
4. `GET /api/tasks/:id` (+ JD coalesce from posting description); weekly-target sort boost cached across Tasks remounts (no Applications re-sort flash)

Dev prototypes remain under `/prototype/m1` for reference until cleanup.



### Milestone 2 — Reflections & completion modals

**Linking + Progress**

- Reflections link to task **or** application (optional); app-task Mark applied transfers linked reflections; optional interview step under an application (active + resolved)
- **Other** lane + `deep_work` field; strip shows three deep-work badges (app / tech / other); heatmaps stay app vs technical
- Progress compose/edit: typeahead link search, lane chips, deep-work toggle; detail Reflections panels (link existing / create); sorted by created ascending

**Completion modals**

- Shared complete / mark-applied modal (Jobs + Tasks): optional Reflection + Notes panels, deep-work toggle, optional actual time; auto-associates reflection (no link picker)
- Interview finish: page 1 outcomes → Next → page 2 optional reflection → Finish

Dropped: sectioned stickies by interview step.



### Milestone 3 — Recurring tasks **[Upcoming]**

Short UI design pass, then build.

- Recurrence: daily; weekly on selected weekdays (Sun–Sat); monthly on selected days of month (1–31)
- Shared task page across instances; stickies listed by date created (earliest first) or lightly grouped by instance date if needed
- Mini-calendar of instances for the **next month**; easy add/remove instance for a due date
- Missed days stay **overdue**; option to delete instance or change due date (similar to subtasks)
- Subtasks + recurring: show subtasks of the **earliest open instance** (labeled with that date); instance complete only when all its subtasks **and** the parent instance are marked done → then surface the next instance’s subtasks on the shared page



### Milestone 4 — Global points ledger

M3 (recurring) deferred so this could ship before M5/M7.

**Points formula (locked)**

Forward-only points earnings: one ledger row per action (optional breakdown chips). No deleting earns — corrections use **reverse** / **adjust** events; balance never goes below 0. Subtasks do not earn points.


| Action                         | Points                                                                                                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Misc task complete             | **1 × actual minutes**; blank actual → **15**. Optional reflection on the same event adds flat **+20** (task minutes already counted; not double-counted as a separate reflection earn). |
| Application mark-applied       | Flat **+5**. Minutes only count when a reflection is included: **1 × reflection minutes**, or **+20** if minutes blank.                                                                  |
| Interview step finish          | Flat by kind: assessment **60**, phone **50**, technical **80**, onsite **100**, offer **200**, custom **40**. Same reflection add-on as apps when reflection is included.               |
| Standalone Progress reflection | On **create** only: **1 × minutes**, or **+20** if blank. Linking an existing reflection later earns **0**.                                                                              |
| LeetCode daily                 | **+30** per solve (uncapped). Day is one aggregate earn; −1 / clear uses adjust or reverse.                                                                                              |
| Weekly LC or apps goal         | **+100** once per ISO week when that slot’s target is met.                                                                                                                               |


**Ledger mechanics**

- `points_events` table + `actual_minutes` on tasks / reflections; `GET /api/points` + `/api/points/events`
- Earn hooks: misc complete, mark-applied, interview finish, Progress reflection create, LC stepper, weekly goal met
- Completing with an optional reflection uses **one combined earning** (`awardPoints: false` on the nested reflection create)
- Editing actual minutes on a completed misc task **adjusts** points (pre-ledger completions **seed** an earning on first edit)
- Reopen misc task → **reverse** that task’s earnings

**UI**

- Shared `ReflectionDraftFields`: Progress compose shows **Time (min)** always; misc complete shows **Actual** always (prefill estimate); apps / interview finish gate minutes inside the reflection panel only
- Progress **ledger** tab (temporary until M7 Rewards): **Completions** diary (week/month stats, type tabs, day groups; titles link to work; nested reflections editable) vs **Points** (total, category bars, event log with balance badges)
- Mint **EarnFlash** after complete / mark-applied / interview finish (earn line + running total)
- Tasks **Completed**: est / actual (+ disparity), pts; Actual (min) editable on card and task detail; no live Overdue countdown on completed work



### Milestone 5 — Celebration, Progress weekly UX, weekly goal targets on Home **[Upcoming]**

Design pass on Progress weekly block + Home target rows, then implement.

- Completion flourish: visible, dynamic (e.g. confetti / task vanish near last click) — not a plain toast; affirmations optional/skip for now
- Progress weekly goals: keep bars, counts, ahead/behind; apps membership as a **plain list** — **no checkmarks, no untag** (too easy to misfire after apply; management stays on Tasks)
- Optional **label / note** on weekly goal(s) from Progress (e.g. grind track) so Home can show `Weekly LC goal · Grind 75 Week 4` when set
- **Weekly goal target dates on Home Targets only** (never Deadlines): App goal + LC goal on **Sunday**, similar visual treatment to interviews in Upcoming (not real tasks). Disappear when that week’s target is hit
- Points + flourish when a weekly LC/apps target is hit (wired to Milestone 4 events)
- Verify weekly→daily LC sync from Milestone 0 still feels right with points



### Milestone 6 — Board departures log **[Upcoming]**

Own milestone (distinct from Milestone 0’s delete-open-app-task behavior): a **record view** of postings that left the board or were deduped.

- Basic fields: title, company, location, whether marked to-apply before leaving
- Lives on **Status**; design for low scroll cost (collapsed day sections, “today” default, pagination, or equivalent — decide in-milestone)
- Complements urgency + explains why an application task disappeared



### Milestone 7 — Rewards, achievements & Home / Progress IA **[Upcoming]**

Page-level design for where everything lives; lean toward **repurposing Progress** if content fits, but stay flexible.

- **Rewards** as its own nav item: create self-care rewards with point costs; redeem + confirm + undo; show earned total, **balance**, redeem history (points events — not the full task diary)
- Past work surface: completions + reflections history (naming TBD; may absorb/rename Progress)
- Levels, streaks, count milestones → **one-time points** on achieve (tables TBD)
- Design pass: Progress vs past work vs Rewards vs Status (heatmaps, weekly counters, calendar, board-left, points chrome from Milestone 4)
- Home: explore Upcoming | recent completions side-by-side (and alternatives) once card density is known
- Finalize retroactive reflection-linking entry points against the chosen History host

---



## Format note (for future features)

When starting a large initiative:

1. Add a `## Feature: …` section with **Why** and status tag if needed (`[Upcoming]` / `[In progress]` / `[Parked]`).
2. Put numbered milestones (from **0** for that feature) under a **Milestones** `<details>` dropdown.
3. Plan prose may be detailed while **[Upcoming]**; after ship, tighten bullets and add **Result** only when the feature (or a clear slice) is complete.

