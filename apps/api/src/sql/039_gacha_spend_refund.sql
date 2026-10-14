-- F08 M7-02: ledger kinds spend/refund and category gacha for Cat Cake pulls.

ALTER TABLE points_events DROP CONSTRAINT IF EXISTS points_events_kind_check;
ALTER TABLE points_events
  ADD CONSTRAINT points_events_kind_check CHECK (
    kind IN ('earn', 'reverse', 'adjust', 'spend', 'refund')
  );

ALTER TABLE points_events DROP CONSTRAINT IF EXISTS points_events_category_check;
ALTER TABLE points_events
  ADD CONSTRAINT points_events_category_check CHECK (
    category IN (
      'task',
      'application',
      'leetcode',
      'interview',
      'reflection',
      'weekly_goal',
      'achievement',
      'streak',
      'gacha'
    )
  );
