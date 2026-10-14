-- M5 follow-up: track today's weekly-typed solves per tier so the Weekly/Misc
-- switcher can show type-specific counters (misc = total − weekly).

ALTER TABLE leetcode_daily
  ADD COLUMN IF NOT EXISTS weekly_count integer NOT NULL DEFAULT 0 CHECK (weekly_count >= 0),
  ADD COLUMN IF NOT EXISTS weekly_easy_count integer NOT NULL DEFAULT 0 CHECK (weekly_easy_count >= 0),
  ADD COLUMN IF NOT EXISTS weekly_hard_count integer NOT NULL DEFAULT 0 CHECK (weekly_hard_count >= 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leetcode_daily_weekly_tiers_within_weekly'
  ) THEN
    ALTER TABLE leetcode_daily
      ADD CONSTRAINT leetcode_daily_weekly_tiers_within_weekly
      CHECK (weekly_easy_count + weekly_hard_count <= weekly_count);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leetcode_daily_weekly_within_total'
  ) THEN
    ALTER TABLE leetcode_daily
      ADD CONSTRAINT leetcode_daily_weekly_within_total
      CHECK (
        weekly_count <= count
        AND weekly_easy_count <= easy_count
        AND weekly_hard_count <= hard_count
      );
  END IF;
END $$;
