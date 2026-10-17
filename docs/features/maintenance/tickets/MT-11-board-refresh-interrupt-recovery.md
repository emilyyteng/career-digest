# MT-11: Detect interrupted board refresh and catch up

**Status:** Done
**Blocked by:** (none)
**Implements:** (maintenance — no feature requirements)
**Type:** bug

## Found during

Diagnosing a stuck Jobs banner (“Refreshing board — ingesting listings…”) on 2026-10-16 after `tsx watch` restarted the API mid-ingest. Agreed to clear the stuck state, fix detection, and auto-rerun when past the daily schedule.

## Evidence

- `data/board-refresh.json` stayed `status: "running"`, `phase: "ingest"` after the API process that started the run was gone.
- Stale recovery only ran after 3 hours (`STALE_RUNNING_MS`), so the UI kept polling a dead run and `POST /api/board/refresh` refused to start.
- Status `lastRun` (−163 / −177) was from the previous successful refresh; Board departures (41) were partial writes from the killed ingest.

## What to build

1. Persist the runner pid on board refresh; treat a dead pid as interrupted (keep the 3h age fallback for legacy files without a pid).
2. Show Interrupted clearly on Status; surface the error on Jobs even if this tab did not start the run.
3. Background watcher: after an interrupted refresh, if today’s daily schedule time has passed and there is no success since then, start one automatic catch-up (once per local day; skipped in Demo mode).

## Acceptance criteria

- [x] Running refresh with a dead `runnerPid` becomes `status: error` with the interrupted message on the next read/reconcile
- [x] A live `runnerPid` stays `running` even past the 3h age window
- [x] Legacy running files without a pid still age out after 3h
- [x] Status badge shows “Interrupted” for that error; Jobs shows the error without having watched the run start
- [x] Watcher catch-up runs at most once per local day when past schedule and `lastOkAt` is before today’s schedule
- [x] Demo mode does not auto-catch-up
- [x] `npm run check` passes

## Edge cases

- Cron CLI refresh: pid is the CLI process; API Status shows running while that pid lives, interrupted when the CLI dies uncleanly.
- Catch-up interrupted after ≥2 minutes consumes the daily slot (`catchUpOn`); a death within 2 minutes clears the slot so API/tsx restarts can retry.
- Non-interrupt errors (network, etc.) do not trigger catch-up.

## Tests

- [x] Unit: `snapshotFromDisk` dead/alive/legacy/stale pid cases
- [x] Unit: `shouldCatchUpInterruptedBoardRefresh` schedule / already-ok / once-per-day / non-interrupt
- [x] Unit: `isProcessAlive` for current pid

## Reuse notes

- Same watcher pattern as `rankBatchWatcher.ts`
- Daily schedule helpers extracted from `opsStatus.ts` into `dailyBoardSchedule.ts`

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `MT-11: …`
- [x] End-of-task report given

## Verification notes

- Cleared stuck `data/board-refresh.json` manually before the fix (local-only).
- `npm run check` green (384 tests), including new board-refresh / processAlive / catch-up cases.
- Commit hash pending follow-up after this commit exists.
