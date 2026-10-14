-- M5-11: count-based achievements (R5.26). Unlock rows; launch date for no-points unlocks.

CREATE TABLE IF NOT EXISTS achievement_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  launch_date date NOT NULL
);

CREATE TABLE IF NOT EXISTS achievement_unlocks (
  achievement_id text PRIMARY KEY,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  points_paid integer NOT NULL DEFAULT 0 CHECK (points_paid >= 0)
);

CREATE INDEX IF NOT EXISTS achievement_unlocks_unlocked_at_idx
  ON achievement_unlocks (unlocked_at DESC);
