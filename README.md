# career-digest

Personal internship finder and application tracker.

Ingests public ATS job boards (plus Simplify URLs), scrapes missing descriptions, ranks roles with OpenAI, and tracks applications in a local React UI.

## Stack

- Backend: Node.js + TypeScript + Express
- Database: PostgreSQL (Postgres.app locally; Docker Compose optional)
- Job boards: Greenhouse, Lever, Ashby, Simplify
- Ranking: OpenAI API (`gpt-4o-mini` by default; Batch + live)
- UI: React (Vite), local only

## Milestone 1

Greenhouse ingest, Postgres schema, `GET /jobs`.

## Milestone 2

- Lever and Ashby adapters, plus a larger verified company list
- Season / recency filters for ingest (insert intern titles; skip expired terms and old undated listings)
- Retention: keep rows that are still on the board; delete taken-down jobs only if there is no application record

## Milestone 3

- US-only location filter (drop confident non-US; keep unknown/mixed)
- Simplify ingest for apply URLs that are not Greenhouse, Lever, or Ashby
- `GET /jobs` lists open internships only (`?all=true` removed)

## Milestone 4

- Local React UI: Jobs vs Applications
- Star / apply / manual applications / link a posting / notes / documents
- `is_internship` column removed (intern-only `postings` table)

## Milestone 5

- Scrape blank Simplify descriptions from apply pages (HTML sanitize, link-preserving extraction)
- `scrape_status` + retry backoff for blocked/empty/error hosts
- Skip ranking postings with empty job descriptions (saves OpenAI tokens)

## Milestone 6

- OpenAI ranking: Batch API by default (`npm run rank`), live drip (`npm run rank:live`)
- Client rate gate (RPM/RPD/TPM), stall cancel + live fallback for small leftovers
- Preference signal from likes/dismissals and applied/interviewing/hired tracker rows

## Milestone 7

- Board refresh pipeline: ingest → scrape → light live rank (`npm run board-refresh`)
- Optional daily 5pm LaunchAgent cron (`npm run cron:install`)
- Jobs UI: Refresh board, rank badges, like/dismiss feedback, Batch progress banner

## Milestone 8

- Applications: date applied, rich-text JD paste, status-change ordering, tab counts
- Status-colored badges; location autocomplete from existing applications
- Modal add-application form; save/upload flash confirmations

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

- API: http://localhost:3000/api/jobs
- UI: http://localhost:5173
- Boards: `apps/api/src/config/companies.ts`

### Useful commands

| Command | Purpose |
|---------|---------|
| `npm run migrate` | Apply SQL migrations |
| `npm run ingest` | Pull ATS + Simplify listings |
| `npm run scrape` | Fill blank Simplify descriptions |
| `npm run rank` | Rank via OpenAI Batch API |
| `npm run rank:live` | Rank synchronously (rate-limited) |
| `npm run board-refresh` | Ingest + scrape + light live rank |
| `npm run cron:install` | Install 5pm daily board refresh (macOS) |

Jobs lists open digest roles that are not yet applied (starred stay visible). Applications is the tracker (including Handshake/LinkedIn rows you add yourself). Link a digest posting from an application detail page to merge the two.
