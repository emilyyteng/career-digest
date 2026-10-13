-- R5.31: time belongs to the work, not the reflection.
-- Applications (some have no task) and interview steps get their own actual time.
-- reflection_logs.actual_minutes stays, unused from now on.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS actual_minutes integer
  CHECK (actual_minutes IS NULL OR actual_minutes >= 0);

ALTER TABLE application_steps
  ADD COLUMN IF NOT EXISTS actual_minutes integer
  CHECK (actual_minutes IS NULL OR actual_minutes >= 0);

-- Reflections written with the work in a completion modal were saved without their own
-- reflection_create earn (the points were bundled into the work's earn); standalone ones
-- have that earn. Reflection minutes only exist since 025, so this split covers them all.

-- Applications: the completed application task's actual time first, else the minutes of
-- the reflections written with it.
UPDATE applications a
SET actual_minutes = t.actual_minutes
FROM (
  SELECT application_id, MAX(actual_minutes) AS actual_minutes
  FROM tasks
  WHERE category = 'application'
    AND status = 'completed'
    AND application_id IS NOT NULL
    AND actual_minutes IS NOT NULL
  GROUP BY application_id
) t
WHERE a.id = t.application_id
  AND a.actual_minutes IS NULL;

UPDATE applications a
SET actual_minutes = r.minutes
FROM (
  SELECT rl.application_id, SUM(rl.actual_minutes)::integer AS minutes
  FROM reflection_logs rl
  WHERE rl.application_id IS NOT NULL
    AND rl.interview_step_id IS NULL
    AND rl.actual_minutes IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM points_events pe
      WHERE pe.kind = 'earn'
        AND pe.source_type = 'reflection_create'
        AND pe.source_id = rl.id::text
    )
  GROUP BY rl.application_id
) r
WHERE a.id = r.application_id
  AND a.actual_minutes IS NULL
  AND a.status <> 'todo';

-- The application task shows the application's time, so the two start out equal.
UPDATE tasks t
SET actual_minutes = a.actual_minutes
FROM applications a
WHERE t.application_id = a.id
  AND t.category = 'application'
  AND t.status = 'completed'
  AND t.actual_minutes IS NULL
  AND a.actual_minutes IS NOT NULL;

UPDATE application_steps s
SET actual_minutes = r.minutes
FROM (
  SELECT rl.interview_step_id, SUM(rl.actual_minutes)::integer AS minutes
  FROM reflection_logs rl
  WHERE rl.interview_step_id IS NOT NULL
    AND rl.actual_minutes IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM points_events pe
      WHERE pe.kind = 'earn'
        AND pe.source_type = 'reflection_create'
        AND pe.source_id = rl.id::text
    )
  GROUP BY rl.interview_step_id
) r
WHERE s.id = r.interview_step_id
  AND s.actual_minutes IS NULL;
