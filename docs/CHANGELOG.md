# Changelog

**flora.exe** is a personal hub for life and career management: job boards and ranking when you need them, plus applications, interviews, tasks, weekly goals, progress, and rewards in one local app. This changelog records what has shipped, feature by feature: why each piece was built, the product and technical decisions behind it, and what it changed.

Planned work isn't listed here. It lives in the [roadmap](./features/README.md) and the feature specs. For setup, see [SETUP.md](./SETUP.md).

Features are listed by ID. Milestones are numbered within each feature from M0, and a gap in the numbering is a milestone that hasn't shipped yet. Milestones were renumbered this way on 2026-10-12; earlier versions of this file used one global sequence.

---

## Job board ingest & ranking (F01)

*Built 2026-08-26 to 2026-09-25.*

**Why:** Internship postings are spread across hundreds of company boards on several applicant-tracking systems (ATS). Aggregators like Simplify repeat many of the same roles behind links with no description. The aim was one board of open US internships, with real descriptions, ranked by fit and refreshed without manual work.

### M0: Ingest and the open-board API

Adapters for Greenhouse, Lever and Ashby, later joined by Oracle Recruiting Cloud, pull postings into Postgres. They're filtered to US locations and the current internship cycle.

- **Simplify only fills gaps.** It's ingested only for postings whose apply link doesn't point straight at an ATS, because the ATS board is the better source.
- **Duplicates merge onto the ATS posting.** When the same job appears on both, a merge step matches them on the ATS job ID embedded in the link.
- **New boards are discovered automatically.** A discovery script finds new company boards from Simplify's ATS links. Oracle boards with more than 250 jobs are left to the Simplify path, because they're too large to ingest directly.
- **Applied roles are kept.** A posting that leaves its board is deleted unless an application exists for it.

`GET /api/jobs` serves the open internships not yet applied to.

### M1: Jobs list

The first React page: browsing the board by status and source.

### M2: Descriptions and scraping

Ranking a posting without its job description wastes tokens and gives poor results.

- Greenhouse, Lever and Ashby descriptions come from board data at ingest.
- Simplify-only postings are scraped from their apply pages. The HTML is sanitized, and retries back off per host (tracked in `scrape_status`).
- Ranking skips postings with blank descriptions. They wait in a Needs description tab until they're filled or dismissed.
- Apply and posting URLs became editable on job and application pages.

### M3: OpenAI ranking and the daily pipeline

OpenAI scores each posting against a written preference profile plus the user's own signals: up to 75 recent likes and dismissals and 12 application-tracker rows per prompt.

- **Two ways to run.** Ranking runs as a batch (`npm run rank`) or as a live drip.
- **Staying within OpenAI's limits.** A client-side rate gate caps requests per minute, requests per day and tokens per minute, with stall recovery and a rerank queue.
- **One-click refresh.** A board-refresh action, also available as an optional daily cron job, chains ingest, scraping and ranking of new postings.
- **Jobs page.** It gained Ranked, Mismatches, Unranked and Needs description tabs, heart and mismatch feedback, and rank badges.

The preference profile is a local config file kept out of the repository (an example is checked in), so personal preferences aren't published.

### M4: Hide from board vs mark as mismatch

Not every dismissal should teach the ranker. Sometimes a role fits but isn't wanted, for example when one employer has many similar listings.

- **Optional teaching.** Mark as mismatch gained a "Use as ranking feedback" toggle, on by default. With it off, the posting leaves Ranked but is left out of future rank prompts.
- **Hide an employer.** A job page offers "Hide {employer} from board" when that employer has two or more ranked postings, with a confirm list for keeping specific ones.
- **Employer names.** Progress now shows the right employer for Simplify postings.

### M5: Tracked boards in Postgres

The list of company boards moved from a source file into a `tracked_boards` table. The daily refresh now runs discovery before ingest, so new boards are picked up without a code change.

**Outcome:** Open internships flow from several ATS sources through scraping and preference-aware ranking into one daily-refreshed board. Teaching the ranker and quietly hiding roles are separate controls.

---

## Applications tracker (F02)

*Built 2026-08-26 to 2026-08-28.*

**Why:** Browsing postings and tracking applications are different jobs. Applications needed their own record (status, materials, deadlines, notes), including for roles found outside the board.

### M0: Tracker

- A list of applications with status tabs, and a detail page for each one with uploaded documents and an optional link to its posting.
- The posting link is optional, so manually found roles can be tracked too.

