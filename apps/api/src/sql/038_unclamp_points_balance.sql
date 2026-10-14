-- F08 M7-01 / R7.3: balance may go negative; remove the floor at 0.

ALTER TABLE points_events
  DROP CONSTRAINT IF EXISTS points_events_balance_after_check;
