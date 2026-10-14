-- F08 M7-03: Cat Cake ownership, pity, and CE Day/Night selection.

CREATE TABLE IF NOT EXISTS cat_cake_pity (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  pity integer NOT NULL DEFAULT 0 CHECK (pity >= 0 AND pity <= 1000)
);

INSERT INTO cat_cake_pity (singleton, pity)
VALUES (true, 0)
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS cat_cake_owned (
  flavor_id text NOT NULL,
  edition text NOT NULL CHECK (edition IN ('classic', 'collector')),
  copies integer NOT NULL DEFAULT 0 CHECK (copies >= 0),
  PRIMARY KEY (flavor_id, edition),
  CONSTRAINT cat_cake_owned_flavor_check CHECK (
    flavor_id IN (
      'strawberry',
      'matcha',
      'blueberry',
      'sesame',
      'peach',
      'lemon',
      'cherry',
      'redbean',
      'chocobanana',
      'raspberry',
      'caramel',
      'ube'
    )
  )
);

CREATE TABLE IF NOT EXISTS cat_cake_ce_look (
  flavor_id text PRIMARY KEY,
  selected_look text NOT NULL DEFAULT 'day' CHECK (selected_look IN ('day', 'night')),
  CONSTRAINT cat_cake_ce_look_flavor_check CHECK (
    flavor_id IN (
      'strawberry',
      'matcha',
      'blueberry',
      'sesame',
      'peach',
      'lemon',
      'cherry',
      'redbean',
      'chocobanana',
      'raspberry',
      'caramel',
      'ube'
    )
  )
);
