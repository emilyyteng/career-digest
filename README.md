# career-digest

Personal internship finder and application tracker.

Ingests public ATS job boards (plus Simplify miscellaneous URLs), keeps current US internships in PostgreSQL, and lists them over HTTP. Next: a local React UI and application tracker, then LLM ranking.

## Stack

- Backend: Node.js + TypeScript + Express
- Database: PostgreSQL (Postgres.app locally; Docker Compose optional)
- Job boards: Greenhouse, Lever, Ashby, Simplify miscellaneous
- Ranking (later): OpenAI API
- UI (next): React, local only

## Milestone 1

Greenhouse ingest, Postgres schema, `GET /jobs`.

## Milestone 2

- Lever and Ashby adapters, plus a larger verified company list
- Season / recency filters (`target` vs `optional` vs stale)
- Retention: keep rows that are still on the board; delete taken-down jobs only if there is no application record

## Milestone 3

- US-only location filter (drop confident non-US; keep unknown/mixed)
- Simplify miscellaneous ingest for apply URLs that are not Greenhouse, Lever, or Ashby
- `GET /jobs` lists open internships only (`?all=true` removed)

## Setup

```bash
cp .env.example .env
createdb career_digest   # or: docker compose up -d
npm install
npm run migrate -w @career-digest/api
npm run ingest -w @career-digest/api
npm run dev -w @career-digest/api
```

http://localhost:3000/jobs — open internships, `target` then `optional`.

Boards: `apps/api/src/config/companies.ts`.
