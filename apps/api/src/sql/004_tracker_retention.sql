ALTER TABLE postings ADD COLUMN IF NOT EXISTS removed_from_board_at timestamptz;

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id uuid NOT NULL UNIQUE REFERENCES postings (id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'applied',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS postings_removed_from_board_at_idx ON postings (removed_from_board_at);