### M1: Day-to-day workflow

- **Statuses and cards.** Applied, interviewing, accepted and declined, each with a badge and the source on every card. Cards show the date applied and are ordered by their last status change.
- **Deadlines.** Apply-by deadlines with countdowns.
- **Descriptions and materials.** Rich-text job descriptions with a scroll box, location autocomplete, in-browser PDF and image preview, and an add-application modal.

A to-do status for roles not yet applied to lived here briefly. It later moved to Tasks (F04).

**Outcome:** A full application pipeline with statuses, materials and deadlines, kept separate from the job board.

---

## Interviews & ops shell (F03)

*Built 2026-08-27 to 2026-09-05.*

**Why:** Interviews are multi-step threads with their own deadlines. Meanwhile the ingest, scrape and rank pipeline runs in the background, where failures go unnoticed.

### M0: Interviews, Home and Status

- **Interviews.** Each company has an interview thread with linear steps, countdown timers, a workspace, and a flow for resolving it.
- **Home.** A first dashboard: greeting, last digest, items needing attention, and new and top-ranked picks.
- **Status.** A page backed by `GET /api/ops` showing pipeline health.
- **Shell.** The app's sakura-terminal theme and navigation.

**Outcome:** Interview threads, a Home dashboard and pipeline monitoring, in one consistent shell.

---

## Tasks backlog (F04)

*Built 2026-08-29 to 2026-09-23.*

**Why:** "Still need to apply" was a status inside the application tracker, and work like school, reading and admin had no home at all. Things to do needed one backlog, separate from the record of applications.

### M0: Unified backlog

- **Tasks page.** Open and Completed tabs, holding application tasks and everything else.
- **From Jobs.** Jobs gained Add to tasks / Remove from tasks, replacing the to-do star.
- **Applying.** Completing an application task marks its application Applied, and so does marking a role applied from Jobs.
- **Migration.** Existing to-do applications became application tasks, so the tracker only holds roles already applied to.
- **Home.** Its attention list showed interviews first, then up to four tasks by due date.

### M1: Categories

- Open tasks are grouped into sections, each with its own Add button: Applications first, then School, Reading, Writing, Admin and any custom categories.
- Tasks can move between categories. Existing school and personal tasks moved to School and Admin.

### M2: Subtasks, priority and estimates

- **Subtasks.** One level of subtasks, each with its own due date (shown on Home). Completing a parent completes its open subtasks.
- **Priority and estimates.** P0, P1 and P2 priority, and estimates in minutes.
- **Editing.** A bulk edit modal for subtasks, drag-to-reorder, and duplicating a task along with its subtasks.

The daily application and LeetCode goals on Progress were set to 3.

**Outcome:** Tasks became the actionable backlog: categorized, with subtasks, priorities and estimates. Application tasks are tied to marking a role applied.

---

## Progress tracker (F05)

*Built 2026-08-30 to 2026-08-31.*

**Why:** A job search is long, and most days produce no visible outcome. Tracking the inputs (applications sent, LeetCode problems solved, focused deep-work sessions) gives daily evidence of progress.

### M0: Progress page

- **Data.** `leetcode_daily` and `reflection_logs` tables behind `/api/progress`. Applications count on the local calendar date they were applied.
- **Today tab.** A daily strip, week and month totals, separate heatmaps for application and technical effort, and a log.
- **History tab.** A calendar with view-first editing.
- **Home.** A today strip: applications out of 3, LeetCode out of 3, and whether deep work happened.

**Outcome:** Daily and weekly evidence of effort, with LeetCode and reflection logging, visible from Home.

---

## Portfolio demo (F06)

*Parked. Nothing has shipped.*

A hosted sandbox with fictional data, so visitors could try the app without seeing real data or triggering paid API calls. Work started and was paused before release. See the [spec](./features/F06-portfolio-demo/spec.md). The documentation work first grouped with this feature is recorded under Documentation & development process (F10).

---

## Home: Upcoming & weekly goals (F07)

*Built 2026-09-22 to 2026-09-25.*

**Why:** Home's attention list stopped at four items and mixed urgent work with planning. The week needed to be readable from Home: what is due, what is only intended, and whether LeetCode and application pace is on track.

### M0: Upcoming this week

- "Upcoming this week" replaced the attention list. It shows overdue items plus the next seven days, with interviews and tasks together, grouped by day.
- It lists only dated items the user can act on, so interviews waiting on the employer are left out. There's no item cap.

