ALTER TABLE postings ADD COLUMN IF NOT EXISTS first_published_at timestamptz;
ALTER TABLE postings ADD COLUMN IF NOT EXISTS source_updated_at timestamptz;
