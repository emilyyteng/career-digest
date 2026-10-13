# Roadmap

The index of every feature: start here. Process and conventions: [`AGENTS.md`](../../AGENTS.md). Shipped history: [`CHANGELOG.md`](../CHANGELOG.md).

Each feature has a permanent ID (`F<NN>`) and, once it has a spec, a folder `F<NN>-<slug>/`. Next free ID: **F11**.

## Active

| ID | Feature | Summary | Spec |
|----|---------|---------|------|
| F08 | Accomplishment, detail pages & rewards | Task/application detail pages, reflections on real work, points ledger, weekly goals, celebration, Cat Cake Collection v1, recurring tasks. M0, M1, M2, M4 shipped; M5, M7, M8 (Progress redesign), M3, M6 remaining, in that order | [spec](./F08-accomplishment-rewards/spec.md) (draft) · [board](./F08-accomplishment-rewards/board.md) |

## Planned

| ID | Feature | Summary | Spec |
|----|---------|---------|------|
| F09 | Design system migration | Explicit component variants and one visual standard, scoped first to what F08 M5 needs | [spec](./F09-design-system-migration/spec.md) |

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

IDs F01–F09 were assigned on 2026-10-12 in order of each feature's first appearance in the changelog. F10 was added on 2026-10-13 for the documentation work previously grouped under F06.

## Not features

| Area | Summary | Spec |
|------|---------|------|
| Maintenance | Agreed work no feature owns (type health, docs upkeep, cleanup). Tickets `MT-<NN>` | [spec](./maintenance/spec.md) · [board](./maintenance/board.md) |
| Triage | Surfaced issues still waiting on a decision | [triage.md](./triage.md) |

## Numbering

Milestones are numbered per feature from M0. Tickets are `M<milestone>-<NN>` inside a feature (e.g. `M5-02`) and `F08 M5-02` when referenced from outside it. The changelog was renumbered per feature on 2026-10-12.
