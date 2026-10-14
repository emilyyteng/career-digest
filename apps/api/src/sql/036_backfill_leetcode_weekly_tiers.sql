-- Attribute untracked weekly LC progress onto day rows (newest first).
-- Needed for solves logged as weekly before weekly_* columns existed (034).

WITH lc_weeks AS (
  SELECT week_start, progress_count
  FROM weekly_goals
  WHERE slot = 'lc' AND progress_count > 0
),
days AS (
  SELECT
    d.local_date,
    d.count,
    d.easy_count,
    d.hard_count,
    d.weekly_count,
    w.week_start,
    w.progress_count,
    COALESCE(
      SUM(d.count) OVER (
        PARTITION BY w.week_start
        ORDER BY d.local_date DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ),
      0
    ) AS later_count
  FROM leetcode_daily d
  JOIN lc_weeks w
    ON d.local_date >= w.week_start
   AND d.local_date < (w.week_start + 7)
),
alloc AS (
  SELECT
    local_date,
    count,
    easy_count,
    hard_count,
    weekly_count,
    LEAST(
      GREATEST(0, count - weekly_count),
      GREATEST(0, progress_count - later_count)
    )::int AS need
  FROM days
  WHERE weekly_count < count AND progress_count > later_count
),
split AS (
  SELECT
    local_date,
    need,
    -- Prefer medium (untiered remainder), then easy, then hard.
    LEAST(GREATEST(0, count - easy_count - hard_count), need) AS w_med,
    LEAST(
      easy_count,
      GREATEST(0, need - LEAST(GREATEST(0, count - easy_count - hard_count), need))
    ) AS w_easy,
    LEAST(
      hard_count,
      GREATEST(
        0,
        need
          - LEAST(GREATEST(0, count - easy_count - hard_count), need)
          - LEAST(
              easy_count,
              GREATEST(0, need - LEAST(GREATEST(0, count - easy_count - hard_count), need))
            )
      )
    ) AS w_hard
  FROM alloc
  WHERE need > 0
)
UPDATE leetcode_daily AS d
SET weekly_count = s.w_easy + s.w_med + s.w_hard,
    weekly_easy_count = s.w_easy,
    weekly_hard_count = s.w_hard,
    updated_at = now()
FROM split s
WHERE d.local_date = s.local_date;
