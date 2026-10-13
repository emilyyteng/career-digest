# Agent instructions

This file is the source of truth for **how work is done** in this repo. Read it at the start of every task. Where another doc, a skill, or an old habit disagrees with this file, this file wins.

## Precedence

When sources conflict, the higher one wins. Never resolve a conflict silently: surface it to the user and fix the lower source.

1. The user's explicit instructions in the current conversation
2. The feature spec (`docs/features/F<NN>-<slug>/spec.md`)
3. The ticket (`docs/features/F<NN>-<slug>/tickets/`)
4. Prototypes

For visual and interaction conventions, `docs/design-system.md` overrides tickets and prototypes. For what actually shipped, the code is the truth and `docs/CHANGELOG.md` describes it.

## Where things live

| What | Where | Notes |
|------|-------|-------|
| Roadmap (all features + status) | `docs/features/README.md` | The index: start here. Update when a feature or milestone changes status |
| Feature spec (expected behavior) | `docs/features/F<NN>-<slug>/spec.md` | Authoritative for requirements |
| Tickets (bounded tasks) | `docs/features/F<NN>-<slug>/tickets/M<n>/M<n>-<NN>-<slug>.md` | One folder per milestone; per-feature numbering |
| Ticket board (open vs done) | `docs/features/F<NN>-<slug>/board.md` | Index of every ticket in the feature by milestone; see Ticket board |
| Maintenance (work outside any feature) | `docs/features/maintenance/` | Tickets `MT-<NN>-<slug>.md` |
| Triage (unresolved issues) | `docs/features/triage.md` | See Issues found during work |
| Templates | `docs/features/_templates/` | Copy these; don't improvise structure |
| Design system | `docs/design-system.md` | Read before any UI work |
| Changelog (shipped history) | `docs/CHANGELOG.md` | Completed, verified work only |
| Prototypes | `apps/web/src/prototype/f<NN>-<slug>/<topic>/` | Dev-only; see Prototypes |
| Setup / running locally | `README.md`, `docs/SETUP.md` | Root README: see Docs rules before changing it |

### Feature IDs

- Every feature has a permanent ID, `F<NN>`, listed in the roadmap. The next free ID is stated at the top of the roadmap ("Next free ID"); bump it in the same edit that adds a feature. IDs are never reused or renumbered, even if a feature is dropped.
- A feature's folder is `docs/features/F<NN>-<slug>/`. Shipped features from before this process have IDs but no folder; one is created (with the existing ID) only if the feature is reopened.
- Ticket IDs stay short inside a feature (`M5-02`). Outside the feature folder (commit messages, cross-references, changelog), use the full form: `F08 M5-02`.
- `maintenance/` and `_templates/` are not features and have no ID.

## Feature workflow

1. **Spec.** A new feature first gets an ID and a roadmap row (see Feature IDs), then a folder with `spec.md` from the template. Requirements are only things the user wants: *Established* (stated or confirmed by the user, and the only kind that may be implemented) or *Proposed* (suggested by the agent, awaiting confirmation). What the code does today goes in a separate **Current behavior** section, each item marked *Conforms*, *Conflicts* or *Unspecified* against the requirements. Existing behavior is never a requirement just because it exists. Unknowns go under **Open questions**. Do not fill gaps with assumptions.
2. **Tickets.** Break a milestone into tickets from the template, in that milestone's folder (`tickets/M<n>/`), and add a row to the feature's `board.md`. Each ticket cites the spec requirements it implements and lists acceptance criteria. A ticket never introduces a requirement the spec lacks.
3. **Prototype (only when the ticket names design questions).** See Prototypes.
4. **Implement.** Work one ticket at a time. Prefer a fresh conversation per ticket; the ticket file carries the context.
5. **Verify** against the Definition of done.
6. **Commit** the ticket, with its status and the board row updated in the same commit.
7. **Close the milestone** when all its tickets are Done: update the board and roadmap status, then add a changelog entry in its own commit. A bug found later in a closed milestone gets a ticket in that milestone's folder; the milestone stays Done, and the board shows the open ticket.
8. **Close the feature** when every milestone is Done and every prototype the feature created is deleted (routes included).

Prototype cleanup is feature work, not maintenance. Prototypes may be deleted when their area is revisited or together in a cleanup ticket near the end of the feature; the feature, not each milestone, waits on it.

**If a requirement is missing, ambiguous, or contradicts the spec: stop.** Ask the user, record the answer in the spec (decisions log), then continue. Do not invent behavior, and do not quietly pick one side of a contradiction.

