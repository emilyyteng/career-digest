-- F11 M1-01: Custom daily habits identity + qualifying-day checkoffs.
-- Streak length is derived from checkoff days (not stored). Soft archive only.

CREATE TABLE IF NOT EXISTS custom_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(50) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS custom_habits_active_created_idx
  ON custom_habits (created_at ASC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS custom_habits_archived_idx
  ON custom_habits (archived_at ASC)
  WHERE archived_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS custom_habit_days (
  habit_id uuid NOT NULL REFERENCES custom_habits (id) ON DELETE CASCADE,
  local_date date NOT NULL,
  PRIMARY KEY (habit_id, local_date)
);

CREATE INDEX IF NOT EXISTS custom_habit_days_local_date_idx
  ON custom_habit_days (local_date DESC);
