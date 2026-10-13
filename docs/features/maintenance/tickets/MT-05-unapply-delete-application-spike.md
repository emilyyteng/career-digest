# MT-05: Spike: un-applying or deleting an application

**Status:** Draft (not scheduled)
**Blocked by:** (none)
**Implements:** n/a (maintenance)
**Type:** spike

## Why

There's no way to undo a mark-applied or delete an application from the UI. F08 rules this out of scope (R4.10: applications only move forward and their points never reverse). The user asked for a ticket so the question isn't lost (2026-10-13).

## Questions to answer

1. Which cases matter in practice: marked applied by mistake, duplicate application, posting withdrawn, test data?
2. Un-apply vs delete: does the application go back to an open application task, or disappear entirely?
3. What happens to everything attached to it: the open or completed application task, reflections (R2.16 says they become unattached), interview threads and steps, documents, weekly apps goal membership and the week's record?
4. Points: does un-applying reverse the +5 and the reflection add-on? That would change R4.10 and B3, so it needs the user's decision.
5. Where the control lives, and how it's protected from misfires (R5.4 rejected checkboxes for the same reason).

## Output

A short written proposal for the user: recommended behavior for each question, the requirements it would add or change, and proposed tickets. No production code.

## Starting points

- `createApplication` and status changes: [`applications.ts`](../../../../apps/api/src/applications.ts)
- Application points: `awardApplicationApplied` in [`pointsAwards.ts`](../../../../apps/api/src/pointsAwards.ts)
- The F08 rules this would touch: R2.16, R2.21, R4.10, B3 in [`../../F08-accomplishment-rewards/spec.md`](../../F08-accomplishment-rewards/spec.md)

## Definition of done

- [ ] Each question answered with a recommendation
- [ ] Proposal reviewed by the user; any resulting tickets created only after they agree
- [ ] End-of-task report given, including **Issues found**

## Verification notes

(Filled in when done.)
