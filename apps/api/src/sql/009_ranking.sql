ALTER TABLE postings ADD COLUMN IF NOT EXISTS rank_score smallint;
ALTER TABLE postings ADD COLUMN IF NOT EXISTS rank_eligible boolean;
ALTER TABLE postings ADD COLUMN IF NOT EXISTS rank_reason text;
ALTER TABLE postings ADD COLUMN IF NOT EXISTS rank_location_fit text;
ALTER TABLE postings ADD COLUMN IF NOT EXISTS ranked_at timestamptz;
ALTER TABLE postings ADD COLUMN IF NOT EXISTS rank_model text;
ALTER TABLE postings ADD COLUMN IF NOT EXISTS rank_prompt_version text;

CREATE TABLE IF NOT EXISTS rank_profile (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  memo text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO rank_profile (id, memo) VALUES (1, '') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS posting_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id uuid NOT NULL UNIQUE REFERENCES postings (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('like', 'dismiss')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS postings_rank_idx
  ON postings (rank_eligible, rank_score DESC NULLS LAST, last_seen_at DESC);
