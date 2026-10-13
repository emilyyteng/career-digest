# M5-08: Progress weekly goals block

**Status:** Draft (acceptance criteria drafted 2026-10-13; waits on the open questions below)
**Blocked by:** (none; M5-06 done). 12/10 needs M5-05's uncapping to be reachable (open question 1)
**Implements:** R5.3, R5.4, R5.5 (Progress), R5.13 (label clears), R5.14 (display) (from `../../spec.md`)
**Type:** build

## What to build

The Progress weekly goals block as chosen in M5-06 (variant A with target placement A2; reference: `/prototype/f08/weekly/progress-block`, direction W). Today's block: [`WeeklyGoalsBlock.tsx`](../../../../../apps/web/src/features/progress/WeeklyGoalsBlock.tsx), rendered at [`ProgressPage.tsx` L455–468](../../../../../apps/web/src/features/progress/ProgressPage.tsx).

**LC goal row**

- Head line: `Weekly LC`, the count `done/target`, and pace text.
- Pace text: `n ahead`, `n behind`, `on track`, or `met` once progress reaches the target. Today the API's pace reports `on_track` for a met goal ([`weeklyGoals.ts` L100–101](../../../../../apps/api/src/weeklyGoals.ts)); the UI shows `met` whenever the target is above 0 and done ≥ target. Pace text is never bold (`docs/design-system.md` → Interim decisions).
- Label line, under the head line:
  - With no label: a `+ Add label` button. With a label: the label text, then `Edit label`.
  - Editing turns the line into a text field (placeholder `e.g. Grind 75 Week 4`) with a live `n/50` counter, Cancel and Save. Enter saves; Escape cancels.
  - The target field sits at the right end of this same line, in both the reading and the editing state (A2).
- Bar: fills to the target. Past the target it stays full and shows a `+N` tail (12/10 → `+2`).
- The target field keeps today's behavior: a positive whole number, committed on blur; an invalid value reverts.

**Apps goal row**

- Head line: `Weekly apps`, `done/total`, pace text (same rules as LC), and a bar. With 0 tagged: no bar and no pace, just `No tagged applications. Tag application tasks as “Target this week” on Tasks.`
- Members are a plain list, `Organization · Title`, with an `applied` tag on completed ones, and a `Tag or untag on Tasks.` hint. There's no checkbox (which today completes the task with no modal) and no Untag button ([`WeeklyGoalsBlock.tsx` L82–118](../../../../../apps/web/src/features/progress/WeeklyGoalsBlock.tsx)) (R5.4). The Progress page's `onCompleteTask` handler goes with them.

**Label storage and API (R5.5, R5.13, B6)**

- A new nullable `label` on the week's LC goal row: at most 50 characters, LC row only (enforced in the database).
- `GET /api/weekly-goals` returns it on the LC goal. `PATCH /api/weekly-goals/lc` accepts `label`: trimmed, and an empty string clears it. More than 50 characters returns 400; nothing is saved.
- A new week's LC row starts with no label, while the target still carries forward (R5.13). Past weeks keep their label in the database, but it isn't shown anywhere.
- The label shows only in this block and in the Home target row (M5-09). Home's compact hero block doesn't show it.

**Look (`docs/design-system.md` → Interim decisions):** flat, tinted purple for Save, other buttons as quiet secondary or ghost buttons. See open question 4 for how those variants are added.

**Not in this ticket:**
- The LC stepper and its type × tier control (M5-01).
- Uncapping LC progress (M5-05 item 5).
- The weekly streak display (open question 3).
- Home's compact block and target rows (M5-09).

## Acceptance criteria

**Apps list**
- [ ] No checkbox and no Untag control. The page no longer completes or untags a task from this block.
- [ ] Completed members show the `applied` tag; open members show none.
- [ ] 0 tagged: the empty text shows, with no bar and no pace.

