-- Rename starred tracker status to todo; add optional apply-by deadline.
UPDATE applications SET status = 'todo' WHERE status = 'starred';

ALTER TABLE applications ADD COLUMN IF NOT EXISTS due_at timestamptz;
