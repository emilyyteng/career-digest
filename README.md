# career-digest

Personal internship finder and application tracker.

## Milestone 1

Ingest public Greenhouse job-board JSON, store it in PostgreSQL, and list internships over HTTP.

## Setup

```bash
cp .env.example .env
createdb career_digest   # or: docker compose up -d
npm install
npm run migrate -w @career-digest/api
npm run ingest -w @career-digest/api
npm run dev -w @career-digest/api
```

Then open http://localhost:3000/jobs (internships only) or http://localhost:3000/jobs?all=true.

Edit the Greenhouse boards in `apps/api/src/config/companies.ts`.
