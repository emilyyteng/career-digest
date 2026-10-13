-- Repair earns whose `amount` was mutated by early adjustEarnAmount.
-- Keep historical earn.amount = original_amount; current value in meta.current_amount
-- so SUM(points_events.amount) matches balance (earn + adjusts, no double-count).

UPDATE points_events
SET
  meta = meta || jsonb_build_object(
    'current_amount', amount,
    'original_amount', COALESCE((meta->>'original_amount')::integer, amount)
  ),
  amount = COALESCE((meta->>'original_amount')::integer, amount)
WHERE kind = 'earn'
  AND meta ? 'last_adjusted_at'
  AND meta ? 'original_amount'
  AND amount IS DISTINCT FROM (meta->>'original_amount')::integer;
