# Spec: <Feature name> (F<NN>)

**ID:** F<NN> (from `docs/features/README.md`; folder `docs/features/F<NN>-<slug>/`)
**Status:** Draft | Active | Planned | Parked | Shipped
**Last updated:** YYYY-MM-DD

## Problem

What the user is struggling with, from their perspective.

## Goals

- What success looks like for the user.

## Milestones

| Milestone | Scope | Status |
|-----------|-------|--------|
| M0 | … | Not started / In progress / Done |

## Requirements

Only things the user wants. Number them so tickets can cite them (e.g. `R5.3` = milestone 5, requirement 3). Tag each one:

- **Established**: stated or confirmed by the user. Only these may be implemented.
- **Proposed**: suggested by the agent, awaiting confirmation. Becomes Established or is deleted.

### M<n>: <milestone name>

- **R<n>.1** (Established) …
- **R<n>.2** (Proposed) …

## Behavior rules

Cross-cutting invariants that every milestone must respect (e.g. "weekly goals reset at the week boundary and never become overdue"). Same tags as requirements.

## Current behavior

What the code does today, verified in code (cite files). Never a requirement by itself. Mark each item against the requirements:

- **Conforms**: already meets a requirement (cite it).
- **Conflicts**: contradicts a requirement. A defect: surface it per `AGENTS.md` → Issues found during work, and link the ticket once agreed.
- **Unspecified**: no requirement covers it. Ask before changing it if user-visible; raise an open question if it matters.

| Behavior | Where | Status | Notes |
|----------|-------|--------|-------|
| … | `path/to/file.ts` | Conforms R<n>.x / Conflicts R<n>.x / Unspecified | |

## Out of scope

- …

## Open questions

Nothing that depends on an open question may be implemented.

| # | Question | Blocks | Answer |
|---|----------|--------|--------|
| Q1 | … | R<n>.x | (open) |

## Decisions log

Dated record of resolved questions and design choices, with the reason.

- **YYYY-MM-DD:** <decision> because <reason>.
