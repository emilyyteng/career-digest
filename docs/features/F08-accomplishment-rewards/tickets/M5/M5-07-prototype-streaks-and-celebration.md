# M5-07: Prototype streaks, achievements and the completion flourish

**Status:** In progress
**Blocked by:** (none)
**Implements:** R5.1, RX.2; designs for R5.2, R5.25–R5.28 (from `../../spec.md`)
**Type:** prototype

## What to build

Prototypes, with mock data only, for how streaks and achievements show up, what happens at an unlock, the today strip with streaks, and whether a completion flourish is worth keeping. Placement is provisional: M8 decides where things finally live (R8.5).

Every variant must satisfy all Established requirements, including:

- daily LC and apps streaks, with small daily points and milestone rewards (R5.25)
- count-based achievements for applications, LC and interview steps per kind (R5.26)
- the today strip on Home and Progress showing current streaks instead of `x/3` (R5.27)

- the weekly-goal streak is display only (R5.28)
- no deep-work toggle or badges anywhere (R5.29)

Use the numbers in R5.25 and R5.26 as mock values.

## Design questions (prototype tickets only)

1. **Today strip with streaks (R5.27):** how the apps and LC streaks read at a glance, including "today not done yet", with the deep-work badges gone. The user is considering bringing the strip's badges back to mark that a reflection was written that day (2026-10-13); include at least one variant with and one without, and decide here. The strip has no badges until then.
2. **Streak and achievement surface:** where they're seen before M8 (for example a block on Progress) and how locked, unlocked and next achievements look.
3. **Unlock moment:** how a streak milestone or achievement is announced (`EarnFlash`, the one-time notice, or something else).
4. **Completion flourish (Q7):** keep or drop; if kept, which events trigger it and whether it replaces `EarnFlash`.
5. **Weekly-goal streak display (R5.28):** how "3 weeks in a row" reads in the congrats banner and the Progress weekly block. The user wants it more visible than M5-06's placeholders (small grey text after the LC title; a mint line in the congrats banner, shown from 2 weeks) (2026-10-13). Design it for both goals, in the chosen M5-06 layouts: Progress block A2 and congrats banner B.

Prototype URL: `/prototype/f08/streaks`

## Acceptance criteria

- [x] 2–3 variants per design question, switchable with the shared prototype switcher, under `apps/web/src/prototype/f08-streaks/`
- [x] No production imports of prototype code; mock data only
- [ ] The user records a verdict per question, including a keep/drop on the flourish (Q7) — partial; see verification notes

## Reuse notes

`TodayStrip`, `EarnFlash`, the one-time notice from M5-06, and the Progress page layout as it is today.

## Definition of done

- [ ] Acceptance criteria met and checked (Q1/Q2 still open)
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] No production imports of prototype code
- [x] Committed as `F08 M5-07: …`
- [ ] End-of-task report given, including **Issues found** (after remaining verdicts)

## Verification notes

Hub: `/prototype/f08/streaks`.

**Verdicts (2026-10-13, round 2):**

| Q | Verdict | Notes |
|---|---------|-------|
| Q5 | Flame compact (B2) | Like B’s flame, but no dedicated line: right-aligned on Progress weekly goal head; inline with a slight gap on Home congrats. |
| Q1 | Open | Round-1 copy unclear (looked like daily counts). Round-2: D streak pills with ✓/pending (from achievements), E “Apps streak N”, F today units + day streak. Prefer streak clarity; ✓ = done today. |
| Q2 | Open (surface OK in spirit) | Progress block makes sense; final home is M8 (R8.5). Confirm A/B/C. |
| Q3 | Modal | “Great work!”; `Balance: N`; larger gap above the button. |
| Q4 / Q7 | **Drop** flourish | EarnFlash only. R5.2 dropped; M5-13 won't-do. |

Still needed: pick Q1 (D/E/F + reflection badges on/off); confirm Q2 surface variant.
