-- Reflection linking + deep-work field + Other lane (M2).
-- One-time: when deep_work is first added, mark all rows deep work and unlink.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reflection_logs'
      AND column_name = 'deep_work'
  ) THEN
    ALTER TABLE reflection_logs
      ADD COLUMN deep_work boolean NOT NULL DEFAULT true;
    ALTER TABLE reflection_logs
      ADD COLUMN task_id uuid REFERENCES tasks (id) ON DELETE SET NULL;
    -- Retroactive: existing reflections are deep work and unassociated.
    UPDATE reflection_logs
    SET
      deep_work = true,
      task_id = NULL,
      application_id = NULL;
  END IF;
END $$;

ALTER TABLE reflection_logs
  ADD COLUMN IF NOT EXISTS deep_work boolean NOT NULL DEFAULT true;

ALTER TABLE reflection_logs
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES tasks (id) ON DELETE SET NULL;

ALTER TABLE reflection_logs DROP CONSTRAINT IF EXISTS reflection_logs_lane_check;
ALTER TABLE reflection_logs
  ADD CONSTRAINT reflection_logs_lane_check
  CHECK (lane IN ('application', 'technical', 'other'));

ALTER TABLE reflection_logs DROP CONSTRAINT IF EXISTS reflection_logs_link_xor;
ALTER TABLE reflection_logs
  ADD CONSTRAINT reflection_logs_link_xor
  CHECK (NOT (task_id IS NOT NULL AND application_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS reflection_logs_task_id_idx
  ON reflection_logs (task_id)
  WHERE task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS reflection_logs_application_id_idx
  ON reflection_logs (application_id)
  WHERE application_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS reflection_logs_deep_work_lane_created_idx
  ON reflection_logs (lane, created_at)
  WHERE deep_work;
