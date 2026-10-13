import { useEffect } from "react";
import type { PointsEarnInfo } from "../../api";

type Props = {
  earn: PointsEarnInfo | null;
  onDismiss: () => void;
  /** Auto-hide after ms; 0 disables. */
  durationMs?: number;
};

/** Small mint banner after a points-earning action. */
export default function EarnFlash({
  earn,
  onDismiss,
  durationMs = 4200,
}: Props) {
  useEffect(() => {
    if (!earn || durationMs <= 0) return;
    const id = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(id);
  }, [earn, durationMs, onDismiss]);

  if (!earn) return null;

  const line =
    earn.message.trim() ||
    (earn.amount >= 0
      ? `+${earn.amount} points`
      : `${earn.amount} points`);

  return (
    <p className="earn-flash" role="status" aria-live="polite">
      <span className="earn-flash-msg">{line}</span>
      <span className="earn-flash-balance">balance {earn.balanceAfter}</span>
      <button
        type="button"
        className="earn-flash-dismiss"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        ×
      </button>
    </p>
  );
}
