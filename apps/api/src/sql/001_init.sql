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
  is_internship boolean NOT NULL DEFAULT false,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb NOT NULL,
  UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS postings_is_internship_idx ON postings (is_internship);
CREATE INDEX IF NOT EXISTS postings_company_id_idx ON postings (company_id);