**LC label**
- [ ] With no label, `+ Add label` shows. Saving `Grind 75 Week 4` shows that text, and it's still there after a reload.
- [ ] `Edit label` opens the field prefilled. Escape or Cancel leaves the saved label unchanged; Enter or Save saves.
- [ ] The counter tracks the length. The field stops at 50 characters, and the API rejects 51 with 400 and no change.
- [ ] Leading and trailing spaces are trimmed. Saving an empty or all-spaces label clears it, and `+ Add label` returns.
- [ ] A new week starts with no label and the previous week's target (test across a week boundary in a non-UTC time zone, B2).
- [ ] The apps goal can't carry a label: the API ignores or rejects one, and the database check refuses it.
- [ ] The label doesn't appear in Home's hero block or anywhere outside this block and the Home target row.

**Count, bar and pace**
- [ ] 4/10 midweek shows the pace from the API (`n behind`, `n ahead` or `on track`).
- [ ] 10/10 shows `met` and a full bar with no tail.
- [ ] 12/10 shows `12/10`, `met`, a full bar and a `+2` tail. (Before M5-05 ships, verified with a seeded row; open question 1.)
- [ ] Pace text has normal weight in every state.

**Target field**
- [ ] It sits at the right end of the label line, in both the reading and the editing state, and with a 50-character label (wrapping allowed on narrow screens).
- [ ] Changing the target updates the count, bar and pace without a reload. 0, negative or non-whole values revert.

**General**
- [ ] Matches the M5-06 A2 prototype in direction W, apart from the open questions' outcomes.
- [ ] API tests cover the label: save, trim, clear, 51 characters → 400, apps-row refusal, and the new-week reset with the target carried.

## Open questions (settle before building)

1. **12/10 before M5-05.** Today the API caps LC progress at the target, and lowering the target clamps progress too ([`weeklyGoals.ts` L304–321](../../../../../apps/api/src/weeklyGoals.ts)). Until M5-05 removes the cap, 12/10 can't happen in the app. Options: (a) build the display now and verify it with seeded data (Proposed); (b) move the uncap into M5-08 (removing the immediate bonus would still be M5-05's job); (c) wait for M5-05.
2. **The weekly stepper until M5-01.** M5-06 Q1 chose one LC control in the LeetCode card, which makes this block's LC row read-only. M5-01 builds that control but waits on Q32. Options: (a) keep today's weekly stepper in the block until M5-01, which then removes it (Proposed); (b) make the row read-only now, which leaves no way to log weekly progress until M5-01.
3. **Who builds the weekly streak display (R5.28) in this block?** It needs M5-05's data and M5-07's design. No build ticket lists it for the Progress block (M5-02 covers the banner). Options: (a) add it to M5-08 and wait for both; (b) M5-08 ships without it, and a new small ticket adds it to the block after M5-05 and M5-07 (Proposed).
4. **Interim button variants.** Production has no tinted purple primary or ghost button; today every button is the blue default or `.secondary`. Options: (a) add one shared interim pair of classes built on `.secondary`, reused by M5-01, M5-02 and M5-09, and logged in F09 for its pass (Proposed); (b) use plain `.secondary` everywhere, leaving the purple primary to F09.
5. **Should members link to their task?** The prototype list is plain text. Linking each member to its task detail page (`/tasks/:id`) keeps the list read-only while giving it a use. Proposed: link.
6. **Target field size.** Today it's 4.5rem with the global input padding, which you found too large. Per the new rule it's logged in F09. Options: (a) keep today's size (Proposed, per the rule); (b) narrow it here, since A2 puts it on a shared line.
7. **Character count.** "50 characters": count user-visible characters (code points, so an emoji counts as one) in both the counter and the database (`char_length`), not UTF-16 units. Proposed.

## Reuse notes

- `WeeklyGoalsBlock`, `GoalBar` and `GoalHead` in [`WeeklyGoalsBlock.tsx`](../../../../../apps/web/src/features/progress/WeeklyGoalsBlock.tsx); keep the `compact` mode working for Home until M5-09.
- `patchLcGoal` and `getWeeklyGoalsSnapshot` in [`weeklyGoals.ts`](../../../../../apps/api/src/weeklyGoals.ts), and `ensurePair`, which already carries the target but not a label.
- Prototype reference: `apps/web/src/prototype/f08-weekly/ProgressWeeklyPrototypePage.tsx` (don't import it).

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`, including Interim decisions and rule 7 (log styling issues in F09)
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M5-08: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(Filled in when done.)
