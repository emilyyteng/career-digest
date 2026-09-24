-- Deadline vs target on dated tasks/subtasks; weekly goals (LC count + app task set).

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_kind text;
ALTER TABLE task_subtasks ADD COLUMN IF NOT EXISTS due_kind text;

-- Backfill before enforcing pair constraints.
UPDATE tasks
SET due_kind = 'deadline'
WHERE due_at IS NOT NULL AND due_kind IS NULL;

UPDATE task_subtasks
SET due_kind = 'target'
WHERE due_at IS NOT NULL AND due_kind IS NULL;

-- Clear orphan kinds if due_at was null somehow.
UPDATE tasks SET due_kind = NULL WHERE due_at IS NULL AND due_kind IS NOT NULL;
UPDATE task_subtasks SET due_kind = NULL WHERE due_at IS NULL AND due_kind IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_due_kind_check'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_due_kind_check
      CHECK (due_kind IS NULL OR due_kind IN ('deadline', 'target'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_due_at_kind_pair'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_due_at_kind_pair
      CHECK (
        (due_at IS NULL AND due_kind IS NULL)
        OR (due_at IS NOT NULL AND due_kind IS NOT NULL)
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_subtasks_due_kind_check'
  ) THEN
    ALTER TABLE task_subtasks
      ADD CONSTRAINT task_subtasks_due_kind_check
      CHECK (due_kind IS NULL OR due_kind IN ('deadline', 'target'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_subtasks_due_at_kind_pair'
  ) THEN
    ALTER TABLE task_subtasks
      ADD CONSTRAINT task_subtasks_due_at_kind_pair
      CHECK (
        (due_at IS NULL AND due_kind IS NULL)
        OR (due_at IS NOT NULL AND due_kind IS NOT NULL)
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS weekly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  slot text NOT NULL CHECK (slot IN ('lc', 'apps')),
  kind text NOT NULL CHECK (kind IN ('count', 'task_set')),
  target_count int CHECK (target_count IS NULL OR target_count > 0),
  progress_count int NOT NULL DEFAULT 0 CHECK (progress_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_start, slot),
  CHECK (
    (kind = 'count' AND slot = 'lc' AND target_count IS NOT NULL)
    OR (kind = 'task_set' AND slot = 'apps' AND target_count IS NULL AND progress_count = 0)
  )
);

CREATE INDEX IF NOT EXISTS weekly_goals_week_start_idx ON weekly_goals (week_start DESC);

CREATE TABLE IF NOT EXISTS weekly_goal_members (
  goal_id uuid NOT NULL REFERENCES weekly_goals (id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (goal_id, task_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS weekly_goal_members_task_unique_idx
  ON weekly_goal_members (task_id);

CREATE INDEX IF NOT EXISTS weekly_goal_members_goal_id_idx ON weekly_goal_members (goal_id);