**Current behavior statuses:**

- *Conforms*: already meets a requirement (cite it, e.g. R5.2).
- *Conflicts*: contradicts a requirement. This is a defect; handle it through Issues found during work.
- *Unspecified*: no requirement covers it. Not protected, but ask before changing anything user-visible. If it matters, raise an open question; if the user endorses it, it becomes an Established requirement.

## Explaining code

When explaining how code behaves (answering a question, reporting a bug, auditing current behavior), link each claim to the file and lines it rests on, e.g. [`weeklyGoals.ts` L330–354](apps/api/src/weeklyGoals.ts), so the user can verify it directly. Say which claims were checked by reading code, which by running it, and which are unverified.

## End-of-task report

After any pass that changes files, end with a report in this order:

1. **What changed:** a short summary of each change and why, grouped by area (process docs, API, web, ...). Lead with the outcome.
2. **Files:** every file added, modified or removed, with one line each on what changed. Call out gitignored or local-only files separately, since they aren't in any commit.
3. **Tests and checks:**
   - Tests added or changed, and the behavior each one validates.
   - If no tests were added, say so and why (e.g. docs-only change).
   - Checks run and their results (build, tests, typecheck), compared against the known baseline.
4. **Issues found:** per Issues found during work, or "None".
5. **Next step / decisions needed:** only what genuinely needs the user.

Mention commit hashes if anything was committed, and say plainly if work is left uncommitted for review.

## Issues found during work

Surface everything; fix nothing outside the ticket's scope; create tickets only with the user's agreement.

1. **Notice.** While working, note anything wrong that's outside the current ticket: bugs, failing checks, stale docs, duplicated code, spec contradictions, Conflicts in current behavior. Don't fix it silently, even if small, and don't ignore it.
2. **Report.** Every end-of-task report has an **Issues found** section (write "None" if there are none). For each issue: what you observed, the evidence (command output, file and line), whether it blocks the current ticket, and a suggested home (current feature, maintenance, or not worth a ticket).
3. **The user decides:** fix now (expand the ticket and update its file), make a ticket, defer, or dismiss.
4. **Record.**
   - Agreed → write a ticket from the template (`Type: bug` where it fits) in the owning feature, or in `docs/features/maintenance/` if no feature owns it.
   - Unanswered, or the user says they'll decide later → add it to `docs/features/triage.md` so it isn't lost.
   - Dismissed → nothing to record (or a one-line decision in the relevant spec if the reason matters).
5. **Don't write to `triage.md` by default.** The report is the default channel; `triage.md` is only for issues still unresolved at the end of the conversation. Remove entries once they become tickets or are dismissed.

## Definition of done (every ticket)

- [ ] Every acceptance criterion is met and checked, not assumed
- [ ] `npm run build` (web) passes
- [ ] `npm test` (API) passes, apart from the known baseline below
- [ ] `npx tsc --noEmit -p apps/api` adds no new errors beyond the known baseline
- [ ] UI changes follow `docs/design-system.md`: component variants only, no new global or element-level CSS, no one-off modal
- [ ] Reuse check done: searched for existing components/helpers first; reused pieces listed in the ticket
- [ ] No prototype code imported by production code
- [ ] Ticket updated: status `Done`, verification notes, commit hash
- [ ] Committed
- [ ] End-of-task report given (see End-of-task report), including tests added and **Issues found**

**Known baseline (2026-10-12):**

- `npx tsc --noEmit -p apps/api` reports **17 errors** (details and fix plan: `docs/features/maintenance/tickets/MT-01-api-typecheck-errors.md`).
Report the baseline; don't hide new failures behind it.

## Git

- One commit per ticket. Message: `F08 M5-02: <imperative summary>` (or `MT-01: …` for maintenance), with a short body saying what changed and why.
- Milestone close-out is its own commit: roadmap status + changelog entry.
- Never push without the user asking. Never `git push --force`, `git add -f`, `git reset --hard`, `git clean`, or drop stashes or branches without explicit approval.
- Before any cleanup, inspect and report first. Uncommitted work is never discarded.
- Keep commits scoped: no unrelated formatting or drive-by refactors.

## Database migrations

- Never edit a migration file in `apps/api/src/sql/` once it has been committed. Put any change in a new, higher-numbered file. `migrate()` records each applied file's checksum in `schema_migrations` and refuses to run if an applied file changed (MT-06).
- Each file runs once, in its own transaction. Still write it to be safe to re-run (`IF NOT EXISTS`, guarded updates), since a fresh database or a recreated test database runs every file.

