-- Task priority (0=P0, 1=P1, 2=P2), time estimate, and one-level subtasks.
-- parent_subtask_id is reserved for future nesting (always NULL in v1).

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority smallint;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimate_minutes int;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_priority_check'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_priority_check
      CHECK (priority IS NULL OR priority IN (0, 1, 2));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_estimate_minutes_check'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_estimate_minutes_check
      CHECK (estimate_minutes IS NULL OR estimate_minutes > 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS task_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  parent_subtask_id uuid REFERENCES task_subtasks (id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed')),
  due_at timestamptz,
  estimate_minutes int CHECK (estimate_minutes IS NULL OR estimate_minutes > 0),
  -- NULL = inherit parent task priority; 0/1/2 = explicit override
  priority_override smallint CHECK (priority_override IS NULL OR priority_override IN (0, 1, 2)),
  sort_order int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_subtasks_task_id_idx ON task_subtasks (task_id);
CREATE INDEX IF NOT EXISTS task_subtasks_due_at_idx ON task_subtasks (due_at)
  WHERE due_at IS NOT NULL AND status = 'open';
