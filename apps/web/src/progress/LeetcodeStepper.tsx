import { useEffect, useState } from "react";

export default function LeetcodeStepper({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled?: boolean;
  onCommit: (next: number) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  async function commit(next: number) {
    const clamped = Math.max(0, Math.floor(next));
    if (clamped === value) {
      setDraft(String(value));
      return;
    }
    setBusy(true);
    try {
      await onCommit(clamped);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="progress-lc-stepper">
      <button
        type="button"
        className="secondary"
        disabled={disabled || busy || value <= 0}
        onClick={() => void commit(value - 1)}
        aria-label="Decrease LeetCode count"
      >
        −
      </button>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        disabled={disabled || busy}
        value={draft}
        aria-label="LeetCode count"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const parsed = Number(draft);
          if (!Number.isFinite(parsed)) {
            setDraft(String(value));
            return;
          }
          void commit(parsed);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            (event.target as HTMLInputElement).blur();
          }
        }}
      />
      <button
        type="button"
        className="secondary"
        disabled={disabled || busy}
        onClick={() => void commit(value + 1)}
        aria-label="Increase LeetCode count"
      >
        +
      </button>
    </div>
  );
}
