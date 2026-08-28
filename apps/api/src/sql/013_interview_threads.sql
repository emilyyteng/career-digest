CREATE TABLE IF NOT EXISTS interview_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_application_id uuid NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  resolution text,
  label text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS application_thread_members (
  thread_id uuid NOT NULL REFERENCES interview_threads (id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  PRIMARY KEY (thread_id, application_id),
  UNIQUE (application_id)
);

CREATE TABLE IF NOT EXISTS application_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES interview_threads (id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'custom',
  title text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  due_at timestamptz,
  scheduled_at timestamptz,
  url text,
  notes text,
  prep_notes text,
  sort_order int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS application_steps_thread_order
  ON application_steps (thread_id, sort_order);