### M1: Weekly goals and due kinds

- **Due kinds.** Tasks and subtasks gained a due kind: a **deadline** (external and firm) or a **target** (self-set).
- **Deadlines vs Targets on Home.** Deadlines are a flat list with countdowns. Targets are grouped by day in two columns, with an overdue group, and show only the earliest subtask per task.
- **Weekly goals.** A LeetCode count target, and an applications goal made of application tasks tagged "target this week". Home's This week strip shows equal-width bars with ahead or behind pace, beside the Today row.
- **Interviews.** Finishing a step now defaults to "waiting on them".
- **Fix.** A migration crash when replaying older SQL.

**Outcome:** Home separates hard deadlines from self-set targets and shows weekly pace next to the day's progress.

---

## Accomplishment, detail pages & rewards (F08)

*In progress since 2026-10-09. [Spec](./features/F08-accomplishment-rewards/spec.md).*

**Why:** Finishing work didn't feel like anything. Tasks and applications had no page of their own, reflections weren't attached to the work they described, and completing something left no lasting trace. This feature makes accomplishment visible: detail pages, reflections on real work, one completion flow, and a points economy that effort feeds into.

### M0: Quick fixes

- This changelog was reorganized by feature.
- Toggling "target this week" no longer re-sorts the Applications section.
- When a posting leaves its board, its open application task goes with it.
- The Add Task form gained the deadline / target choice.
- The weekly LeetCode stepper also updates today's daily count.
- Home's Upcoming range can be set to one or two weeks, remembered per browser.

### M1: Detail pages

Three layout proposals per page were prototyped before anything was built. Completion modals were deliberately left alone until M2.

- **Task page (`/tasks/:taskId`).** Serves both misc and application tasks. It has:
  - a header with Complete or Mark applied
  - the due date labeled deadline or target, with a live countdown drawn as 12-hour pie circles
  - checkable, draggable subtasks, or the job description for application tasks
  - an edit form
- **Application page.** Redesigned around a left rail holding the stage (a status selector with Save), documents and the posting link. The main column holds a fixed-height job description and notes.
- **Links.** Home's Upcoming items, task titles on the Tasks page and completed tasks all open their detail page. Completed tasks show their checked subtasks.
- **API.** `GET /api/tasks/:id` returns a single task, with the posting's description when the task has none.

### M2: Reflections on real work, one completion flow

**Linking.** A reflection can now link to a task or an application, and optionally to an interview step under that application. Unlinked reflections remain valid.

- Marking an application task applied moves its reflections to the application.
- Task and application pages list their reflections oldest first, and can link an existing reflection or start a new one.
- Progress gained a link search when writing or editing a reflection.
- The originally planned grouping of reflections by interview step was dropped in favor of a single list.

**Deep work** became an explicit toggle on each reflection instead of being implied, and a third "Other" category joined application and technical. The daily strip shows one deep-work badge per category. Existing reflections were migrated as deep work, unlinked.

**Completion.** Jobs and Tasks share one modal for completing a task or marking an application applied.

- It has optional Reflection and Notes panels. A panel can be collapsed without losing its text, and the modal asks before discarding text left in a collapsed panel.
- Finishing an interview step became two pages: the outcome first, then an optional reflection.

### M4: Points ledger

One global points balance makes effort visible, and later spendable.

**Rules.** The ledger is forward-only:

- Earned points are never deleted. Corrections are recorded as reverse or adjust events.
- The balance never goes below zero.
- Subtasks earn nothing.
- Completing work together with a reflection records one combined earn, not two.

| Action | Points |
|--------|--------|
| Misc task complete | 1 per actual minute, or 15 if no time is entered. A reflection adds a flat 20 |
| Application marked applied | 5. A reflection adds 1 per reflection minute, or 20 if no time is entered |
| Interview step finished | By kind: assessment 60, phone 50, technical 80, onsite 100, offer 200, custom 40. Same reflection bonus as applications |
| Reflection written on Progress | 1 per minute, or 20 if no time is entered. Only when created; linking an existing reflection earns nothing |
| LeetCode | 30 per problem, with no daily cap |
| Weekly LeetCode or applications goal met | 100, once per week per goal |

**Implementation.**

- A `points_events` table records each event with the running balance. Tasks and reflections gained `actual_minutes`.
- `GET /api/points` and `GET /api/points/events` serve the total and the history.
- Editing a completed task's actual minutes adjusts its points, and reopening a misc task reverses them.

