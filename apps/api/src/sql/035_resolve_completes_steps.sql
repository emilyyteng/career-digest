-- Repair: resolving a thread (including via application outcome) left steps on
-- awaiting_employer / pending / scheduled. Align with patchInterviewThread and
-- treat those steps as completed for achievements and the UI.

UPDATE application_steps AS s
SET status = 'completed',
    completed_at = COALESCE(s.completed_at, t.resolved_at, now()),
    updated_at = now()
FROM interview_threads AS t
WHERE s.thread_id = t.id
  AND t.status = 'resolved'
  AND s.status IN ('pending', 'scheduled', 'awaiting_employer');
