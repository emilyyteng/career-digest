import { useEffect, useState } from "react";

type Props = {
  title: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
};

export default function RerankDialog({ title, pending, onCancel, onConfirm }: Props) {
  const [note, setNote] = useState("");

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
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="rerank-title">
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = note.trim();
            if (!trimmed) return;
            onConfirm(trimmed);
          }}
        >
          <h2 id="rerank-title">Rerank this posting?</h2>
          <p className="muted lede">{title}</p>
          <p className="muted lede">
            Explain why this is not a mismatch (or how it should be scored). The model will
            re-evaluate this role with your note.
          </p>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Why should this be eligible? What did the ranking miss?"
            required
            rows={4}
          />
          <div className="form-actions">
            <button type="button" className="secondary" onClick={onCancel} disabled={pending}>
              Cancel
            </button>
            <button type="submit" className="modal-confirm-btn" disabled={pending || !note.trim()}>
              {pending ? "Queueing…" : "Rerank"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
