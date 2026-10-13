# Spec: Maintenance

**Status:** Active
**Last updated:** 2026-10-13

Standing home for agreed work that no feature owns: tooling, type health, docs upkeep, cleanup. Tickets are numbered `MT-<NN>` and only created after the user agrees an issue is worth fixing (see `AGENTS.md` → Issues found during work). Maintenance is scheduled outside feature work unless the user says otherwise.

## Tickets

On the [board](./board.md), with open tickets separate from done ones.

## Out of scope

- Prototype cleanup. It belongs to the feature that created the prototypes (see `AGENTS.md` → Feature workflow).

## Decisions log

- **2026-10-12:** All 17 typecheck errors go in one ticket (MT-01), handled outside feature work, with their differing causes noted. Guarding against regressions (a typecheck command) is part of MT-01.
- **2026-10-12:** Legacy docs cleanup is lower priority than getting back to feature work.
- **2026-10-12:** Prototype cleanup is feature work, not maintenance.
- **2026-10-13:** Un-applying or deleting applications is tracked as a spike (MT-05) so it isn't forgotten. F08 keeps it out of scope.
- **2026-10-13:** Migrations get a tracking table so each runs once (MT-06, priority). The test database is recreated; the dev `postings` rebuild waits (MT-07). The flaky 404s stay in MT-03, after MT-06.
- **2026-10-13:** MT-03 and MT-01 are resolved before M5 tickets continue. Typechecking the API tests (MT-08) and running `npm run check` in CI (MT-09) are done in the same pass. The `npm audit` warnings get a ticket to review later (MT-10). Tickets move to a `board.md`, like feature folders.
