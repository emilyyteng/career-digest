# Changelog

Development history for Career Digest. For setup, see [docs/SETUP.md](./SETUP.md).

## Milestone 10 — Portfolio Demo mode + docs hygiene

Public, linkable demo without personal internship data.

- **Demo mode** (`DEMO_MODE`): boot + daily UTC reset into a committed fictional seed; `POST /api/demo/reset`; `GET /api/ops` reports `demo`
- Gates live board refresh, live rank backlog, and rerank (API 403 + UI disabled with tooltip); persistent Demo banner
- Docs: gitignore local agent glossary/ADRs/specs; keep this changelog; Railway / ~$10-cap notes in README + SETUP

## Milestone 9 — Hide from board vs Mark as mismatch

Quiet board cleanup without teaching the ranker, while keeping one **Mismatches** tab.

- `posting_feedback.teach` — dismissals with `teach=false` stay off Ranked but are omitted from rank prompts
- Mark as mismatch dialog: **Use as ranking feedback** toggle (default on); off hides notes and does not teach
- Job detail: **Hide {employer} from board** when ≥2 ranked siblings (display employer); confirm list with X-to-keep
- Progress History/Today: correct Simplify display employer; Apps list on Today tab

## Milestone 8 — Progress tracker

Activity / Effort / Outcome for internship search motivation.

- `leetcode_daily` and `reflection_logs` tables
- Progress APIs (`/api/progress/*`) including dated LeetCode + reflection edit
- **Progress** page (`/progress`): **Today** (strip, week/month Outcome, dual heatmaps, log) and **History** (calendar dig-in, view-first edit)
- Application activity derived from `applications.applied_at` (local calendar date)
- Home today strip (`Today: n/5 apps · n/5 LC · deep work ✓` / `no deep work`)

## Milestone 7 — Unified Tasks backlog

Separate **what you need to do** from the **Applications tracker**.

- **Tasks** page (`/tasks`): **open** and **completed** tabs for school, personal, and application tasks
- **Add to tasks** / **Remove from tasks** on Jobs (replaces to-do star); completing an application task marks **Applied**
- School/personal tasks archive to **completed**; application tasks do not
- Manual application tasks and link-to-posting from the edit modal
- Legacy application to-dos migrated to open application tasks; Applications tracker is pipeline-only (no to-do tab)
- Home **Needs attention** shows **Interviews** then **Tasks** (up to four open tasks, sorted by due date)

## Milestone 6 — Interviews, home, and ops dashboards

Track interview pipelines per company, see what needs attention at a glance, and monitor ingest/rank/scrape health without digging through logs.

- Interview threads with linear steps, countdown timers, workspace, and resolve flow
- Home dashboard: greeting, last digest, interviews and tasks attention, new & top picks
- Pipeline Status page (`/status`) and `GET /api/ops` / `GET /api/home`
- Sakura-terminal UI theme, favicon, nav routing

## Milestone 5 — Applications workflow

Polish the tracker for day-to-day use: pipeline statuses, rich job descriptions, document preview, and UI details that make applying and reviewing materials faster.

- Applications **to-do** tab (legacy; migrating to **Tasks** — see Milestone 7)
- Status badges (to-do / applied / interviewing / accepted / declined) plus source on every card
- Apply-by deadlines and countdown timers on to-do / application-task cards
- Status tabs including accepted and declined; date applied; status-change ordering
- Rich-text JD paste, scroll-box descriptions, location autocomplete
- In-browser PDF/image preview for uploaded materials
- Modal add-application form; save/upload flash confirmations

## Milestone 4 — OpenAI ranking & daily digest pipeline

Score and sort roles with OpenAI using your feedback and tracker history as preference signals, then automate ingest → scrape → light rank via board refresh and an optional daily cron.

- Batch ranking (`npm run rank`) and live drip (`npm run rank:live`, `rank:live-backlog`)
- Client rate gate (RPM/RPD/TPM), stall recovery, rerank queue
- Board refresh UI, heart/mismatch feedback, rank badges and dismissible batch banner
- Jobs tabs: ranked, mismatches, unranked, needs description (search/sort per tab)
- Up to 75 recent likes and dismissals per rank prompt; 12 tracker rows
- Rank system prompt loaded from gitignored `config/rank-profile.md` (see `config/rank-profile.example.md`)

## Milestone 3 — Descriptions & scraping

Fill missing job descriptions for Simplify miscellaneous URLs by scraping apply pages, with sanitized HTML extraction and retry backoff so ranking only runs on postings with real JD text.

- `scrape_status` tracking and host-specific retry windows
- Skip blank descriptions during rank (saves OpenAI tokens)
- Ashby/Lever/Greenhouse JDs from board JSON at ingest
- User-dismissed mismatches leave the needs-description tab
- Editable apply/posting URLs on job and application detail pages

## Milestone 2 — Local tracker UI

A React app to browse the digest board and run a personal application tracker alongside it.

- Jobs list and Applications list with status tabs
- Application detail with documents and optional posting link
- Nullable `posting_id` for manual-only applications

## Milestone 1 — Job ingest & open board API

Pull internship listings from Greenhouse, Lever, Ashby, and Simplify into Postgres, with US location filtering, season/recency rules, and retention that keeps applied roles even when a posting leaves the board.

- Multi-ATS adapters and verified company list
- `npm run discover-boards` scans Simplify ATS URLs (Greenhouse/Lever/Ashby/Oracle) against `companies.ts`; Oracle boards over 250 jobs are deferred for Simplify hybrid (`ORACLE_DISCOVER_MAX_JOBS`; `--write` to append)
- Simplify ingest for **miscellaneous** apply URLs only (skips direct ATS host links; oracle hybrid rows stay on Simplify until merge)
- After ingest, merge collapses duplicates when an ATS board has the same job id (`gh_jid` embeds, Oracle `/job/{id}`; `npm run merge-postings`)
- `GET /api/jobs` for open internships (not yet applied; open **application tasks** stay visible)
