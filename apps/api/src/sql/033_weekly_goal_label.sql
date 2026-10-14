-- R5.5 / M5-08: optional LC-only weekly goal label (≤50 characters).

ALTER TABLE weekly_goals ADD COLUMN IF NOT EXISTS label text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'weekly_goals_label_lc_only'
  ) THEN
    ALTER TABLE weekly_goals
      ADD CONSTRAINT weekly_goals_label_lc_only
      CHECK (label IS NULL OR slot = 'lc');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'weekly_goals_label_len'
  ) THEN
    ALTER TABLE weekly_goals
      ADD CONSTRAINT weekly_goals_label_len
      CHECK (label IS NULL OR char_length(label) <= 50);
  END IF;
END $$;
