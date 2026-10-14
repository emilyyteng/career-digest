-- One-shot flag: unpaid launch unlocks get ledger points once (app backfill).
ALTER TABLE achievement_state
  ADD COLUMN IF NOT EXISTS points_backfilled boolean NOT NULL DEFAULT false;
