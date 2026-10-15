# M8-01: Prototype Progress hub

**Status:** In progress
**Blocked by:** (none)
**Implements:** R8.1, R8.3, R8.4, R8.5, R8.7, R8.8–R8.12, RX.2 (from `../../spec.md`); answers Q55, Q57
**Type:** prototype

## What to build

Prototypes, with mock data only, for the Progress nested hub. Every variant must satisfy locked requirements (Progress keeps its name; three surfaces; no points/ledger framing; achievements on Lifetime; kind filters on Past work; calendar as Past work selector).

**Past work is the main exploration** (2026-10-14): calendar-driven day panel + completions week window, and how to avoid duplicating apps/reflections across those two panels.

Use the shared `PrototypeSwitcher`. Place under `apps/web/src/prototype/f08-progress/`, routes `/prototype/f08/progress/...`, DEV-only in `App.tsx`.

## Design questions (prototype tickets only)

1. **This week composition:** streak strip, weekly goals, log work, week/month pulse, optional next-achievement teaser — first viewport without reading as a dashboard.
2. **Heatmap peek (R8.11):** collapsed vs rhythm strip vs short grid; **7 vs 14 days**; whether Lifetime still shows full heatmaps (Q57).
3. **Past work info split (R8.4, Q55):** calendar selects focus day; completions = **7 days ending on that day** + kind filters. Variants must disagree on how the day edit panel relates to the completions log (dual column vs completions-led vs unified day feed) so overlap can be judged in the browser.
4. **Lifetime:** layout of all-time totals + achievements (+ heatmaps if Q57 keeps them).
5. **LC tier polish (R8.3):** easy / medium / hard with tier and +20 / +30 / +50 visible without clutter.

Prototype URL: `/prototype/f08/progress`

## Acceptance criteria

- [ ] 2–3 variants per design question, switchable with the shared prototype switcher, under `apps/web/src/prototype/f08-progress/`
- [ ] Nested hub chrome visible (This week / Past work / Lifetime)
- [ ] Past work prototypes: calendar selection drives day panel + 7-day completions window; kind filters present; no standalone pagination control as the primary model
- [ ] No Progress points / ledger framing in any variant
- [ ] No production imports of prototype code; mock data only
- [ ] User picks a variant (or mix) per question; verdict recorded below; Q55 and Q57 written into `../../spec.md`

## Reuse notes

Reference only: `WeeklyGoalsBlock`, `TodayStrip`, `LeetcodeLogger`, `HistoryCalendar`, `LedgerCompletionsPanel`, `AchievementsPanel`, `ProgressHeatmap`, `RewardsLayout` subnav pattern. Shared `PrototypeSwitcher`.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md` (interim; no new global CSS)
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M8-01: …`
- [ ] End-of-task report given, including **Issues found**

## Verification notes

**Built (in progress, awaiting verdict):** hub at `/prototype/f08/progress` with `past-work`, `this-week`, `lifetime`. Past work variants A/B/C explore the calendar → day panel + 7-day completions window and the edit/completions overlap (Q55). `npm run check` green on the prototype commit. Verdict TBD after browser review.
