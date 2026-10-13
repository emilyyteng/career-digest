-- Repair earns whose `amount` was zeroed by early reverseEarn.
-- Keep historical earn.amount = original_amount so category SUM(amount) nets
-- the earn against its reverse event instead of subtracting it twice.
-- Idempotent: repaired rows no longer have amount = 0.

UPDATE points_events
SET amount = COALESCE(
  (meta->>'original_amount')::integer,
  (meta->>'reversed_amount')::integer
)
WHERE kind = 'earn'
  AND COALESCE((meta->>'superseded')::boolean, false) = true
  AND amount = 0
  AND COALESCE(
    (meta->>'original_amount')::integer,
    (meta->>'reversed_amount')::integer,
    0
  ) > 0;