**Interface.**

- Misc tasks always ask for actual time, prefilled from the estimate. Applications and interviews ask for minutes only inside the reflection, matching the formula.
- Progress gained a Ledger tab with two views: a Completions diary (week and month totals, filters by type, entries grouped by day) and a Points view (total, a bar for each category, the event log).
- A brief mint flash shows the points earned after each completion.
- Completed tasks show estimated vs actual time and points.

**Later fixes.** Marking an application applied from Jobs now has the same outcome as from Tasks: the task's reflections move to the application, the modal's time and notes are saved, and the weekly apps goal is checked. Re-completing a reopened task or raising a LeetCode day back up earns its points again instead of nothing, and category totals no longer count a reversed earn twice.

### M5: Weekly goals, streaks, achievements and celebration

Weekly goals become a closed loop: Progress edits the week, week close writes fixed records and awards points, Home celebrates met weeks and surfaces unmet Sunday targets, and the completion log keeps the history.

**Weekly goals.**

- LeetCode logs as weekly or misc by difficulty tier through one write path (easy +20, medium +30, hard +50). An optional ≤50-character LC label clears on a new week; the target carries forward.
- Week close (oldest first, under a lock) stores `weekly_goal_records`, awards per-unit and flat bonus points, and carries open tagged apps into the next week. 0/0 apps never counts as met.
- Progress shows the weekly block with pace, `met`/`+N` bar tail, flame weekly-goal streak from 2 weeks, and plain apps members (applied tags, no untag).
- Home Upcoming lists unmet goals as Sunday Targets rows (mini bar, pace, `resets Monday`; LC label; no apps row when none tagged; never overdue). The hero's compact "This week" bars are gone.
- The first Home visit after a week with met goals shows a one-time congrats banner from the week-close record (counts, points, flame streak). Seen per week in `localStorage`; the pattern is documented next to `EarnFlash` in the design system.

**Streaks and achievements.**

- Daily LC and apps streaks: length and today counts on Progress; daily points `min(20, 2×length)` and milestones `5×length` under ledger category `streak`.
- The today strip shows day-streak pills plus raw day counts and today's points.
- Count-based achievements unlock once (launch unlocks free) with a Progress achievements tab and unlock modal.

**Points rule adjustments.**

- Ledger totals split tasks by task category. Work time belongs to the work; reflections are flat +20 notes; misc tasks and applications both get a +10 base. Deep work is retired.
- Weekly records and LeetCode day rows appear in the completion log; the weekly tab is labeled weekly goals.

**Outcome:** Hitting a weekly target pays at week close, shows up on Home once, and leaves a durable record. Daily streaks and achievements add lighter celebration without inventing a third banner pattern.

### M6: Board departures log

When a posting leaves the open board (or a Simplify row is removed as a duplicate), Status can explain why an application task may have vanished.

- Departures are snapshotted before delete: title, company, location, reason (`Left board` / `Duplicate`), and whether an open application task was actually removed (duplicate merges that only repoint a task do not count as removed).
- Applied applications keep their postings and stay out of the log; filter-reject deletes are not logged. Records start when the feature ships — no backfill.
- Retention is the recorded local day through the next local day; purge runs on ingest/merge day boundaries, not when the log is read.
- Status shows per-day sections (today expanded), with task-removed rows highlighted and filterable, plus a per-day removed count when it is not zero.

**Outcome:** Ops Status holds a short, low-scroll record of board churn that complements urgency cues on Tasks.

### M7: Cat Cake Collection v1 (Rewards)

Seeds become spendable on a dedicated Rewards area: a bakery gacha with collection, earnings, pull history and an in-app rules reference. The old Progress points ledger moves to Rewards Earnings; completions stay on Progress.

**Currency and ledger.**

- The user-facing name is **seeds** (one shared display constant so it can be renamed later). Storage may still say `points_`*.
- The balance may go negative. Pulls are blocked whenever the purse is below the cost.
- Chrome shows `{balance} seeds ({lifetime} lifetime)`, where lifetime is all non-spend ledger amounts (work earns plus Cake refunds). Pull spends reduce the balance only.
- Ledger kinds `spend` and `refund` with category `gacha` record banner activity. Earnings labels refunds as **Cake** and never nets spends into those bars.

**Gacha.**

