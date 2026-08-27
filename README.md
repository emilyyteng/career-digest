# career-digest

Personal internship finder and application tracker.

Ingests public ATS job boards (plus Simplify URLs), keeps current US internships in PostgreSQL, and tracks applications in a local React UI. Next: LLM ranking.

## Stack

- Backend: Node.js + TypeScript + Express
- Database: PostgreSQL (Postgres.app locally; Docker Compose optional)
- Job boards: Greenhouse, Lever, Ashby, Simplify
- Ranking (later): OpenAI API
- UI: React (Vite), local only

## Milestone 1

Greenhouse ingest, Postgres schema, `GET /jobs`.

## Milestone 2

- Lever and Ashby adapters, plus a larger verified company list
- Season / recency filters (`target` vs `optional` vs stale)
- Retention: keep rows that are still on the board; delete taken-down jobs only if there is no application record

## Milestone 3

- US-only location filter (drop confident non-US; keep unknown/mixed)
- Simplify ingest for apply URLs that are not Greenhouse, Lever, or Ashby
- `GET /jobs` lists open internships only (`?all=true` removed)

## Milestone 4

- Local React UI: Jobs vs Applications
- Star / apply / manual applications / link a posting / notes / documents
- `is_internship` column removed (intern-only `postings` table)

## Setup

```bash
cp .env.example .env
createdb career_digest   # or: docker compose up -d
npm install
npm run migrate -w @career-digest/api
npm run ingest -w @career-digest/api
npm run dev -w @career-digest/api
```

http://localhost:3000/api/jobs — open internships, `target` then `optional`.

UI (API + Vite together):

```bash
npm run dev:api
npm run dev:web
```

Then open http://localhost:5173. Boards: `apps/api/src/config/companies.ts`.

Jobs lists adapter-found roles that are still on the board and not yet applied. Applications is the tracker (including Handshake/LinkedIn rows you add yourself). Link a digest posting from an application detail page to merge the two.
