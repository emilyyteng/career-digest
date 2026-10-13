# Spec: Portfolio demo (F06)

**ID:** F06
**Status:** Parked
**Last updated:** 2026-10-13

## Problem

Sharing the project publicly needs a safe sandbox: visitors should be able to click around a realistic app without seeing the operator's real data or triggering paid API calls.

## Goals

- A hosted, writable demo filled only with fictional data, reset on a schedule.
- No path for visitors to trigger expensive ranking or board-refresh work.

## Why parked

The hosting path was started, then paused. Resume only if a public demo deploy is prioritized again.

## Milestones

| Milestone | Scope | Status |
|-----------|-------|--------|
| M0 | Demo mode inside the app (seed, reset, gating, banner) | Built, never shipped |
| M1 | Public hosting / deploy | Parked |

## Requirements

### M0: Demo mode (built, never shipped)

- **R0.1** (Proposed, from the legacy glossary; confirm when resuming) Seed data uses invented company and role names, never real employers, and never the operator's real applications, progress, rank profile, feedback, tasks, interviews or documents.

### M1: Hosting

Not specified. To be written if this feature is resumed.

## Current behavior

| Behavior | Where | Status | Notes |
|----------|-------|--------|-------|
| Setting `DEMO_MODE` wipes the database and seeds fictional data on boot | `apps/api/src/demoScheduler.ts`, `demoSeed.ts` | Unspecified | |
| Demo resets daily at a configurable UTC time (`DEMO_RESET_HOUR_UTC`, `DEMO_RESET_MINUTE_UTC`) | `apps/api/src/demoScheduler.ts` | Unspecified | |
| Live ranking and board refresh return 403 in demo mode | `DemoGatedError` in `apps/api/src/demoMode.ts` | Unspecified | |
| Demo banner shows the daily reset time | `DemoBanner` in `apps/web/src/App.tsx`, data from `demoMode.tsx` | Unspecified | |

## Out of scope

- A private single-operator hosted deployment of the real app (deferred separately; see Open questions).
- Multi-user accounts.

## Open questions

| # | Question | Blocks | Answer |
|---|----------|--------|--------|
| Q1 | Where would the demo be hosted, and what cost ceiling is acceptable? | M1 | (open) |
| Q2 | Is a private hosted deployment of the real app still wanted, and does it come before or after the public demo? | M1 | (open) |
| Q3 | Should the demo seed cover features shipped since? It currently seeds no linked reflections and no points events. | M1 | (open) |
| Q4 | Confirm R0.1 (fictional-only seed data), then check `demoSeed.ts` against it. | R0.1 | (open) |

## Decisions log

- **(date unknown):** Local agent docs, glossary, ADRs and specs were gitignored to keep the public repo quiet ("docs hygiene").
- **2026-10-12:** Partly reversed. `AGENTS.md`, `.cursor/rules/` and `docs/features/` are now tracked so the development process is version-controlled. Older local docs stay ignored as legacy until re-homed.
- **2026-10-13:** Documentation work moved out of this feature into F10 (Documentation & development process). F06 is only the hosted demo. Demo mode code exists in the app but was never shipped.
