# flora.exe

A personal hub for life and career management — job search, prep, and day-to-day follow-through in one local app. Pull and rank internship boards when you need them, keep applications and interviews moving, organize tasks across work and personal life, and stay honest with weekly goals, progress, and small rewards.

Development history can be found in the [changelog](./docs/CHANGELOG.md).

## What it does

| Area             | What you get                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| **Home**         | Today and weekly progress, upcoming deadlines and targets, digest status, new and top job picks |
| **Jobs**         | Ranked digest board of relevant internship postings                                             |
| **Applications** | Application pipeline tracker (applied, interviewing, accepted, declined)                        |
| **Tasks**        | Unified action backlog — application, school, and personal tasks by category                    |
| **Interviews**   | Step-based pipelines with deadlines, scheduling, and workspace per application                  |
| **Progress**     | This week, Past work, and Lifetime: weekly goals, completions, heatmaps, achievements           |
| **Rewards**      | Cat Cake Collection gacha: banner pulls, album, earnings, pull history, and rules (seeds)       |
| **Status**       | Ops dashboard — ingest, scrape, rank, backup health, and board departures                       |

## Stack

- **Backend:** Node.js, TypeScript, Express, PostgreSQL
- **Frontend:** React (Vite), local only
- **Ingest:** Greenhouse, Lever, Ashby, Simplify (+ SmartRecruiters boards in config)
- **Ranking:** OpenAI API (`gpt-4o-mini` by default; batch + live)

## Quickstart

**Prerequisites:** Node 20+, PostgreSQL, and (for ranking) an OpenAI API key.

```bash
git clone https://github.com/emilyyteng/flora-exe.git
cd flora-exe && npm install
cp .env.example .env && cp config/rank-profile.example.md config/rank-profile.md
# Create DBs, set DATABASE_URL + TEST_DATABASE_URL, then:
npm run migrate && npm run dev:api & npm run dev:web
```

Full cold-clone steps (Postgres.app vs Docker, UI-only vs digest pipeline, verification checklist): **[docs/SETUP.md](./docs/SETUP.md)**.

## Routes

| Route           | Purpose                      |
| --------------- | ---------------------------- |
| `/`             | Home                         |
| `/jobs`         | Ranked digest board          |
| `/applications` | Application tracker          |
| `/tasks`        | Action backlog               |
| `/interviews`   | Interview pipelines          |
| `/progress`     | This week (default); Past work; Lifetime |
| `/rewards`      | Cat Cake banner (default); Collection, Earnings, Pull history, Rules |
| `/status`       | Pipeline / ops dashboard; board departures log |

## Commands

| Command                              | Purpose                                                           |
| ------------------------------------ | ----------------------------------------------------------------- |
| `npm run migrate`                    | Apply new SQL migrations (each file runs once)                    |
| `npm run ingest`                     | Pull ATS boards + Simplify listings                               |
| `npm run scrape`                     | Fill blank Simplify descriptions                                  |
| `npm run rank`                       | Rank via OpenAI Batch API                                         |
| `npm run rank:live`                  | Rank synchronously (rate-limited)                                 |
| `npm run board-refresh`              | Discover boards + ingest + scrape + light live rank               |
| `npm run build`                      | Build the web UI for production                                   |
| `npm start`                          | Serve API + built UI on `PORT` (default 3000)                     |
| `npm run test`                       | API unit + integration tests                                      |
| `npm run typecheck`                  | Typecheck the API                                                 |
| `npm run check`                      | UI variant check, typecheck, build, then test; stops at first failure |
| `npm run backup` / `npm run restore` | Logical DB backup to `backups/` (stop dev servers before restore) |
| `npm run discover-boards`            | Diff Simplify ATS URLs vs `tracked_boards` (`--write` to upsert)  |
| `npm run merge-postings`             | Collapse duplicate postings across sources                        |

Cron helpers (`npm run cron:install`, `cron:install-backup`) target macOS launchd.

## Testing

Integration and unit tests both require `TEST_DATABASE_URL` pointing at a **separate** `*_test` database — never the main app database. GitHub Actions runs `npm run check` on every push to `main` and on pull requests.

```bash
export TEST_DATABASE_URL=postgres://YOUR_USER@localhost:5432/career_digest_test
npm run test
```

(Postgres database names still use the legacy `career_digest` / `career_digest_test` identifiers.)

Before committing, run `npm run check` (UI check, typecheck, build, tests).

## Docs

- [docs/SETUP.md](./docs/SETUP.md) — cold-clone setup and verification checklist
- [docs/CHANGELOG.md](./docs/CHANGELOG.md) — milestone development history
- [docs/features/README.md](./docs/features/README.md) — complete feature roadmap

## License

[MIT](./LICENSE)
