# Changelog

Development history and planned work for Career Digest. For setup, see [docs/SETUP.md](./SETUP.md).

Features are grouped by product area. Each feature opens with **Why** (motivation). Completed features end with **Result**. Milestone details sit under a **Milestones** dropdown so the page stays scannable.

Status tags: **[Parked]** · **[In progress]** · **[Upcoming]** (not yet implemented — plan reference only). After an upcoming feature ships, trim plan detail, mark complete, and add **Result**.

---

## Feature: Job board ingest & ranking

**Why:** Pull internship postings into one board, enrich descriptions, rank with your preferences, and keep company boards fresh without manual busywork.

<details>
<summary><strong>Milestones</strong></summary>

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

</details>

**Result:** Open internships flow from multi-ATS ingest through scrape and preference-aware ranking, with teach vs quiet-hide controls and board configuration owned in Postgres as part of daily refresh.

---

## Feature: Applications tracker

**Why:** Track the application pipeline (materials, status, deadlines) separately from browsing the open job board.

<details>
<summary><strong>Milestones</strong></summary>

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

</details>

**Result:** A full applications pipeline with statuses, materials preview, deadlines, and detail pages — later complemented by Tasks for “still need to apply” work.

---

## Feature: Interviews & ops shell

**Why:** Follow interview threads with clear next steps; see Home and pipeline health without digging through logs.

<details>
<summary><strong>Milestones</strong></summary>

### Milestone 6 — Interviews, home, and ops dashboards

Track interview pipelines per company, see what needs attention at a glance, and monitor ingest/rank/scrape health.

- Interview threads with linear steps, countdown timers, workspace, and resolve flow
- Home dashboard: greeting, last digest, interviews and tasks attention, new & top picks
- Pipeline Status page (`/status`) and `GET /api/ops` / `GET /api/home`
- Sakura-terminal UI theme, favicon, nav routing

*(Home later grows under **Home — Upcoming & weekly goals**; interview finish-step UX continues under accomplishment work.)*

</details>

**Result:** Interview threads, first Home dashboard, and Status/ops monitoring with a consistent sakura-terminal UI shell.

---

## Feature: Tasks backlog

**Why:** One place for “what I need to do” (application tasks + misc life/school work), distinct from the applications pipeline tracker.

<details>
<summary><strong>Milestones</strong></summary>

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

</details>

**Result:** Tasks is the actionable backlog — categorized open work, application tasks tied to mark-applied, subtasks/priority/estimates, with completed misc work archived on the Completed tab.

---

## Feature: Progress tracker

**Why:** Daily and weekly motivation for the internship search — applications sent, LeetCode, and deep-work reflections — with Today/History views and a Home strip.

<details>
<summary><strong>Milestones</strong></summary>

### Milestone 8 — Progress tracker

Activity / Effort / Outcome for internship search motivation.

- `leetcode_daily` and `reflection_logs` tables
- Progress APIs (`/api/progress/*`) including dated LeetCode + reflection edit
- **Progress** page (`/progress`): **Today** (strip, week/month Outcome, dual heatmaps, log) and **History** (calendar dig-in, view-first edit)
- Application activity derived from `applications.applied_at` (local calendar date)
- Home today strip (`Today: n/3 apps · n/3 LC · deep work ✓` / `no deep work`)

*(Later accomplishment work may repurpose or absorb Progress into past-work / rewards IA — see that feature.)*

</details>

**Result:** Progress Today/History with heatmaps, LC + reflection logging, and a Home today strip tied to daily caps.

---

## Feature: Home — Upcoming & weekly goals

**Why:** Make the week scannable from Home — dated work ahead, deadline vs target, and LC/apps weekly pace — without living on the Progress page.

<details>
<summary><strong>Milestones</strong></summary>

### Milestone 12 — Home upcoming this week

Home **Upcoming this week** replaces Needs attention: overdue + next 7 local days, interviews and tasks in one list grouped by day (Today / Tomorrow / weekday · date), dated actionable items only (pending/scheduled — not awaiting employer), no 4-cap.

