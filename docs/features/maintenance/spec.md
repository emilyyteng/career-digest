# Spec: Maintenance

**Status:** Active
**Last updated:** 2026-10-13

Standing home for agreed work that no feature owns: tooling, type health, docs upkeep, cleanup. Tickets are numbered `MT-<NN>` and only created after the user agrees an issue is worth fixing (see `AGENTS.md` → Issues found during work). Maintenance is scheduled outside feature work unless the user says otherwise.

## Tickets

| Ticket | Summary | Status |
|--------|---------|--------|
| [MT-01](./tickets/MT-01-api-typecheck-errors.md) | Fix all 17 API typecheck errors and add a typecheck command so they can't build up again | Ready |
| [MT-02](./tickets/MT-02-legacy-docs.md) | Re-home or retire legacy local docs | Draft (deferred until after feature work) |
| [MT-03](./tickets/MT-03-flaky-api-tests.md) | Make API integration tests deterministic | Done |
| [MT-04](./tickets/MT-04-shared-queryable-type.md) | Share one `Queryable` type instead of 11 private copies | Ready (after MT-01) |
| [MT-05](./tickets/MT-05-unapply-delete-application-spike.md) | Spike: should applications be un-appliable or deletable, and what happens to their points and links? | Draft (not scheduled) |
| [MT-06](./tickets/MT-06-migration-tracking.md) | Track applied migrations so each runs once | Done |
| [MT-07](./tickets/MT-07-reclaim-postings-columns.md) | Reclaim dropped-column slots on the dev `postings` table | Draft (not scheduled; after MT-06) |

## Out of scope

- Prototype cleanup. It belongs to the feature that created the prototypes (see `AGENTS.md` → Feature workflow).

## Decisions log

- **2026-10-12:** All 17 typecheck errors go in one ticket (MT-01), handled outside feature work, with their differing causes noted. Guarding against regressions (a typecheck command) is part of MT-01.
- **2026-10-12:** Legacy docs cleanup is lower priority than getting back to feature work.
- **2026-10-12:** Prototype cleanup is feature work, not maintenance.
- **2026-10-13:** Un-applying or deleting applications is tracked as a spike (MT-05) so it isn't forgotten. F08 keeps it out of scope.
- **2026-10-13:** Migrations get a tracking table so each runs once (MT-06, priority). The test database is recreated; the dev `postings` rebuild waits (MT-07). The flaky 404s stay in MT-03, after MT-06.
