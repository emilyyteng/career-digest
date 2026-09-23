import { useRef, useState } from "react";
import ModalLayer, { type ModalLayerHandle } from "../../ModalLayer";

type Props = {
  title: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
};

export default function RerankDialog({ title, pending, onCancel, onConfirm }: Props) {
  const layerRef = useRef<ModalLayerHandle>(null);
  const [note, setNote] = useState("");
  const dirty = !pending && note.trim() !== "";

  return (
    <ModalLayer
      ref={layerRef}
      labelledBy="rerank-title"
      dirty={dirty}
      onClose={() => {
        if (!pending) onCancel();
      }}
    >
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
          <button
            type="button"
            className="secondary"
            onClick={() => layerRef.current?.requestClose()}
            disabled={pending}
          >
            Cancel
          </button>
          <button type="submit" className="modal-confirm-btn" disabled={pending || !note.trim()}>
            {pending ? "Queueing…" : "Rerank"}
          </button>
        </div>
      </form>
    </ModalLayer>
  );
}
