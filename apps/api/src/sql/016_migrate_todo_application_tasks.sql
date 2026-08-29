-- Migrate legacy todo applications into open application tasks (idempotent).
INSERT INTO tasks (
  category,
  status,
  title,
  organization,
  url,
  notes,
  due_at,
  posting_id,
  application_id
)
SELECT
  'application',
  'open',
  COALESCE(a.title, p.title, 'Untitled'),
  COALESCE(
    a.company_name,
    CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
    c.name
  ),
  COALESCE(a.url, p.url),
  a.notes,
  a.due_at,
  a.posting_id,
  a.id
FROM applications a
LEFT JOIN postings p ON p.id = a.posting_id
LEFT JOIN companies c ON c.id = p.company_id
WHERE a.status = 'todo'
  AND NOT EXISTS (
    SELECT 1
    FROM tasks t
    WHERE t.application_id = a.id
      AND t.status = 'open'
      AND t.category = 'application'
  );
