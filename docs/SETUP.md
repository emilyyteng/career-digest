# Setup

Cold-clone checklist for Career Digest. The README summarizes routes and commands; this doc is the full setup path.

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js 20+** | Matches GitHub Actions (`node-version: 22`) |
| **PostgreSQL 16** | Postgres.app (macOS) or Docker Compose (any OS) |
| **OpenAI API key** | Required only for ranking / board light-rank — not for UI-only dev |
| **npm** | Monorepo workspaces (`apps/api`, `apps/web`) |

## 1. Clone and install

```bash
git clone https://github.com/emilyyteng/career-digest.git
cd career-digest
npm install
```

## 2. Environment

```bash
cp .env.example .env
cp config/rank-profile.example.md config/rank-profile.md
```

Edit `.env`:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Main Postgres database |
| `TEST_DATABASE_URL` | For tests | Separate `*_test` DB — **never** point at `career_digest` |
| `OPENAI_API_KEY` | For ranking | Batch/live rank and board refresh light-rank |
| `DIGEST_GREETING_NAME` | No | Home greeting name (omit for generic “Good morning”) |
| `RANK_PROFILE_PATH` | No | Override path to rank system prompt (default: `config/rank-profile.md`) |

Edit `config/rank-profile.md` with your background and internship preferences before running rank.

## 3. Database

### Option A — Postgres.app (macOS)

```bash
createdb career_digest
createdb career_digest_test
```

`.env` example:

```env
DATABASE_URL=postgres://YOUR_USER@localhost:5432/career_digest
TEST_DATABASE_URL=postgres://YOUR_USER@localhost:5432/career_digest_test
```

### Option B — Docker Compose

```bash
docker compose up -d db
```

`.env` example:

```env
DATABASE_URL=postgres://career_digest:career_digest@localhost:5432/career_digest
TEST_DATABASE_URL=postgres://career_digest:career_digest@localhost:5432/career_digest_test
```

Create the test database once (main DB is created by compose):

```bash
docker compose exec db psql -U career_digest -c "CREATE DATABASE career_digest_test;"
```

## 4. Apply migrations

```bash
npm run migrate
```

## Path A — UI-only (empty database)

Use this to verify the app boots on a fresh clone without ingest or OpenAI.

```bash
npm run dev:api    # http://localhost:3000
npm run dev:web    # http://localhost:5173
```

**Expected:**

| Check | URL / action | Result |
|-------|----------------|--------|
| API health | `GET http://localhost:3000/health` | `{ "ok": true }` |
| Home loads | http://localhost:5173/ | Greeting, empty job picks, progress strip |
| Jobs empty | http://localhost:5173/jobs | Empty ranked tab |
| Status page | http://localhost:5173/status | Ops dashboard (no digest run yet) |

Manual tasks, applications, and progress logging work without ingest. Jobs board stays empty until Path B.

## Path B — Full digest pipeline

Requires `OPENAI_API_KEY` and a customized `config/rank-profile.md`.

```bash
npm run ingest       # pull ATS boards + Simplify (see companies config)
npm run scrape       # fill blank Simplify descriptions
npm run rank         # OpenAI batch rank (or: npm run rank:live)
```

Or one-shot refresh (ingest + scrape + capped live rank):

```bash
npm run board-refresh
```

**Expected after ingest:**

- `GET http://localhost:3000/api/jobs` returns postings (may be unranked until rank finishes)
- Jobs UI shows tabs: ranked, mismatches, unranked, needs description
- Status page shows last board refresh metadata

**Company list:** `apps/api/src/config/companies.ts` — edit before ingest to match boards you want.

## Tests

Vitest loads config that requires `TEST_DATABASE_URL` for the **entire** suite (unit + integration).

```bash
export TEST_DATABASE_URL=postgres://YOUR_USER@localhost:5432/career_digest_test
npm run migrate   # applies to DATABASE_URL; ensure test DB exists
npm run test
```

CI runs the same on every push to `main` (see `.github/workflows/test.yml`).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Rank fails immediately | Copy and edit `config/rank-profile.md`; check `OPENAI_API_KEY` |
| `npm run test` exits before tests | Set `TEST_DATABASE_URL` to a separate `*_test` database |
| Port 5432 in use | Stop other Postgres instances or change compose port mapping |
| Restore fails | Stop `dev:api` and any cron jobs writing to the DB first |
| Home shows no name | Set `DIGEST_GREETING_NAME` in `.env` (optional) |

## Local-only data

These paths are gitignored and created at runtime:

| Path | Purpose |
|------|---------|
| `config/rank-profile.md` | Private rank prompt (PII) |
| `data/` | Uploads, rank batch state, cron logs — see `data/README.md` |
| `backups/` | `pg_dump` output from `npm run backup` |
| `.agents/` | Local Cursor agent skills |
| `scripts/spike-*.py`, `scripts/ats-survey.py` | Local ATS research spikes |
| `docs/specs/tickets/` | Local implementation tickets |

## Related docs

- [README.md](../README.md) — overview, routes, command table
- [CONTEXT.md](../CONTEXT.md) — domain glossary
- [docs/specs/README.md](./specs/README.md) — which specs are tracked vs local-only