### Milestone 15 — Weekly goals, due kinds, Home progress strip

Document work already shipped after Milestone 12 / 13 that had not yet been changelogged.

- `due_kind`: **deadline** vs **target** on tasks/subtasks; Home splits Deadlines (flat + countdown) from Targets (7-day buckets)
- `weekly_goals`: LC count target + apps task-set membership; Home **This week** strip with equal-flex bars and ahead/behind pace
- Targets: two-column day sections, overdue bucket, earliest subtask per parent only, single-line truncated titles
- Today row: apps / LC / deep work + **Update progress →**; finish-step default outcome **waiting on them**
- Related migrate fix for `tasks_due_at_kind_pair` when replaying legacy application-task SQL

</details>

**Result:** Home shows Deadlines vs Targets for the week, a compact Today + This week progress strip, and weekly goal pacing alongside upcoming work.

---

## Feature: Portfolio demo & docs hygiene **[Parked]**

**Why:** Support a hosted portfolio sandbox (fictional seed, gated ranking side effects, demo banner) and quieter public docs for sharing the project.

<details>
<summary><strong>Milestones</strong></summary>

### Milestone 10 — Portfolio Demo mode + docs hygiene

Internal support for a hosted portfolio sandbox (fictional seed, gated ranking side effects, demo banner) plus quieter public docs (local agent glossary/ADRs/specs gitignored; changelog kept).

Demo hosting path was started then parked; docs hygiene pieces remain in effect. Resume only if/when a public demo deploy is prioritized again.

</details>

---

## Feature: Accomplishment, detail pages & rewards **[In progress]**

**Why:** Turn completing work into a visible, motivating loop — clearer task and application detail, reflections attached to real work, recurring tasks, one global points economy, self-care rewards, and a calmer Home / Progress information architecture — without cluttering every surface at once.

No **Result** yet; plan below is the working roadmap. Items tagged **[Upcoming]** are not implemented. After each milestone ships, trim plan prose and move detail into concise shipped notes; when the whole feature lands, add **Result**.

<details>
<summary><strong>Milestones</strong></summary>

### Milestone 0 — Quick fixes & changelog restructure

- Restructure this changelog into feature sections (Why / Milestones dropdown / Result), document Milestone 15, and keep upcoming plan referenceable here
- Fix target-this-week jump: keep Applications sort order frozen after load (toggling only updates the checkbox)
- Gone posting → delete open application task + todo application row so the posting is removed (applied+ still retained)
- Add Task modal: Deadline / Target dropdown (parity with edit/card)
- Weekly LC stepper progress delta bumps today’s daily LC stepper by the same amount
- Home Upcoming: **1-week / 2-week** range preset (per-browser `localStorage`)

*Deferred from M0:* weekly goal target dates on Home → Milestone 5 (needs Progress label/note design).

### Milestone 1 — Detail pages (three surfaces) **[Upcoming]**

Design spike first (three proposals), then implement. **No shared completion-modal work here** — keep existing complete / mark-applied behavior working end-to-end; modal unification moves to Milestone 2.

1. **Misc / non-app task detail** (`/tasks/:taskId`) — compact layout; subtasks with completion state; clock/bar time viz from estimates (detail only, not Home cards)
2. **Application-task detail** — same family as misc where it helps; call out differences (mark-applied path, posting link, etc.)
3. **Application pipeline page** redesign (distinct from application *task*) — less clutter: status as **selector + Save** (not a row of action buttons); denser notes / job description

Also:

- Home Upcoming items link to the **individual** task or application (not only `/tasks`)
- Tasks page: clicking a task **title** opens that task’s detail page
- Completed tab: clicking a completed task opens its detail page; show checked subtasks

### Milestone 2 — Reflections, stickies & completion modals **[Upcoming]**

Attach reflections to work; dedupe and beautify completion flows. Order: detail pages first, then this, then recurring (sectioned stickies UI is reused for dates).

**Data / linking**

