# M4-02: Spike: notifications for negative point events

**Status:** Draft
**Blocked by:** (none)
**Implements:** R.9 (EarnFlash placement); banner patterns in `docs/design-system.md`
**Type:** spike

Moved from maintenance **MT-11** (2026-10-16) into F09 M4 cleanup & extensions.

## Found during

Surfaced during F11 M2-01 Habits strip work (2026-10-16). Checking off a custom habit shows `EarnFlash` when streak points are paid; unchecking reverses points in the ledger with no flash. LC ± on Progress can already return a negative `points` payload into the same mint `EarnFlash`. Task reopen reverses with no banner by design (F08 M4-03). The design system only documents `EarnFlash` as feedback after a **points-earning** action, and says not to invent a third banner type beyond `EarnFlash` / `OneTimeNotice`.

Leave production as-is for now; this spike locks a standard before more surfaces invent ad hoc reverse flashes.

## Questions to answer

1. Should negative ledger moves (reverse, downward adjust) get a transient banner at all, or stay ledger-only for some/all cases?
2. If yes: reuse `EarnFlash` with negative copy (current LC decrement path), or a distinct reverse-styled banner (would need a design-system update; today only two mint banner patterns are allowed)?
3. Which actions must follow the standard: habit uncheck, LC decrement/clear, task reopen, actual-minutes downward adjust, others?
4. Placement: near-control rule from F09 M1-10 / R.9 still apply for losses?
5. What to record in `docs/design-system.md` so later features don’t re-decide this.

## Output

A short written proposal for the user: recommendation per question, any design-system wording, and follow-up tickets only if agreed. No production code in this spike.

## Starting points

- [`EarnFlash.tsx`](../../../../../apps/web/src/features/completion/EarnFlash.tsx) (supports negative `amount` in fallback copy; mint styling)
- Banner patterns in [`docs/design-system.md`](../../../../design-system.md) (EarnFlash / OneTimeNotice)
- LC change → flash: [`ThisWeekPage.tsx`](../../../../../apps/web/src/features/progress/ThisWeekPage.tsx) / `syncLeetcodeDailyPoints`
- Habit checkoff flash (earn only): [`HabitsStrip.tsx`](../../../../../apps/web/src/features/progress/HabitsStrip.tsx), [`customHabits.ts`](../../../../../apps/api/src/customHabits.ts)
- Silent reopen: F08 M4-03 verification notes

## Definition of done

- [ ] Each question answered with a recommendation
- [ ] Proposal reviewed by the user; design-system and/or tickets updated only after they agree
- [ ] End-of-task report given, including **Issues found**

## Verification notes

(Filled in when done.)
