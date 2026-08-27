# career-digest

Personal internship finder and application tracker.

Ingests public ATS job boards, keeps current internships in PostgreSQL, and lists them over HTTP. Later: LLM ranking and an application tracker.

## Stack

- Backend: Node.js + TypeScript + Express
- Database: PostgreSQL
- Job boards: Greenhouse, Lever, Ashby (Simplify miscellaneous planned)
- Ranking (later): OpenAI API

## Milestone 1

Greenhouse ingest, Postgres schema, `GET /jobs`.

## Milestone 2

- Lever and Ashby adapters, plus a larger verified company list
- Season / recency filters (`target` vs `optional` vs stale)
- Retention: keep rows that are still on the board; delete taken-down jobs only if there is no application record

## Setup

```bash
cp .env.example .env
createdb career_digest   # or: docker compose up -d
npm install
npm run migrate -w @career-digest/api
npm run ingest -w @career-digest/api
npm run dev -w @career-digest/api
```

- http://localhost:3000/jobs — open internships (not taken down), `target` then `optional`
- http://localhost:3000/jobs?all=true — same table, including non-internship rows if any remain

Boards: `apps/api/src/config/companies.ts`.
