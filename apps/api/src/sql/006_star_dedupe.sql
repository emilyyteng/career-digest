-- One-time cleanup of extra starred tracker rows for lookalike Simplify listings.
-- Jobs are no longer collapsed in the UI; identical-looking postings stay separate.
WITH ranked AS (
  SELECT a.id,
    ROW_NUMBER() OVER (
      PARTITION BY
        lower(p.title),
        lower(COALESCE(
          CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
          c.name
        )),
        lower(COALESCE(p.location, ''))
      ORDER BY a.created_at
    ) AS rn
  FROM applications a
  JOIN postings p ON p.id = a.posting_id
  JOIN companies c ON c.id = p.company_id
  WHERE a.status = 'starred'
)
DELETE FROM applications WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
