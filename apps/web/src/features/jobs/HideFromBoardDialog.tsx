import { useEffect, useMemo, useRef, useState } from "react";
import ModalLayer, { type ModalLayerHandle } from "../../ModalLayer";

export type HideBoardSibling = {
  id: string;
  title: string;
  company: string;
  feedbackKind: string | null;
};

type Props = {
  employer: string;
  jobs: HideBoardSibling[];
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (postingIds: string[]) => void;
};

export default function HideFromBoardDialog({
  employer,
  jobs,
  pending,
  onCancel,
  onConfirm,
}: Props) {
  const layerRef = useRef<ModalLayerHandle>(null);
  const initialIds = useMemo(() => jobs.map((job) => job.id).join(","), [jobs]);
  const [selectedIds, setSelectedIds] = useState(() => jobs.map((job) => job.id));

  useEffect(() => {
    setSelectedIds(jobs.map((job) => job.id));
  }, [jobs]);

  const selected = jobs.filter((job) => selectedIds.includes(job.id));
  const dirty = !pending && selectedIds.join(",") !== initialIds;

  return (
    <ModalLayer
      ref={layerRef}
      className="modal hide-board-modal"
      labelledBy="hide-board-title"
      dirty={dirty}
      onClose={() => {
        if (!pending) onCancel();
      }}
    >
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          if (selectedIds.length === 0) return;
          onConfirm(selectedIds);
        }}
      >
        <h2 id="hide-board-title">Hide {employer} from board?</h2>
        <p className="muted lede">
          Moves the roles below to Mismatches without teaching the ranker. Remove any you want to
          keep. Future roles from {employer} can still appear later.
        </p>
        {selected.length === 0 ? (
          <p className="muted">Nothing left to hide. Cancel to keep these roles on Ranked.</p>
        ) : (
          <ul className="hide-board-list">
            {selected.map((job) => (
              <li key={job.id}>
                <span>
                  {job.title}
                  {job.feedbackKind === "like" ? " · liked" : ""}
                </span>
                <button
                  type="button"
                  className="hide-board-remove"
                  aria-label={`Keep ${job.title}`}
                  disabled={pending}
                  onClick={() =>
                    setSelectedIds((prev) => prev.filter((id) => id !== job.id))
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => layerRef.current?.requestClose()}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="modal-confirm-btn"
            disabled={pending || selectedIds.length === 0}
          >
            {pending
              ? "Hiding…"
              : `Hide ${selectedIds.length} role${selectedIds.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </form>
    </ModalLayer>
  );
}
