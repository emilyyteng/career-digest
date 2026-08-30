import { useEffect, useState } from "react";

type Props = {
  title: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (notes: string) => void;
};

export default function MarkAppliedDialog({
  title,
  pending,
  onCancel,
  onConfirm,
}: Props) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mark-applied-title">
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm(notes.trim());
          }}
        >
          <h2 id="mark-applied-title">Mark as applied?</h2>
          <p className="muted lede">{title}</p>
          <p className="muted lede">
            This removes the role from Jobs and moves it to Applications.
          </p>
          <label className="mark-applied-notes-label">
            <span>Notes (optional)</span>
            <textarea
              value={notes}
              placeholder="Paste application questions, answers, or anything to remember…"
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <div className="form-actions">
            <button type="button" className="secondary" onClick={onCancel} disabled={pending}>
              Cancel
            </button>
            <button type="submit" className="modal-confirm-btn" disabled={pending}>
              {pending ? "Saving…" : "Mark applied"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
