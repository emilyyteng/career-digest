-- F08 M5-01: LeetCode counts per difficulty tier (R5.17, R5.20).
-- `count` stays the day's total. Medium is the rest (count - easy - hard), so days
-- logged before tiers read as medium and keep their +30 a solve; no rows are rewritten.

ALTER TABLE leetcode_daily
  ADD COLUMN IF NOT EXISTS easy_count integer NOT NULL DEFAULT 0 CHECK (easy_count >= 0),
  ADD COLUMN IF NOT EXISTS hard_count integer NOT NULL DEFAULT 0 CHECK (hard_count >= 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leetcode_daily_tiers_within_count'
  ) THEN
    ALTER TABLE leetcode_daily
      ADD CONSTRAINT leetcode_daily_tiers_within_count
      CHECK (easy_count + hard_count <= count);
  END IF;
END $$;
