-- F08 M6-01: Board departures log (snapshot before posting delete).

CREATE TABLE IF NOT EXISTS board_departures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id uuid,
  title text NOT NULL,
  company text NOT NULL,
  location text,
  reason text NOT NULL CHECK (reason IN ('left_board', 'duplicate')),
  task_removed boolean NOT NULL DEFAULT false,
  departed_at timestamptz NOT NULL DEFAULT now(),
  -- UTC calendar day at insert; purge keeps today + yesterday UTC (R6.7 day-boundary).
  departed_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date)
);

CREATE INDEX IF NOT EXISTS board_departures_departed_on_idx
  ON board_departures (departed_on DESC);
