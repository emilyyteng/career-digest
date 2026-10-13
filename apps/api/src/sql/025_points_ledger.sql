-- M4: global points ledger + actual minutes on completions / reflections.

CREATE TABLE IF NOT EXISTS points_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('earn', 'reverse', 'adjust')),
  category text NOT NULL CHECK (
    category IN (
      'task',
      'application',
      'leetcode',
      'interview',
      'reflection',
      'weekly_goal',
      'achievement'
    )
  ),
  -- Signed delta applied to balance (earn ≥ 0; reverse/adjust usually ≤ 0).
  amount integer NOT NULL,
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  message text NOT NULL,
  source_type text NOT NULL,
  source_id text,
  breakdown jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  reverses_event_id uuid REFERENCES points_events (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS points_events_created_at_idx
  ON points_events (created_at DESC);

CREATE INDEX IF NOT EXISTS points_events_source_idx
  ON points_events (source_type, source_id);

CREATE UNIQUE INDEX IF NOT EXISTS points_events_earn_source_uidx
  ON points_events (source_type, source_id)
  WHERE kind = 'earn' AND source_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS points_events_weekly_goal_uidx
  ON points_events (source_type, source_id)
  WHERE kind = 'earn' AND source_type = 'weekly_goal';

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS actual_minutes integer
  CHECK (actual_minutes IS NULL OR actual_minutes >= 0);

ALTER TABLE reflection_logs
  ADD COLUMN IF NOT EXISTS actual_minutes integer
  CHECK (actual_minutes IS NULL OR actual_minutes >= 0);
