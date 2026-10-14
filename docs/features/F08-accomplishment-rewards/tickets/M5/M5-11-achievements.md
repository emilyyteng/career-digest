# M5-11: Count-based achievements

**Status:** Done
**Blocked by:** M5-07 (display and unlock moment — done), M5-01 (LC solve counts across tiers)
**Implements:** R5.16, R5.26 (from `../../spec.md`)
**Type:** build

## What to build

Achievements unlock when a running count crosses a threshold, and each pays once:

- applications marked applied
- LC solves
- finished interview steps, counted separately per kind (assessment, phone, technical, onsite, offer). These pay more than applications or LC.

Thresholds and points (R5.26; starting values, kept in one place for tuning and for the in-app rules, R7.9):

- Applications: 10, 25, 50, 100, 150, 200, 300, 500; 3 × N.
- LC solves: 25, 50, 100, 200, 300, 500; 5 × N.
- Interview steps per kind, at the step's own points × N: assessment and phone 5, 10, 25, 50; technical 3, 5, 10, 25; onsite 1, 3, 5, 10; offer 1, 2, 3, 5. Custom steps don't count.

**Launch:** achievements already passed unlock at launch with no points; only crossings after launch earn.

**Display (M5-07):** a Progress tab **`achievements`**, next to **ledger** (`today` · `history` · `ledger` · `achievements`). Follow [`/prototype/f08/streaks/achievements?variant=Tab`](../../../../../apps/web/src/prototype/f08-streaks/AchievementsPrototypePage.tsx): locked / next (accent) / unlocked rows with progress toward the next threshold. Daily streaks are **not** on this tab (they live on the today strip, M5-12). M8 may still redesign Progress IA overall (R8.5).

**Unlock moment (M5-07):** modal — title, detail, `+N` points, `Balance: N`, primary button **Great work!** (not EarnFlash, not a one-time notice).

## Acceptance criteria

- [x] Progress gains an `achievements` tab beside `ledger`, matching the M5-07 Tab prototype (list states; no daily-streak pills on this tab).
- [x] Crossing a threshold unlocks it once and records one earn; dropping back below (for example an LC decrement) doesn't re-lock it or reverse the points, and crossing again doesn't pay again.
- [x] Interview steps count per kind; reopening and re-finishing a step doesn't count twice (R4.11).
- [x] Achievements already passed at launch show as unlocked, with no earn recorded.
- [x] Spot checks: 100 applications = +300; 100 LC = +500; 5 assessments = +300; 1 offer = +200.
- [x] Unlocks use the modal from M5-07 (“Great work!”, `Balance: N`).
- [x] Tests cover each family, a decrement-and-recross, and launch handling.

## Reuse notes

Counts already exist in `completionsDiary.ts` (L386–436) and `leetcode_daily`. One earn per achievement through `recordEarn`, with the `achievement` category that already exists in the ledger. Prototype reference: `apps/web/src/prototype/f08-streaks/AchievementsPrototypePage.tsx` (`variant=Tab`).

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F08 M5-11: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

Commit: see board. Catalog + `achievement_unlocks` / `achievement_state` (032). Sync on mark-applied, LC patch, interview finish, and `GET /achievements`. Progress tab + unlock modal via `AchievementUnlockProvider`. Launch unlocks pay 0; post-launch crossings pay once.
