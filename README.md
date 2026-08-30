# career-digest

Personal internship finder and application tracker.

Ingests public ATS job boards (plus Simplify URLs), scrapes missing descriptions, ranks roles with OpenAI, and tracks applications in a local React UI.

## Stack

- Backend: Node.js + TypeScript + Express
- Database: PostgreSQL (Postgres.app locally; Docker Compose optional)
- Job boards: Greenhouse, Lever, Ashby, Simplify (+ SmartRecruiters boards in config)
- Ranking: OpenAI API (`gpt-4o-mini` by default; Batch + live)
- UI: React (Vite), local only

## Milestones

### Milestone 1 — Job ingest & open board API

Pull internship listings from Greenhouse, Lever, Ashby, and Simplify into Postgres, with US location filtering, season/recency rules, and retention that keeps applied roles even when a posting leaves the board.

- Multi-ATS adapters and verified company list
- `npm run discover-boards` scans Simplify ATS URLs (Greenhouse/Lever/Ashby/Oracle) against `companies.ts`; Oracle boards over 250 jobs are deferred for Simplify hybrid (`ORACLE_DISCOVER_MAX_JOBS`; `--write` to append)
- Simplify ingest for **miscellaneous** apply URLs only (skips direct ATS host links; oracle hybrid rows stay on Simplify until merge)
- After ingest, merge collapses duplicates when an ATS board has the same job id (`gh_jid` embeds, Oracle `/job/{id}`; `npm run merge-postings`)
- `GET /jobs` for open internships (not yet applied; open **application tasks** stay visible)

### Milestone 2 — Local tracker UI

A React app to browse the digest board and run a personal application tracker alongside it.

- Jobs list and Applications list with status tabs
- Application detail with documents and optional posting link
- Nullable `posting_id` for manual-only applications

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

### Milestone 5 — Applications workflow

Polish the tracker for day-to-day use: pipeline statuses, rich job descriptions, document preview, and UI details that make applying and reviewing materials faster.

- Applications **to-do** tab (legacy; migrating to **Tasks** — see below)
- Status badges (to-do / applied / interviewing / accepted / declined) plus source on every card
- Apply-by deadlines and countdown timers on to-do / application-task cards
- Status tabs including accepted and declined; date applied; status-change ordering
- Rich-text JD paste, scroll-box descriptions, location autocomplete
- In-browser PDF/image preview for uploaded materials
- Modal add-application form; save/upload flash confirmations

### Milestone 6 — Interviews, home, and ops dashboards

Track interview pipelines per company, see what needs attention at a glance, and monitor ingest/rank/scrape health without digging through logs.

- Interview threads with linear steps, countdown timers, workspace, and resolve flow
- Home dashboard: greeting, last digest, interviews and tasks attention, new & top picks
- Pipeline Status page (`/status`) and `GET /api/ops` / `GET /api/home`
- Sakura-terminal UI theme, favicon, nav routing

### Milestone 7 — Unified Tasks backlog

Separate **what you need to do** from the **Applications tracker**.

- **Tasks** page (`/tasks`): **open** and **completed** tabs for school, personal, and application tasks
- **Add to tasks** / **Remove from tasks** on Jobs (replaces to-do star); completing an application task marks **Applied**
- School/personal tasks archive to **completed**; application tasks do not
- Manual application tasks and link-to-posting from the edit modal
- Legacy application to-dos migrated to open application tasks; Applications tracker is pipeline-only (no to-do tab)
- Home **Needs attention** shows **Interviews** then **Tasks** (up to four open tasks, sorted by due date)

### Milestone 8 — Progress tracker

Activity / Effort / Outcome for internship search motivation.

- `leetcode_daily` and `reflection_logs` tables
- Progress APIs (`/api/progress/*`) including dated LeetCode + reflection edit
- **Progress** page (`/progress`): **Today** (strip, week/month Outcome, dual heatmaps, log) and **History** (calendar dig-in, view-first edit)
- Application activity derived from `applications.applied_at` (local calendar date)
- Home today strip (`Today: n/5 apps · n/5 LC · deep work ✓` / `no deep work`)

## Setup

```bash
cp .env.example .env
# Add OPENAI_API_KEY for ranking / board light-rank
createdb career_digest
createdb career_digest_test   # integration tests only
npm install
npm run migrate
npm run ingest
npm run scrape          # fill Simplify blank JDs
npm run rank            # Batch ranking (or: npm run rank:live)
npm run dev:api
npm run dev:web
```

- API: http://localhost:3000
- UI: http://localhost:5173
- Boards: `apps/api/src/config/companies.ts`

### Useful commands

| Command | Purpose |
|---------|---------|
| `npm run migrate` | Apply SQL migrations |
| `npm run discover-boards` | Diff Simplify ATS URLs vs `companies.ts` (Oracle size probe; `--write` to append) |
| `npm run merge-postings` | Collapse Simplify misc rows when ATS board has same job id |
| `npm run test` | API unit + integration tests (Vitest; needs `TEST_DATABASE_URL`) |
| `npm run backup` | Logical `pg_dump` to `backups/` |
| `npm run restore` | Restore from `backups/` (see script help; stop dev servers first) |
| `npm run ingest` | Pull ATS boards + Simplify miscellaneous listings (merge runs at end) |
| `npm run scrape` | Fill blank Simplify descriptions |
| `npm run rank` | Rank via OpenAI Batch API |
| `npm run rank:live` | Rank synchronously (rate-limited) |
| `npm run rank:live-backlog` | One-shot unranked + outdated rerank |
| `npm run board-refresh` | Ingest + scrape + light live rank |
| `npm run cron:install` | Install 5pm daily board refresh (macOS) |
| `npm run cron:install-backup` | Install daily DB backup (macOS) |

### Testing

- **Unit tests** run without a live database (adapter fixtures, filters, merge helpers).
- **Integration tests** (`*.api.test.ts`, `*.integration.test.ts`) require Postgres and `TEST_DATABASE_URL` pointing at a **separate** `*_test` database — never `career_digest`.
- GitHub Actions runs the full API test suite against Postgres 16 on every push to `main`.

```bash
export TEST_DATABASE_URL=postgres://YOUR_USER@localhost:5432/career_digest_test
npm run test
```

## Nav

| Route | Purpose |
|-------|---------|
| `/` | Home — digest status, today progress strip, needs attention (interviews + tasks), job picks |
| `/jobs` | Ranked digest board (Add to tasks, Applied, feedback) |
| `/applications` | Application tracker (pipeline statuses) |
| `/tasks` | Unified action backlog (open / completed) |
| `/interviews` | Interview pipelines |
| `/progress` | Progress — Today log + heatmaps; History calendar dig-in |
| `/status` | Ops dashboard — board refresh, backup, rank backlog, scrape health |

Jobs lists open digest roles that are not yet applied (postings with an open application task stay visible). **Tasks** is the action backlog; **Applications** is the tracker for roles you have already applied to or are past the “must apply” stage.
