# M5-06: Prototype weekly goal surfaces

**Status:** Ready
**Blocked by:** (none)
**Implements:** R5.1, RX.1, RX.2, RX.3 (for `prototype/m5`); designs for R5.3–R5.6, R5.8, R5.17, R5.18, R5.20 (from `../../spec.md`)
**Type:** prototype

## What to build

Prototypes, with mock data only, for every weekly-goal surface M5 builds. F09's visual-direction questions (F09 Q1–Q5) are settled alongside, using these prototypes as the test case; record the answers in `docs/design-system.md`.

Every variant must satisfy all Established requirements, including:

- weekly + misc LC types, three tiers, decrements that pick a tier, and progress past the target (R5.14, R5.17, R5.20)
- the LC label: 50 characters, LC-only, on Progress and the Home target row only (R5.5)
- the apps goal as a plain list on Progress, with no checkmarks or untag (R5.4)
- Home target rows on Sunday under Targets, styled like interviews, never overdue, gone once met; no apps row with 0 tagged (R5.6, R5.7, R5.24)
- the congrats banner as a one-time notice (R5.18)

## Design questions (prototype tickets only)

1. **LC stepper:** how weekly/misc × easy/medium/hard works in the fewest clicks; how a decrement picks its tier; whether one control replaces today's two (the daily stepper and the weekly-block stepper on Progress).
2. **Progress weekly block:** editing the LC label; showing 12/10; pace text.
3. **Home:** target row treatment; whether the hero's "This week" bars stay once target rows exist.
4. **Congrats banner:** placement on Home and visual treatment; how it states each goal's count and points.
5. **Weekly record in the completion log:** how a closed week's entries look in the diary.

Prototype URL: `/prototype/f08/weekly`

## Acceptance criteria

- [ ] 2–3 variants per design question, switchable with the shared prototype switcher, all under `apps/web/src/prototype/f08-weekly/`
- [ ] No production imports of prototype code; mock data only
- [ ] The user picks a variant (or a mix) per question; the verdict is recorded below
- [ ] F09 Q1–Q5 answers recorded in `docs/design-system.md`
- [ ] The Prototype nav tab is removed (RX.1)
- [ ] The superseded `prototype/m5` folder and its route are deleted after the verdict (RX.3)

## Reuse notes

The existing `WeeklyGoalsBlock`, `LeetcodeStepper`, `TodayStrip`, Home Upcoming rows and `EarnFlash`. The old `prototype/m5` variants are reference only; two of them break R5.5 and R5.7.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M5-06: …`
- [ ] End-of-task report given, including **Issues found**

## Verification notes

(Filled in when done: the verdict per question, and the last prototype commit hash.)
