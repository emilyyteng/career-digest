# M5-06: Prototype weekly goal surfaces

**Status:** Done
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

- [x] 2–3 variants per design question, switchable with the shared prototype switcher, all under `apps/web/src/prototype/f08-weekly/`
- [x] No production imports of prototype code; mock data only
- [x] The user picks a variant (or a mix) per question; the verdict is recorded below
- [x] ~~F09 Q1–Q5 answers recorded in `docs/design-system.md`~~ Changed 2026-10-13: Q1–Q5 stay open in F09. The user's interim working decisions for M5 are recorded in `docs/design-system.md`, and their preferences in the F09 spec.
- [x] The Prototype nav tab is removed (RX.1)
- [x] The superseded `prototype/m5` folder and its route are deleted after the verdict (RX.3)

## Reuse notes

The existing `WeeklyGoalsBlock`, `LeetcodeStepper`, `TodayStrip`, Home Upcoming rows and `EarnFlash`. The old `prototype/m5` variants are reference only; two of them break R5.5 and R5.7.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] No production imports of prototype code
- [x] Committed as `F08 M5-06: …`
- [x] End-of-task report given, including **Issues found**

## Verification notes

(Filled in when done: the verdict per question, and the last prototype commit hash.)

**Built.** Hub at `/prototype/f08/weekly`, one page per design question (`lc-stepper`, `progress-block`, `home-targets`, `congrats`, `weekly-record`) plus `visual-direction` for F09 Q1–Q5. Each page has scenario toggles for the edge cases (12/10, empty or 50-character label, 0 tagged apps, goal met, neither met, 0/0 week), and a `?dir=w|a|b|c` toggle that applies an F09 direction to it. Mock dates are computed from today, so Sunday targets are never overdue. Tier points are placeholders until Q32.

**Verdict (2026-10-13):**

1. **LC stepper:** variant A. One control in the Progress LeetCode card: a weekly/misc switch, then easy/medium/hard steppers showing today's per-tier counts. A decrement removes that tier, of the type the switch shows. The weekly block shows LC progress read-only. This replaces today's two steppers.
2. **Progress weekly block:** variant A (label line under the title with "+ Add label" / "Edit label", 50-character counter, a "+N" tail on the bar past the target, pace text "met" once met). Target field placement: **A2**, right-aligned on the label line above the bar, which reads more compact than A (below the bar, left) or A3 (below the bar, right). The number field looks too large; its size is logged as an F09 form-field question.
3. **Home targets:** variant B. Each target row carries its own mini bar, count and pace text, with the Sunday date and "resets Monday" on the right instead of a countdown. The hero's "This week" bars are removed. Pace text (ahead, behind, on track, met) is never bold; today the Home hero bolds only "behind" (`styles.css` L4088).
4. **Congrats banner:** variant B. Inside the hero, one row per met goal with its count, breakdown and points, plus a total when both were met. The heading says "target" when one goal was met and "targets" when both were.
5. **Weekly record:** variant A. Ledger rows of kind "weekly" on the close day, plus a "weekly" tab. Meta text: `Week of Oct 5 · 6 × 20` for a missed target (no "missed" note); `Week of Oct 5 · 12 × 20 + 100 · target met` when met; `Week of Oct 5 · no tagged applications` for a 0/0 week, with no points.

**Accepted Proposed choices:** a 0/0 apps week gets an entry with no points; clicking a Home target row opens Progress; pace text reads "met" once a target is met. The weekly streak text in the prototypes ("LC: 3 weeks in a row", shown from 2 weeks) is a placeholder: its design is M5-07 Q5.

**Visual direction:** F09 Q1–Q5 stay open. Interim working decisions for M5 (prototype direction W): flat elevation, tinted purple primary (Save) buttons, and toggles such as the weekly/misc switch in the goal-bar blue. Recorded in `docs/design-system.md`; preferences in the F09 spec.

**Closed 2026-10-13.** The superseded `prototype/m5` folder and its routes are deleted (RX.3); git history keeps them. The `f08-weekly` prototype stays as the reference for the M5 builds until M5-01, M5-02, M5-05, M5-08 and M5-09 are all Done (RX.3, `AGENTS.md` → Prototypes → Lifecycle). The user wants the weekly streak more visible than these placeholders; that's M5-07 Q5. Last prototype commit: `f0a5fd2`.
