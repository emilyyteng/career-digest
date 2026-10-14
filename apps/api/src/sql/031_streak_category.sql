-- F08 M5-10: daily streaks (R5.25). Ledger category `streak`, plus a launch date
-- so a running streak keeps earlier days while daily points start from launch (Q46).

ALTER TABLE points_events DROP CONSTRAINT IF EXISTS points_events_category_check;
ALTER TABLE points_events
  ADD CONSTRAINT points_events_category_check CHECK (
    category IN (
      'task',
      'application',
      'leetcode',
      'interview',
      'reflection',
      'weekly_goal',
      'achievement',
      'streak'
    )
  );

CREATE TABLE IF NOT EXISTS streak_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  launch_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO streak_state (singleton, launch_date)
VALUES (true, CURRENT_DATE)
ON CONFLICT (singleton) DO NOTHING;
