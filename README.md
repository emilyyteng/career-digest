# career-digest

Personal internship finder and application tracker.

Ingests public ATS job boards (plus Simplify URLs), scrapes missing descriptions, ranks roles with OpenAI, and tracks applications in a local React UI.

## Stack

- Backend: Node.js + TypeScript + Express
- Database: PostgreSQL (Postgres.app locally; Docker Compose optional)
- Job boards: Greenhouse, Lever, Ashby, Simplify
- Ranking: OpenAI API (`gpt-4o-mini` by default; Batch + live)
- UI: React (Vite), local only

## Milestones

### Milestone 1 — Job ingest & open board API

Pull internship listings from Greenhouse, Lever, Ashby, and Simplify into Postgres, with US location filtering, season/recency rules, and retention that keeps applied roles even when a posting leaves the board.

- Multi-ATS adapters and verified company list
- `npm run discover-boards` scans Simplify ATS URLs (Greenhouse/Lever/Ashby/Oracle) against `companies.ts`; Oracle boards over 250 jobs are deferred for Simplify hybrid (`ORACLE_DISCOVER_MAX_JOBS`; `--write` to append)
- Simplify ingest for **miscellaneous** apply URLs only (skips direct `greenhouse.io` / `lever.co` / `ashbyhq.com` / `oraclecloud.com` links; oracle hybrid rows stay on Simplify until merge)
- After ingest, merge collapses duplicates when an ATS board has the same job id (`gh_jid` embeds, Oracle `/job/{id}`; `npm run merge-postings`)
- `GET /jobs` for open internships (not yet applied; to-do stays visible)

### Milestone 2 — Local tracker UI

A React app to browse the digest board and run a personal application tracker alongside it—mark to-do, mark applied, add manual Handshake/LinkedIn entries, link postings, notes, and file uploads.

- Jobs list and Applications list with status tabs
- Application detail with documents and optional posting link
- Nullable `posting_id` for manual-only applications

### Milestone 3 — Descriptions & scraping

Fill missing job descriptions for Simplify miscellaneous URLs by scraping apply pages, with sanitized HTML extraction and retry backoff so ranking only runs on postings with real JD text. Scrape uses the same host check as misc ingest; ATS URLs in the Simplify table are marked `skipped_ats` (defense in depth — JDs come from board JSON at ingest).

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

- **To-do** tab with apply-by deadlines, countdown timers, and remove-from-to-do on cards
- Status badges (to-do / applied / interviewing / accepted / declined) plus source on every card
- Apply-by time defaults to 11:59 PM; same-tab navigation preserves list tab, sort, and search
- Status tabs including accepted and declined; date applied; status-change ordering
- Rich-text JD paste, scroll-box descriptions, location autocomplete
- In-browser PDF/image preview for uploaded materials
- Modal add-application form (defaults to to-do); save/upload flash confirmations

### Milestone 6 — Interviews, home, and ops dashboards

Track interview pipelines per company, see what needs attention at a glance, and monitor ingest/rank/scrape health without digging through logs.

- Interview threads with linear steps, countdown timers, workspace, and resolve flow
- Home dashboard: greeting, last digest, interviews and to-do applications attention, new & top picks
- Pipeline Status page (`/status`) and `GET /api/ops` / `GET /api/home`
- Sakura-terminal UI theme, favicon, nav routing (`/` home, `/jobs` board)

## Setup

```bash
cp .env.example .env
# Add OPENAI_API_KEY for ranking / board light-rank
createdb career_digest   # or: docker compose up -d
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
| `npm run merge-postings` | Collapse Simplify misc rows when ATS board has same job id (gh_jid, Oracle job id, slip-throughs) |
| `npm run test` | Run API unit tests (Vitest) |
| `npm run ingest` | Pull ATS boards + Simplify miscellaneous listings (merge runs at end) |
| `npm run scrape` | Fill blank Simplify descriptions |
| `npm run rank` | Rank via OpenAI Batch API |
| `npm run rank:live` | Rank synchronously (rate-limited) |
| `npm run rank:live-backlog` | One-shot unranked + outdated rerank |
| `npm run board-refresh` | Ingest + scrape + light live rank |
| `npm run cron:install` | Install 5pm daily board refresh (macOS) |

Jobs lists open digest roles that are not yet applied (to-do stays visible). Applications is the tracker (including Handshake/LinkedIn rows you add yourself). Link a digest posting from an application detail page to merge the two.
