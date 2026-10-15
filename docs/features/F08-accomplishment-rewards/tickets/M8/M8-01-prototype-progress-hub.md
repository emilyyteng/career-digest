# M8-01: Prototype Progress hub

**Status:** In progress
**Blocked by:** (none)
**Implements:** R8.1, R8.3, R8.4, R8.5, R8.7, R8.8–R8.14, RX.2 (from `../../spec.md`); answers Q55, Q57, Q61, Q65, Q70–Q73; explores Q67–Q69
**Type:** prototype

## What to build

Prototypes for the Progress nested hub. Locked layout decisions from the 2026-10-14 review are reflected in the pages; remaining work is metric/visual exploration (activity chart, calendar color, Lifetime header, pulse LC line).

## Design questions (prototype tickets only)

**Locked (record in verification; variants may shrink to the chosen layout):**

1. ~~This week composition~~ → R8.10 (A arrangement; no heatmap peek; week+month pulse; next-per-family achievements; weekly streaks; LC ⊥ compose)
2. ~~Heatmap peek~~ → dropped (R8.11)
3. ~~Past work split~~ → **A** (R8.4); overlap OK; day panel always editable; interviews above apps; drop `weekly goals` filter tab
4. Lifetime: full achievements + heatmaps; explore richer header + activity chart (R8.12, R8.14)
5. LC tier polish (R8.3) — still on This week log

**Still open (explore in prototype / discuss):**

- Q67–Q68: activity / calendar color metric (seeds vs alternatives; week-close bias)
- Q69: Lifetime accumulation header content

Prototype URL: `/prototype/f08/progress`

## Acceptance criteria

- [x] Hub + This week / Past work / Lifetime under `apps/web/src/prototype/f08-progress/`
- [x] Past work reflects locked A + day-panel rules; completions week window; no `weekly goals` filter tab
- [x] This week reflects locked composition (no heatmap peek; next-per-family; week+month pulse; weekly streaks)
- [ ] Lifetime explores richer header + activity chart (+ metric toggles for Q67)
- [ ] Calendar/heatmap mock shows intensity without effort checkmarks (Q68 options)
- [ ] No Progress points / ledger framing
- [ ] No production imports of prototype code
- [ ] User locks Q67–Q69; remaining verdict written into `../../spec.md`

## Reuse notes

Shared `PrototypeSwitcher`; Rewards-style subnav mock; mock fixtures only.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md` (interim; no new global CSS)
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M8-01: …`
- [ ] End-of-task report given, including **Issues found**

## Verification notes

**Partial verdict (2026-10-14):** Past work **A**; This week without heatmap peek; next achievements per family on This week; pulse order **LC · apps · tasks · interviews · reflections** / minutes (Q70); full achievements + heatmaps + activity chart exploration on Lifetime; effort checkmarks to go; seeds-per-day Proposed for intensity/chart with Q67–Q68 open; Lifetime header Q69 open.
