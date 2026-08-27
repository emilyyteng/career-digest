ALTER TABLE applications
  ALTER COLUMN posting_id DROP NOT NULL;

ALTER TABLE applications ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS url text;

CREATE TABLE IF NOT EXISTS application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  original_name text NOT NULL,
  stored_name text NOT NULL,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DROP INDEX IF EXISTS postings_is_internship_idx;
ALTER TABLE postings DROP COLUMN IF EXISTS is_internship;

UPDATE companies SET name = 'Simplify' WHERE source = 'simplify' AND board_token = 'listings';
