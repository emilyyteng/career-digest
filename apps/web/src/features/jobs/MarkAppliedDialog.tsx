import { useRef, useState } from "react";
import ModalLayer, { type ModalLayerHandle } from "../../ModalLayer";

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
  const layerRef = useRef<ModalLayerHandle>(null);
  const [notes, setNotes] = useState("");
  const dirty = !pending && notes.trim() !== "";

  return (
    <ModalLayer
      ref={layerRef}
      labelledBy="mark-applied-title"
      dirty={dirty}
      onClose={() => {
        if (!pending) onCancel();
      }}
    >
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
          <button
            type="button"
            className="secondary"
            onClick={() => layerRef.current?.requestClose()}
            disabled={pending}
          >
            Cancel
          </button>
          <button type="submit" className="modal-confirm-btn" disabled={pending}>
            {pending ? "Saving…" : "Mark applied"}
          </button>
        </div>
      </form>
    </ModalLayer>
  );
}
