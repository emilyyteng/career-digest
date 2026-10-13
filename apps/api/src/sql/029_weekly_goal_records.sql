-- F08 M5-05: week close. One fixed record per goal per closed week (R5.8, R5.23).

CREATE TABLE IF NOT EXISTS weekly_goal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  slot text NOT NULL CHECK (slot IN ('lc', 'apps')),
  -- LC: the week's target. Apps: the number of tagged tasks at close.
  target integer NOT NULL CHECK (target >= 0),
  -- LC: weekly solves (may exceed target, R5.14). Apps: tagged tasks completed in the week.
  done integer NOT NULL CHECK (done >= 0),
  met boolean NOT NULL,
  -- The week's worth under R5.15, including a flat bonus paid before week close existed.
  points integer NOT NULL CHECK (points >= 0),
  -- R5.22: the switch-over week's flat +100 was already paid at the moment the target was hit.
  flat_bonus_paid_before boolean NOT NULL DEFAULT false,
  closed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_start, slot)
);

CREATE INDEX IF NOT EXISTS weekly_goal_records_slot_week_idx
  ON weekly_goal_records (slot, week_start DESC);

-- R5.22: weeks before start_week are never closed. Set by the first close check.
CREATE TABLE IF NOT EXISTS weekly_close_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  start_week date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
