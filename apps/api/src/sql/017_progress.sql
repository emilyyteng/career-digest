CREATE TABLE IF NOT EXISTS leetcode_daily (
  local_date date PRIMARY KEY,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reflection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lane text NOT NULL CHECK (lane IN ('application', 'technical')),
  body text NOT NULL CHECK (btrim(body) <> ''),
  application_id uuid REFERENCES applications (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reflection_logs_lane_created_idx
  ON reflection_logs (lane, created_at);
