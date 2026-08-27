CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source text NOT NULL,
  board_token text NOT NULL,
  UNIQUE (source, board_token)
);

CREATE TABLE IF NOT EXISTS postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  external_id text NOT NULL,
  company_id uuid NOT NULL REFERENCES companies (id),
  title text NOT NULL,
  location text,
  department text,
  url text NOT NULL,
  description_html text,
  first_published_at timestamptz,
  source_updated_at timestamptz,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  removed_from_board_at timestamptz,
  scraped_at timestamptz,
  scrape_status text,
  rank_score smallint,
  rank_eligible boolean,
  rank_reason text,
  rank_location_fit text,
  ranked_at timestamptz,
  rank_model text,
  rank_prompt_version text,
  raw jsonb NOT NULL,
  UNIQUE (source, external_id)
);

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id uuid UNIQUE REFERENCES postings (id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'applied',
  notes text,
  company_name text,
  title text,
  location text,
  url text,
  description_html text,
  applied_at timestamptz,
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  original_name text NOT NULL,
  stored_name text NOT NULL,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS postings_company_id_idx ON postings (company_id);
CREATE INDEX IF NOT EXISTS postings_removed_from_board_at_idx ON postings (removed_from_board_at);

CREATE TABLE IF NOT EXISTS rank_profile (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  memo text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posting_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id uuid NOT NULL UNIQUE REFERENCES postings (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('like', 'dismiss')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

