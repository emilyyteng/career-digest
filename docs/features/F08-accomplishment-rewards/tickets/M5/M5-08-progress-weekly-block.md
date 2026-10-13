# M5-08: Progress weekly goals block

**Status:** Draft (streak display criteria wait on M5-07 Q5; everything else is final)
**Blocked by:** M5-05 (uncapped LC progress and the weekly-streak count, so this UI is verified with real data), M5-01 (removes the weekly stepper, so this block never handles LeetCode logging), M5-07 (Q5 designs the weekly-streak display). Decided 2026-10-13; M5-06 done
**Implements:** R5.3, R5.4, R5.5 (Progress), R5.13 (label clears), R5.14 (display), R5.28 (Progress display) (from `../../spec.md`)
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

- No LeetCode stepper: M5-01 already moved logging to the Progress LeetCode card. The row updates without a reload after each LeetCode change.
- **Weekly streak (R5.28):** each goal (LC and apps) shows its current run of met weeks, read from M5-05's records, as designed in M5-07 Q5. Display only; no points.

**Apps goal row**

- Head line: `Weekly apps`, `done/total`, pace text (same rules as LC), and a bar. With 0 tagged: no bar and no pace, just `No tagged applications. Tag application tasks as “Target this week” on Tasks.`
- Members are a plain list, `Organization · Title`, each linking to its task's detail page (`/tasks/:id`). Applied members carry the green uppercase `applied` tag from the prototype and are listed after the open ones; within each group, the API's order is kept. A `Tag or untag on Tasks.` hint follows the list. There's no checkbox (which today completes the task with no modal) and no Untag button ([`WeeklyGoalsBlock.tsx` L82–118](../../../../../apps/web/src/features/progress/WeeklyGoalsBlock.tsx)) (R5.4). The Progress page's `onCompleteTask` handler goes with them.

**Label storage and API (R5.5, R5.13, B6)**

- A new nullable `label` on the week's LC goal row: at most 50 characters, LC row only (enforced in the database).
- `GET /api/weekly-goals` returns it on the LC goal. `PATCH /api/weekly-goals/lc` accepts `label`: trimmed, and an empty string clears it. More than 50 characters returns 400; nothing is saved.
- A new week's LC row starts with no label, while the target still carries forward (R5.13). Past weeks keep their label in the database, but it isn't shown anywhere.
- The label shows only in this block and in the Home target row (M5-09). Home's compact hero block doesn't show it.

**Look (`docs/design-system.md` → Interim decisions):** flat; Save is a tinted purple primary; Cancel, `+ Add label` and `Edit label` are ghost buttons. These come from one shared set of interim button classes built on `.secondary` (tinted primary, ghost; decided 2026-10-13). M5-01 adds them and logs them in F09; this ticket, M5-09 and M5-02 reuse them. The target field keeps today's size (logged in F09).

**Not in this ticket:**
- The LC stepper and its type × tier control (M5-01, which also removes the old weekly stepper from this block).
- Uncapping LC progress and the weekly-streak count (M5-05; this ticket waits for them).
- Home's compact block and target rows (M5-09).

## Acceptance criteria

**Apps list**
- [ ] No checkbox and no Untag control. The page no longer completes or untags a task from this block.
- [ ] Each member links to its task's detail page.
- [ ] Applied members show the green `applied` tag and are listed after the open ones; open members show no tag.
- [ ] 0 tagged: the empty text shows, with no bar and no pace.

**LC label**
- [ ] With no label, `+ Add label` shows. Saving `Grind 75 Week 4` shows that text, and it's still there after a reload.
- [ ] `Edit label` opens the field prefilled. Escape or Cancel leaves the saved label unchanged; Enter or Save saves.
- [ ] The counter tracks the length in user-visible characters (an emoji counts as one, in the counter and in the database's `char_length`). The field stops at 50 characters, and the API rejects 51 with 400 and no change.
- [ ] Leading and trailing spaces are trimmed. Saving an empty or all-spaces label clears it, and `+ Add label` returns.
- [ ] A new week starts with no label and the previous week's target (test across a week boundary in a non-UTC time zone, B2).
- [ ] The apps goal can't carry a label: the API ignores or rejects one, and the database check refuses it.
- [ ] The label doesn't appear in Home's hero block or anywhere outside this block and the Home target row.

**Count, bar and pace**
- [ ] 4/10 midweek shows the pace from the API (`n behind`, `n ahead` or `on track`).
- [ ] 10/10 shows `met` and a full bar with no tail.
- [ ] 12/10, reached through the app, shows `12/10`, `met`, a full bar and a `+2` tail.
- [ ] Pace text has normal weight in every state.

**Weekly streak**
- [ ] Both goals show their current run of met weeks from M5-05's API, in M5-07 Q5's design. (Finalize the wording and placement after M5-07.)
- [ ] A goal with no current run shows what M5-07 decides (nothing, or a zero state).

**Target field**
- [ ] It sits at the right end of the label line, in both the reading and the editing state, and with a 50-character label (wrapping allowed on narrow screens).
- [ ] Changing the target updates the count, bar and pace without a reload. 0, negative or non-whole values revert.

**General**
- [ ] Matches the M5-06 A2 prototype in direction W, apart from the open questions' outcomes.
- [ ] API tests cover the label: save, trim, clear, 51 characters → 400, apps-row refusal, and the new-week reset with the target carried.

## Open questions

None. All decided 2026-10-13:

- **Waits for M5-05** (was 1): build the data and API first, so this UI is verified against real data. 12/10 comes from M5-05's uncapping.
- **Interim buttons** (was 4): one shared set of tinted purple primary, ghost and toggle classes, added by M5-01 and logged in F09.
- **Apps members** (was 5): link to the task, green `applied` tag, applied listed last, no checkbox or untag (spec R5.4).
- **Target field size** (was 6): today's size, logged in F09.
- **Character count** (was 7): user-visible characters.
- **Weekly stepper** (was 2): M5-01 comes first and removes it; this ticket never touches LeetCode logging.
- **Weekly streak display** (was 3): owned here. Its look comes from M5-07 Q5, so this ticket waits on M5-07.

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
