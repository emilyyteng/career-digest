ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;

UPDATE applications
SET status_changed_at = COALESCE(status_changed_at, created_at, now())
WHERE status_changed_at IS NULL;

ALTER TABLE applications
  ALTER COLUMN status_changed_at SET DEFAULT now();

ALTER TABLE applications
  ALTER COLUMN status_changed_at SET NOT NULL;
