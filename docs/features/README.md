# Roadmap

The index of every feature: start here. Process and conventions: [`AGENTS.md`](../../AGENTS.md). Shipped history: [`CHANGELOG.md`](../CHANGELOG.md).

Each feature has a permanent ID (`F<NN>`) and, once it has a spec, a folder `F<NN>-<slug>/`. Next free ID: **F12**.

## Active

| ID | Feature | Summary | Spec |
|----|---------|---------|------|
| F08 | Accomplishment, detail pages & rewards | Task/application detail pages, reflections on real work, points ledger, weekly goals, celebration, Cat Cake Collection v1 (seeds), Progress redesign, board departures log, recurring tasks. M0–M2, M4–M8 shipped; then M3 | [spec](./F08-accomplishment-rewards/spec.md) · [board](./F08-accomplishment-rewards/board.md) |
| F09 | Design system migration | Comprehensive visual system + phased migration: M0–M1 Done (Ink desk foundations, primitives, patterns, Home pilot, `check:ui`); next M2 core surface waves | [spec](./F09-design-system-migration/spec.md) · [board](./F09-design-system-migration/board.md) |
| F11 | Custom habits & weekly targets | Multi-habit daily tracker + custom weekly targets (3 custom / 5 total with apps+LC each); This week habits hub. M0 prototypes | [spec](./F11-habits-and-weekly-targets/spec.md) · [board](./F11-habits-and-weekly-targets/board.md) |

## Planned

None right now.

## Parked

| ID | Feature | Summary | Spec |
|----|---------|---------|------|
| F06 | Portfolio demo | Hosted demo sandbox. Demo mode was built but never shipped; paused | [spec](./F06-portfolio-demo/spec.md) |

## Shipped

| ID | Feature | Summary | Spec |
|----|---------|---------|------|
| F01 | Job board ingest & ranking | Ingest ATS boards, scrape descriptions, rank with OpenAI, tracked boards | Legacy |
| F02 | Applications tracker | Pipeline tracker for roles already applied to | Legacy |
| F03 | Interviews & ops shell | Interview threads, Home, Status dashboard | Legacy |
| F04 | Tasks backlog | One backlog for application and misc tasks; subtasks, priority, estimates | Legacy |
| F05 | Progress tracker | Activity / Effort / Outcome for application and technical prep | Legacy |
| F07 | Home: Upcoming & weekly goals | Upcoming deadlines vs targets, weekly LC and app goals | Legacy |
| F10 | Documentation & development process | Public-facing repo docs; `AGENTS.md`, specs, tickets, triage, rewritten changelog | None: the process itself lives in [`AGENTS.md`](../../AGENTS.md) |

"Legacy" means the feature shipped before this process: its requirements live only in older local docs and the changelog. It gets a folder (keeping its ID) only if reopened.

IDs F01–F09 were assigned on 2026-10-12 in order of each feature's first appearance in the changelog. F10 was added on 2026-10-13 for the documentation work previously grouped under F06. F11 was added on 2026-10-15 for custom daily habits and custom weekly targets.

## Not features

| Area | Summary | Spec |
|------|---------|------|
| Maintenance | Agreed work no feature owns (type health, docs upkeep, cleanup). Tickets `MT-<NN>` | [spec](./maintenance/spec.md) · [board](./maintenance/board.md) |
| Triage | Surfaced issues still waiting on a decision | [triage.md](./triage.md) |

## Numbering

Milestones are numbered per feature from M0. Tickets are `M<milestone>-<NN>` inside a feature (e.g. `M5-02`) and `F08 M5-02` when referenced from outside it. The changelog was renumbered per feature on 2026-10-12.
