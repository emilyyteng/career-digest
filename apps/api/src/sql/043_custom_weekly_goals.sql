-- F11 M3-01: Custom weekly targets (separate namespace from daily habits and apps/LC slots).
-- Identity carries name + target week to week; per-week progress resets; closed records
-- mirror weekly_goal_records so M3-02 can close weeks and derive weeks-in-a-row.

CREATE TABLE IF NOT EXISTS custom_weekly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(50) NOT NULL,
  target_count int NOT NULL DEFAULT 3 CHECK (target_count >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS custom_weekly_goals_active_created_idx
  ON custom_weekly_goals (created_at ASC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS custom_weekly_goals_archived_idx
  ON custom_weekly_goals (archived_at ASC)
  WHERE archived_at IS NOT NULL;

-- Open-week progress (like weekly_goals.progress_count for LC). One row per goal per week.
CREATE TABLE IF NOT EXISTS custom_weekly_goal_weeks (
  goal_id uuid NOT NULL REFERENCES custom_weekly_goals (id) ON DELETE CASCADE,
  week_start date NOT NULL,
  progress_count int NOT NULL DEFAULT 0 CHECK (progress_count >= 0),
  PRIMARY KEY (goal_id, week_start)
);

CREATE INDEX IF NOT EXISTS custom_weekly_goal_weeks_week_start_idx
  ON custom_weekly_goal_weeks (week_start DESC);

-- Closed-week snapshots (like weekly_goal_records for apps/LC). Soft-archive keeps history.
CREATE TABLE IF NOT EXISTS custom_weekly_goal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES custom_weekly_goals (id) ON DELETE CASCADE,
  week_start date NOT NULL,
  -- Snapshot of the goal's target at close (identity target may change later).
  target integer NOT NULL CHECK (target >= 0),
  done integer NOT NULL CHECK (done >= 0),
  met boolean NOT NULL,
  points integer NOT NULL CHECK (points >= 0),
  flat_bonus_paid_before boolean NOT NULL DEFAULT false,
  closed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (goal_id, week_start)
);

CREATE INDEX IF NOT EXISTS custom_weekly_goal_records_goal_week_idx
  ON custom_weekly_goal_records (goal_id, week_start DESC);
