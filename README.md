# Career Digest

Personal internship digest and application tracker. Ingests public ATS job boards, ranks roles with OpenAI against your private profile, and tracks applications, interviews, tasks, and daily prep progress in a local React UI.

## What it does

| Area | What you get |
|------|----------------|
| **Jobs** | Ranked digest board from Greenhouse, Lever, Ashby, and Simplify |
| **Applications** | Pipeline tracker (applied → interviewing → accepted / declined) |
| **Tasks** | Unified action backlog — application, school, and personal |
| **Interviews** | Step-based pipelines with countdowns and workspace |
| **Progress** | Activity / Effort / Outcome for application and technical prep |
| **Home** | Digest status, today strip, needs attention, top job picks |
| **Status** | Ops dashboard — ingest, scrape, rank, and backup health |

**Tasks** is what you need to do; **Applications** is the tracker for roles you've already applied to (or are past the “must apply” stage). Domain terms are defined in [CONTEXT.md](./CONTEXT.md).

## Stack

- **Backend:** Node.js, TypeScript, Express, PostgreSQL
- **Frontend:** React (Vite), local only
- **Ingest:** Greenhouse, Lever, Ashby, Simplify (+ SmartRecruiters boards in config)
- **Ranking:** OpenAI API (`gpt-4o-mini` by default; batch + live)

## Quickstart

**Prerequisites:** Node 20+, PostgreSQL, and (for ranking) an OpenAI API key.

```bash
git clone https://github.com/emilyyteng/career-digest.git
cd career-digest && npm install
cp .env.example .env && cp config/rank-profile.example.md config/rank-profile.md
# Create DBs, set DATABASE_URL + TEST_DATABASE_URL, then:
npm run migrate && npm run dev:api & npm run dev:web
```

Full cold-clone steps (Postgres.app vs Docker, UI-only vs digest pipeline, verification checklist): **[docs/SETUP.md](./docs/SETUP.md)**.

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Home |
| `/jobs` | Ranked digest board |
| `/applications` | Application tracker |
| `/tasks` | Action backlog |
| `/interviews` | Interview pipelines |
| `/progress` | Today log, heatmaps, history |
| `/status` | Pipeline / ops dashboard |

## Commands

| Command | Purpose |
|---------|---------|
| `npm run migrate` | Apply SQL migrations |
| `npm run ingest` | Pull ATS boards + Simplify listings |
| `npm run scrape` | Fill blank Simplify descriptions |
| `npm run rank` | Rank via OpenAI Batch API |
| `npm run rank:live` | Rank synchronously (rate-limited) |
| `npm run board-refresh` | Ingest + scrape + light live rank |
| `npm run test` | API unit + integration tests |
| `npm run backup` / `npm run restore` | Logical DB backup to `backups/` (stop dev servers before restore) |
| `npm run discover-boards` | Diff Simplify ATS URLs vs `companies.ts` |
| `npm run merge-postings` | Collapse duplicate postings across sources |

Cron helpers (`npm run cron:install`, `cron:install-backup`) target macOS launchd.

## Testing

Integration and unit tests both require `TEST_DATABASE_URL` pointing at a **separate** `*_test` database — never `career_digest`. GitHub Actions runs the full API suite on every push to `main`.

```bash
export TEST_DATABASE_URL=postgres://YOUR_USER@localhost:5432/career_digest_test
npm run test
```

## Docs

- [docs/SETUP.md](./docs/SETUP.md) — cold-clone setup and verification checklist
- [CONTEXT.md](./CONTEXT.md) — domain glossary (Task, Needs attention, Activity, …)
- [docs/CHANGELOG.md](./docs/CHANGELOG.md) — milestone development history
- [docs/specs/](./docs/specs/) — feature specs

## License

[MIT](./LICENSE)
