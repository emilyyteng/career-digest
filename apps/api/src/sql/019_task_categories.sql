-- User-defined misc task categories + system Applications category.
-- tasks.category becomes a kind discriminant: application | misc.
-- tasks.category_id points at the display category (Applications / School / …).

CREATE TABLE IF NOT EXISTS task_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('application', 'misc')),
  system boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS task_categories_one_application_kind_idx
  ON task_categories (kind)
  WHERE kind = 'application';

CREATE UNIQUE INDEX IF NOT EXISTS task_categories_name_lower_idx
  ON task_categories (lower(name));

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES task_categories (id);

-- Drop legacy check before rewriting category values to 'misc'.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_category_check;

DO $$
DECLARE
  apps_id uuid;
  school_id uuid;
  reading_id uuid;
  writing_id uuid;
  admin_id uuid;
BEGIN
  SELECT id INTO apps_id FROM task_categories WHERE kind = 'application' LIMIT 1;
  IF apps_id IS NULL THEN
    INSERT INTO task_categories (name, kind, system, sort_order)
    VALUES ('Applications', 'application', true, 0)
    RETURNING id INTO apps_id;
  END IF;

  SELECT id INTO school_id FROM task_categories WHERE lower(name) = 'school' LIMIT 1;
  IF school_id IS NULL THEN
    INSERT INTO task_categories (name, kind, system, sort_order)
    VALUES ('School', 'misc', false, 10)
    RETURNING id INTO school_id;
  END IF;

  SELECT id INTO reading_id FROM task_categories WHERE lower(name) = 'reading' LIMIT 1;
  IF reading_id IS NULL THEN
    INSERT INTO task_categories (name, kind, system, sort_order)
    VALUES ('Reading', 'misc', false, 20)
    RETURNING id INTO reading_id;
  END IF;

  SELECT id INTO writing_id FROM task_categories WHERE lower(name) = 'writing' LIMIT 1;
  IF writing_id IS NULL THEN
    INSERT INTO task_categories (name, kind, system, sort_order)
    VALUES ('Writing', 'misc', false, 30)
    RETURNING id INTO writing_id;
  END IF;

  SELECT id INTO admin_id FROM task_categories WHERE lower(name) = 'admin' LIMIT 1;
  IF admin_id IS NULL THEN
    INSERT INTO task_categories (name, kind, system, sort_order)
    VALUES ('Admin', 'misc', false, 40)
    RETURNING id INTO admin_id;
  END IF;

  UPDATE tasks SET category_id = apps_id WHERE category = 'application' AND category_id IS NULL;
  UPDATE tasks SET category_id = school_id WHERE category = 'school' AND category_id IS NULL;
  UPDATE tasks SET category_id = admin_id WHERE category = 'personal' AND category_id IS NULL;
  UPDATE tasks SET category_id = admin_id WHERE category_id IS NULL;

  UPDATE tasks SET category = 'misc' WHERE category IN ('school', 'personal');
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_category_check'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_category_check CHECK (category IN ('application', 'misc'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM tasks WHERE category_id IS NULL) THEN
    RAISE EXCEPTION 'tasks.category_id backfill left null rows';
  END IF;
END $$;

ALTER TABLE tasks ALTER COLUMN category_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_category_id_idx ON tasks (category_id);