- Twelve classic flavors and twelve Collector's Editions. Day/Night are skins of the same CE: Night unlocks on the second CE copy; toggling is free.
- **180 seeds** per pull; ×10 costs 1,800. Base CE rate 1.5%, soft pity from pull 13, hard pity at 20. Server CSPRNG; a 10,000-run Monte Carlo guards the rates in CI.
- Friendship keeps six copies; manual refunds only for copies above six (+18 classic / +90 CE).
- Banner reveal is one-by-one (Skip jumps to closed boxes, then open-all, then a full revealed grid until dismiss). Collection is an album grid with Day/Night controls.

**Rewards routes.** Banner (default), Collection, Earnings (ranged earn-side bars and day-grouped log), Pull history (lifetime spend and n-th time each variant was pulled), and Rules (numbers read from the same modules the API uses).

**Outcome:** Effort on Progress earns seeds; Rewards is where they are spent and accounted for, with collection and history that survive duplicate refunds.

### M8: Progress redesign

Progress becomes a nested hub for weekly pace and lifetime accumulation. Currency and the earn log stay on Rewards; Progress is about what you did.

**Shell.** Nested routes under Progress: This week (default), Past work, and Lifetime. Old tab and query URLs redirect (points → Earnings, ledger history → Past work, achievements → Lifetime).

**This week.** Day streaks; a week and month pulse (LC, apps, tasks, interviews, reflections / minutes); next achievement per family; weekly goals with weekly-goal streaks; LeetCode logging (tier names and +20 / +30 / +50) kept separate from reflection compose.

**Past work.** A calendar with an always-editable day panel (interviews above apps); completions for the seven days ending on the selected day; calendar cells colored by raw apps + LC (no effort checkmarks, no clamp to three).

**Lifetime.** An accumulation header (including days worked); a seeds-earned-per-day activity chart with an in-container range and labeled axes; side-by-side prep heatmaps on a pastel pink → purple → navy intensity scale; the full achievements list grouped by family in two columns.

**Outcome:** Progress shows whether the week is on track and keeps a durable record of work done; Rewards remains where seeds are spent.

---

## Design system migration (F09)

*Built 2026-10-15 (M0–M1).* Spec: [F09](./features/F09-design-system-migration/spec.md).

**Why:** The app accumulated conflicting visual dialects (filled blue buttons, purple interim controls, open-canvas Rewards, overloaded accent meanings). New UI needed an authoritative foundation before primitives and surface migrations.

### M0: Visual direction and foundations

- Inventory of production UI (beyond parked defects), then an exploratory lab at `/prototype/f09/lab`.
- Locked **Ink desk** vibe: sakura canvas, ink primary actions and titles, flat controls, all-carded containment (including Rewards), 1100px shell.
- Brand mark **flora.exe**; type roles **IBM Plex** Mono / Sans.
- Color-meaning roles: identity (apps blue / tech purple / reward pink) separate from severity RYG and Severity-5 urgency; heatmap = vivid rose soft peak.
- Documented in [`docs/design-system.md`](./design-system.md). F08 M5 interim visuals superseded. Production CSS migrates in later milestones.

**Outcome:** New UI and F09 waves have a single visual standard to follow; interaction/IA patterns remain for M1.

### M1: Primitives, patterns, enforcement, Home pilot

- Shared primitives: `Button`, fields, `Segmented`, `ChromeTab`, `Badge`; heat/urgency washes; global filled-blue button default and `:not(...)` chain removed.
- Pilot-migrated **Home** and the app shell (flora.exe, underline chrome-tabs, 1100px).
- Locked IA patterns in the design system: feature shell / nested tabs; dual-panel **28rem** height with in-panel scroll; chrome budget; shared `**Pager`** contract (size 25, no jump select); EarnFlash near-control; compact long-page tactics (chips → well → pager → clamp); modal header→body→footer; in-content link hover (ink + underline).
- Mechanical enforcement: `npm run check:ui` fails bare `<button>` app-wide and unclassed fields on the Home tree.

**Outcome:** The design system is authoritative for new UI. Core surfaces (Tasks, Jobs, Applications, Interviews, Progress polish) migrate in M2.

---

## Documentation & development process (F10)

*Built 2026-08-31 and 2026-10-12 to 2026-10-13.*

**Why:** The repository needed to make sense to outside readers. Development also needed a dependable source of truth: requirements had lived in the changelog and in local, untracked notes, so plans mixed with history and work started from incomplete or stale context.

