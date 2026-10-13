# M5-07: Prototype streaks, achievements and the completion flourish

**Status:** Ready
**Blocked by:** (none)
**Implements:** R5.1, RX.2; designs for R5.2, R5.25–R5.27 (from `../../spec.md`)
**Type:** prototype

## What to build

Prototypes, with mock data only, for how streaks and achievements show up, what happens at an unlock, the today strip with streaks, and whether a completion flourish is worth keeping. Placement is provisional: M8 decides where things finally live (R8.5).

Every variant must satisfy all Established requirements, including:

- daily LC and apps streaks, with small daily points and milestone rewards (R5.25)
- count-based achievements for applications, LC and interview steps per kind (R5.26)
- the today strip on Home and Progress showing current streaks instead of `x/3` (R5.27)

Use the Q42 proposal numbers as mock values until they're confirmed.

## Design questions (prototype tickets only)

1. **Today strip with streaks (R5.27):** how the apps and LC streaks read at a glance, including "today not done yet"; what happens to the deep-work badges (Q47).
2. **Streak and achievement surface:** where they're seen before M8 (for example a block on Progress) and how locked, unlocked and next achievements look.
3. **Unlock moment:** how a streak milestone or achievement is announced (`EarnFlash`, the one-time notice, or something else).
4. **Completion flourish (Q7):** keep or drop; if kept, which events trigger it and whether it replaces `EarnFlash`.
5. **Weekly-goal streak display (if Q43 says yes):** where "3 weeks in a row" appears.

Prototype URL: `/prototype/f08/streaks`

## Acceptance criteria

- [ ] 2–3 variants per design question, switchable with the shared prototype switcher, under `apps/web/src/prototype/f08-streaks/`
- [ ] No production imports of prototype code; mock data only
- [ ] The user records a verdict per question, including a keep/drop on the flourish (Q7)

## Reuse notes

`TodayStrip`, `EarnFlash`, the one-time notice from M5-06, and the Progress page layout as it is today.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run build` passes
- [ ] Follows `docs/design-system.md`
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M5-07: …`
- [ ] End-of-task report given, including **Issues found**

## Verification notes

(Filled in when done: the verdict per question, and the last prototype commit hash.)