- Reflections optionally link to task, application, and/or interview step; **unattached** allowed
- **Retroactive link** from task/application pages and from wherever reflection logs are shown (exact host page TBD with Progress IA)
- Multiple stickies per task/application; on application surfaces, section by interview step (or “application” when not step-specific)
- Deep work: **toggle** (not checkbox), default on when the reflection panel is engaged for interview steps; never auto-grant a deep-work unit without a corresponding reflection
- Pending design: optional **“Other”** reflection category for deep work that is neither application nor technical — heatmap / Home checkmark behavior TBD

**Modals (functionality + visual polish together)**

- Shared complete / mark-applied modal on Jobs and Tasks (same component)
- Optional **Reflection** and **Notes** as collapsible panels: light-purple top bar (same shade as Progress → History day reflection chrome) with toggle in the bar
  - Click toggle or bar → expand textarea and set toggle true
  - Click again → collapse and set false; **keep typed text**
  - Submit while collapsed with text present → keep editing / discard confirm (“Discard reflection/notes?”), same family as outside-click dirty confirm
- Defaults: applications/tasks → reflection **off**, notes **off**; interview finish step page 2 → reflection **on**
- Deep work toggle near reflection (layout TBD)
- Optional **actual time** field always available; if blank, fallback default **15 minutes** for task points later (1:1 minutes→points for base tasks)
- Interview finish: **page 1** (current outcomes / next step) → Next → **page 2** (optional reflection) → Finish step
- Invest time in modal visual design so these flows feel intentional, not stacked textareas

### Milestone 3 — Recurring tasks **[Upcoming]**

Short UI design pass, then build. Reuses Milestone 2 sectioned-stickies chrome (by **date** instead of interview step).

- Recurrence: daily; weekly on selected weekdays (Sun–Sat); monthly on selected days of month (1–31)
- Shared task page across instances; stickies sectioned by date
- Mini-calendar of instances for the **next month**; easy add/remove instance for a due date
- Missed days stay **overdue**; option to delete instance or change due date (similar to subtasks)
- Subtasks + recurring: show subtasks of the **earliest open instance** (labeled with that date); instance complete only when all its subtasks **and** the parent instance are marked done → then surface the next instance’s subtasks on the shared page

### Milestone 4 — Global points ledger **[Upcoming]**

Build the economy and concrete numbers; **page chrome can be temporary** (e.g. Progress) until Milestone 7 places balance/history on Rewards and decides Progress vs past-work IA.

- Single **global balance** + category breakdown (pie or similar): apps / LC / tasks / interview / deep work / etc.
- Event log: points earned, redeemed for [reward]; undo reverses/removes the corresponding log row
- **Working formula seeds (iterate in-milestone):**
  - **Base tasks:** points **1:1 with actual minutes** when provided; if actual blank → **15** points (15-minute default). Estimate still stored for disparity views, not used as the point amount when actual is present
  - **LC:** from daily stepper (optional later: easy/medium/hard tiers — may need LC model change)
  - **Applications:** shared baseline (easy-apply); reflection adds effort points; one log increment can show base + reflection
  - **Interview steps:** higher flat base by **step type** (recruiter vs technical vs final — numbers decided here); reflection adds effort
  - **Deep work / reflection:** effort from estimated time on the reflection when provided; else a reflection baseline
  - **Weekly LC/apps target met:** one-time point event (flourish + Home target rows in Milestone 5)
- Past completion logs: show **estimated vs actual** when both exist so calibration is visible
- No zero-point “shell task” category — weekly target visibility/bonus covers that use case (Milestone 5)

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

</details>

---

## Format note (for future features)

When starting a large initiative:

1. Add a `## Feature: …` section with **Why** and status tag if needed (`[Upcoming]` / `[In progress]` / `[Parked]`).
2. Put numbered milestones (from **0** for that feature) under a **Milestones** `<details>` dropdown.
3. Plan prose may be detailed while **[Upcoming]**; after ship, tighten bullets and add **Result** only when the feature (or a clear slice) is complete.