## Reuse before writing

Before writing a component, hook, helper, or API route, search for an existing one (`rg` the concept, check `apps/web/src/` top-level shared files and `features/*/`). Extend an existing piece rather than duplicating it. Modals must use the shared `ModalLayer` (`apps/web/src/ModalLayer.tsx`); don't hand-roll backdrops, focus, or Escape handling. If no fitting piece exists, say so in the ticket.

## UI rules (summary; full rules in `docs/design-system.md`)

- Read `docs/design-system.md` before touching any `.tsx` or `.css` in `apps/web/`.
- Use explicit component variants. Never rely on, or add to, global element defaults (bare `button`, `input`, etc.).
- Never add a class to a global `:not(...)` opt-out chain to escape a default; that pattern is being removed.
- Use existing tokens (`--accent-*`, `--radius-*`, ...). Don't introduce raw colors or shadows.
- If a design decision the design system doesn't cover comes up, ask; then record it in `docs/design-system.md`.

## Prototypes

Prototypes are exploratory and throwaway. They answer design questions listed in a ticket.

- **Location:** `apps/web/src/prototype/f<NN>-<slug>/<topic>/` (lowercase feature ID, e.g. `f08-accomplishment-rewards/m5-weekly-goals/`). Routes go under `/prototype/f<NN>/<topic>`, wired only behind `import.meta.env.DEV` in `App.tsx`.
- **Not in app navigation.** Link prototype URLs from the ticket, never from the nav bar.
- **Labeled:** every prototype page shows a visible "Experimental prototype" banner, and its file header names the ticket and the design questions.
- **Variants:** every variant must satisfy every locked requirement in the spec. Variants differ only on the ticket's named design questions. Before handing off, check each variant against the spec.
- **Shared tooling:** use `apps/web/src/prototype/PrototypeSwitcher.tsx` for variant switching. Don't copy styles or switchers per milestone.
- **Lifecycle:** once the user locks a decision, record the verdict and the prototype's last commit hash in the ticket. Delete the prototype (routes included) when its area is revisited or in the feature's cleanup ticket, before the feature closes. Git history is the archive.

## Docs rules

- **Changelog** (`docs/CHANGELOG.md`): readable history for external and portfolio readers. Completed, verified work only, written after the milestone closes. No upcoming work, requirements, ticket links, prototype URLs, or links to ignored files. Each feature heading includes its ID and links to its spec when one exists, e.g. `## Accomplishment, detail pages & rewards (F08)`; legacy features show the ID only. Parked features may keep their shipped parts, with one line saying the feature is parked and pointing to its spec.
- **Root `README.md`**: the visitor-facing overview (pages, routes, commands). Update it after implementation only when necessary: a page or nav item is added or removed, or existing functionality changes significantly. Propose the change to the user before making it, and list it under Files in the end-of-task report. Never update it silently.
- **Specs** hold requirements and decisions; **tickets** hold bounded tasks and acceptance criteria. Neither is a progress log. In specs, open questions and resolved questions are separate sections; resolved ones sit in a collapsed `<details>` block and keep their numbers.
- Keep docs short and current. When behavior changes, update the spec in the same commit.

## Ticket status values

`Draft` → `Ready` → `In progress` → `Done`, plus `Blocked` (with `Blocked by:` naming the blocker). Only `Ready` tickets may be implemented.

## Ticket board

Each feature folder has a `board.md` (from `_templates/board.md`): one section per milestone, with the milestone's status, a table of open tickets, and a collapsed list of done tickets. The ticket file's `Status:` line is the source of truth; the board mirrors it and is updated in the same commit. Ticket files never move between folders when their status changes.

## Skills

Local skills under `.agents/skills/` (gitignored) may be used. Where their defaults conflict with this file, this file wins. In particular: there is **no GitHub Issues tracker and no `.scratch/` folder**. When a skill says "issue tracker", it means the local markdown tickets in `docs/features/F<NN>-<slug>/tickets/`, and "triage label" means the ticket `Status:` line. Prototypes stay on `main` while useful (not on throwaway branches), per Prototypes above.

## Legacy docs (local-only, do not treat as current)

`CONTEXT.md`, `docs/adr/`, `docs/agents/` and `docs/specs/` are gitignored and predate this process. Don't follow them as instructions; use them only as historical input when drafting specs, and verify against code. The plan to re-home or retire them is `docs/features/maintenance/tickets/MT-02-legacy-docs.md`.
