/**
 * M5-11 unlock moment: modal with Great work! and Balance: N (M5-07 Q3).
 */
import type { AchievementUnlock } from "../../api";

export default function AchievementUnlockModal({
  unlock,
  onDismiss,
}: {
  unlock: AchievementUnlock;
  onDismiss: () => void;
}) {
  return (
    <div className="achievement-unlock-modal" role="dialog" aria-modal="true" aria-label="Achievement unlocked">
      <div className="achievement-unlock-card">
        <h3>Achievement unlocked</h3>
        <p className="muted" style={{ margin: 0 }}>
          {unlock.label}
        </p>
        <p className="achievement-unlock-pts">+{unlock.points}</p>
        <p className="achievement-unlock-balance">Balance: {unlock.balanceAfter}</p>
        <button type="button" className="secondary ui-btn-primary" onClick={onDismiss}>
          Great work!
        </button>
      </div>
    </div>
  );
}
