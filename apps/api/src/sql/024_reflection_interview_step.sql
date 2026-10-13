-- Optional interview step on an application-linked reflection.
-- task XOR application; interview_step_id only allowed with application_id.

ALTER TABLE reflection_logs
  ADD COLUMN IF NOT EXISTS interview_step_id uuid
    REFERENCES application_steps (id) ON DELETE SET NULL;

ALTER TABLE reflection_logs DROP CONSTRAINT IF EXISTS reflection_logs_link_xor;
ALTER TABLE reflection_logs
  ADD CONSTRAINT reflection_logs_link_xor
  CHECK (
    NOT (task_id IS NOT NULL AND application_id IS NOT NULL)
    AND (interview_step_id IS NULL OR application_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS reflection_logs_interview_step_id_idx
  ON reflection_logs (interview_step_id)
  WHERE interview_step_id IS NOT NULL;
