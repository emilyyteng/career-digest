import { useEffect, useState, type ReactNode } from "react";

function readSeen(storageKey: string): boolean {
  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

function writeSeen(storageKey: string) {
  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {
    /* private mode: may reappear next visit */
  }
}

type Props = {
  /** Stable per-event key, e.g. `weekly-congrats-seen:2026-10-05`. */
  storageKey: string;
  children: ReactNode;
  className?: string;
};

/**
 * Design-system one-time notice (R5.18 / M5-02): persists “seen” in localStorage
 * as soon as it is shown; × only hides it for the current view. Contrast with
 * `EarnFlash`, which auto-hides and does not persist.
 */
export default function OneTimeNotice({ storageKey, children, className }: Props) {
  const [visible, setVisible] = useState(() => !readSeen(storageKey));

  useEffect(() => {
    if (visible) writeSeen(storageKey);
  }, [visible, storageKey]);

  if (!visible) return null;

  return (
    <div className={className ?? "one-time-notice"} role="status">
      <div className="one-time-notice-body">{children}</div>
      <button
        type="button"
        className="earn-flash-dismiss one-time-notice-dismiss"
        aria-label="Dismiss"
        onClick={() => setVisible(false)}
      >
        ×
      </button>
    </div>
  );
}
