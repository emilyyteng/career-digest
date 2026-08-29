CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('application', 'school', 'personal')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed')),
  title text NOT NULL,
  organization text,
  url text,
  notes text,
  due_at timestamptz,
  posting_id uuid REFERENCES postings (id) ON DELETE SET NULL,
  application_id uuid REFERENCES applications (id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_status_category_idx ON tasks (status, category);
CREATE INDEX IF NOT EXISTS tasks_due_at_idx ON tasks (due_at);

CREATE UNIQUE INDEX IF NOT EXISTS tasks_one_open_application_per_posting_idx
  ON tasks (posting_id)
  WHERE status = 'open' AND posting_id IS NOT NULL AND category = 'application';
