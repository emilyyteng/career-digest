import { useEffect, useState } from "react";

type Kind = "like" | "dismiss" | "unlike";

export type FeedbackConfirm = {
  note: string;
  teach: boolean;
};

type Props = {
  kind: Kind;
  title: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (result: FeedbackConfirm) => void;
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
    lede: "Moves this posting to the Mismatches tab. With ranking feedback on, your note teaches future rankings and re-ingest won't re-rank it.",
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
  const [teach, setTeach] = useState(true);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const showNote = Boolean(copy.note) && (kind !== "dismiss" || teach);
  const lede =
    kind === "dismiss" && !teach
      ? "Hides this posting on the Mismatches tab without teaching the ranker. Re-ingest won't put it back on Ranked until you Rerank."
      : copy.lede;

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
            onConfirm({
              note: kind === "dismiss" && !teach ? "" : note.trim(),
              teach: kind === "dismiss" ? teach : true,
            });
          }}
        >
          <h2 id="feedback-title">{copy.heading}</h2>
          <p className="muted lede">{title}</p>
          <p className="muted lede">{lede}</p>
          {kind === "dismiss" && (
            <label className="feedback-teach-toggle">
              <input
                type="checkbox"
                checked={teach}
                onChange={(event) => setTeach(event.target.checked)}
              />
              Use as ranking feedback
            </label>
          )}
          {showNote && (
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
            <button type="submit" className="modal-confirm-btn" disabled={pending}>
              {pending ? "Saving…" : copy.confirm}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
