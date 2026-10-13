# Spec: Maintenance

**Status:** Active
**Last updated:** 2026-10-12

Standing home for agreed work that no feature owns: tooling, type health, docs upkeep, cleanup. Tickets are numbered `MT-<NN>` and only created after the user agrees an issue is worth fixing (see `AGENTS.md` → Issues found during work). Maintenance is scheduled outside feature work unless the user says otherwise.

## Tickets

| Ticket | Summary | Status |
|--------|---------|--------|
| [MT-01](./tickets/MT-01-api-typecheck-errors.md) | Fix all 17 API typecheck errors and add a typecheck command so they can't build up again | Ready |
| [MT-02](./tickets/MT-02-legacy-docs.md) | Re-home or retire legacy local docs | Draft (deferred until after feature work) |
| [MT-03](./tickets/MT-03-flaky-api-tests.md) | Make API integration tests deterministic | Ready |
| [MT-04](./tickets/MT-04-shared-queryable-type.md) | Share one `Queryable` type instead of 11 private copies | Ready (after MT-01) |

## Out of scope

- Prototype cleanup. It belongs to the feature that created the prototypes (see `AGENTS.md` → Feature workflow).

## Decisions log

- **2026-10-12:** All 17 typecheck errors go in one ticket (MT-01), handled outside feature work, with their differing causes noted. Guarding against regressions (a typecheck command) is part of MT-01.
- **2026-10-12:** Legacy docs cleanup is lower priority than getting back to feature work.
- **2026-10-12:** Prototype cleanup is feature work, not maintenance.
