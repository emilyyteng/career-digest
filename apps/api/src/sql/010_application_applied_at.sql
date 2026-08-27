ALTER TABLE applications ADD COLUMN IF NOT EXISTS applied_at timestamptz;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS description_html text;