### M0: A public-facing repository

- A short README for visitors, with milestone history moved to this changelog.
- A setup guide with a fresh-clone checklist, and an MIT license.
- The ranking profile moved to a local config file, with an example checked in.
- Personal data and working notes kept out of the repository.

### M1: Specs, tickets and a written process

- `**AGENTS.md` is the single process reference.** It sets which source wins in a conflict (user, then spec, then ticket, then prototype; the design system on visuals). It defines the feature workflow: spec, tickets, prototype, implement, verify, commit.
- **Specs.** Each feature has a permanent ID and, once active, a spec.
  - Requirements are tagged Established (confirmed by the user, and the only kind that may be built) or Proposed (awaiting confirmation).
  - Existing behavior is audited separately, and never treated as a requirement just because it exists.
- **Tickets and maintenance.** Ticket templates, a maintenance area for work no feature owns, and a triage file for surfaced issues awaiting a decision.
- **Design system.** A design-system reference, and editor rules that load it when UI or docs files are edited.
- **Prototypes.** They're version-controlled but kept out of navigation, and every variant must meet the locked requirements.
- **This changelog.** Rewritten as a shipped-only history, renumbered per feature.

**Outcome:** Requirements, decisions and known issues live in tracked documents that every working session reads, and this changelog records only what shipped.

---

## Custom habits & weekly targets (F11)

*Spec:* [features/F11-habits-and-weekly-targets/spec.md](./features/F11-habits-and-weekly-targets/spec.md). *Built 2026-10-15 to 2026-10-16.*

**Why:** Daily streaks only covered career prep (applications and LeetCode). Named personal habits needed the same streak-points rules, plus a place for non-daily quotas as weekly targets rather than alternate streak schedules.

### M0: Requirements lock & prototypes

Locked the product rules and settled contested chrome in throwaway prototypes before building.

- Up to six custom daily habits and six custom weekly targets beside always-present apps and LC; same daily streak points as LC/apps; archive does not freeze time; Progress → This week is the habits hub.
- Prototypes chose checkoff vs edit on habit pills, where today-LC logging lives on the strip, classic weekly ± steppers, and a ghost-stamp Archived look. They were deleted when the feature closed.

**Outcome:** Build work followed locked UX instead of inventing strip or weekly chrome mid-implementation.

### M1: Daily custom habits — data & API

Added named daily habits with the same streak-points rules as LC and apps, exposed over HTTP.

- Each habit is a named identity with a boolean checkoff for today; streak length is derived from those days (same idea as LC/apps).
- Points reuse the shared daily and milestone formulas, awarded and reversed only for today, under ledger source ids that cannot collide with `lc:` or `apps:`.
- An API creates, renames, archives, restores, and checks off habits (six active customs max). Today's progress payload includes active and archived habits beside LC and apps streaks.

**Outcome:** The backend can drive a Habits strip; the UI followed in M2.

### M2: Habits strip UI + This week remodel

Shipped a shared Habits strip on Home and Progress, and remodeled This week around it.

- **Habits strip.** Active shows Apps and LC as derived pills, then customs you can check off, rename, or archive, plus a create slot under the custom cap. Archived shows only parked customs; missed days while archived still break the streak. The band also holds Add reflection and Log LC; on Home, Update progress links into Progress.
- **This week.** Week and month pulse cards stay above the strip. Next achievements and the Daily progress aside were removed so the page is the habits hub, not a second achievements surface.

**Outcome:** Daily customs are checkable where the day is managed, and This week has one clear place for habits work.

### M3: Custom weekly targets

Extended weekly goals with named custom quotas, a Check in panel, and Home Targets — same Seeds as apps and LC.

- Named weekly quotas (default target three) sit beside apps and LC. Name and target carry week to week; archive parks a goal without deleting it. Week-close Seeds match apps/LC (+20 per unit, +100 when met). A weeks-in-a-row indicator appears after two met weeks and breaks if a later week closes unmet, including while archived.
- Progress weekly column: create, Active/Archived, rename/archive, and a target stepper near each custom label. **Check in** advances only customs with ±; LC weekly progress still comes from Log LC, with read-only Today and This week tier counts under Weekly LC.
- On Sundays, Home Targets lists unmet active customs alongside apps and LC.

**Outcome:** Non-daily quotas live in the same weekly-goals system as apps and LC, with the same Seeds schedule and a dedicated Check in surface.
