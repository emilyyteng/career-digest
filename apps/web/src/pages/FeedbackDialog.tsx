import { useEffect, useState } from "react";

type Kind = "like" | "dismiss" | "unlike";

type Props = {
  kind: Kind;
  title: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
};

const COPY: Record<Kind, { heading: string; lede: string; confirm: string; note: string }> = {
  like: {
    heading: "Like this role?",
    lede: "This tells ranking that you want more postings like this. It stays on Jobs.",
    confirm: "Like",
    note: "What makes this a good example? (optional)",
  },
  dismiss: {
    heading: "Mark as mismatch?",
    lede: "Marks this as a mismatch and saves your note for future rankings. Review mismatches on the Mismatches tab.",
    confirm: "Mark mismatch",
    note: "Why doesn't this fit? (optional)",
  },
  unlike: {
    heading: "Remove this like?",
    lede: "The posting stays on Jobs. Ranking will stop using it as a positive example.",
    confirm: "Remove like",
    note: "",
  },
};

export default function FeedbackDialog({
  kind,
  title,
  pending,
  onCancel,
  onConfirm,
}: Props) {
  const copy = COPY[kind];
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
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm(note.trim());
          }}
        >
          <h2 id="feedback-title">{copy.heading}</h2>
          <p className="muted lede">{title}</p>
          <p className="muted lede">{copy.lede}</p>
          {copy.note && (
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={copy.note}
            />
          )}
          <div className="form-actions">
            <button type="button" className="secondary" onClick={onCancel} disabled={pending}>
              Cancel
            </button>
            <button type="submit" disabled={pending}>
              {pending ? "Saving…" : copy.confirm}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
