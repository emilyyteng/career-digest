import { useRef, useState } from "react";
import type { ProgressLane } from "../../api";
import ModalLayer, { type ModalLayerHandle } from "../../ModalLayer";
import { Button, ModalBody, ModalFooter, ModalHeader } from "../../ui";
import OptionalPanel from "./OptionalPanel";
import ReflectionDraftFields, {
  MinutesField,
  emptyReflectionDraft,
  minutesInputFromDraft,
  parseMinutesInput,
  type ReflectionDraft,
} from "./ReflectionDraftFields";

export type CompleteWorkResult = {
  notes: string | null;
  reflection: ReflectionDraft | null;
  /** The work's actual time (misc task or application); blank → null. */
  actualMinutes: number | null;
};

/** Whether the modal asks for the work's actual time, below notes and outside the reflection. */
export type CompleteActualTimeMode = "task" | "off";

type Props = {
  title: string;
  description: string;
  contextLabel?: string;
  confirmLabel: string;
  /** Default reflection lane when the panel is opened. */
  defaultLane?: ProgressLane;
  showNotes?: boolean;
  showReflection?: boolean;
  actualTimeMode?: CompleteActualTimeMode;
  /** Prefill the actual time (typically the task's estimate). */
  estimateMinutes?: number | null;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (result: CompleteWorkResult) => void;
};

type DiscardTarget = "reflection" | "notes" | "both";

export default function CompleteWorkModal({
  title,
  description,
  contextLabel,
  confirmLabel,
  defaultLane = "application",
  showNotes = true,
  showReflection = true,
  actualTimeMode = "task",
  estimateMinutes = null,
  pending = false,
  onCancel,
  onConfirm,
}: Props) {
  const layerRef = useRef<ModalLayerHandle>(null);
  const [notesOn, setNotesOn] = useState(false);
  const [reflectionOn, setReflectionOn] = useState(false);
  const [notes, setNotes] = useState("");
  const [reflection, setReflection] = useState<ReflectionDraft>(() =>
    emptyReflectionDraft(defaultLane),
  );
  const [taskActual, setTaskActual] = useState(() =>
    minutesInputFromDraft(estimateMinutes ?? null),
  );
  const [discardTarget, setDiscardTarget] = useState<DiscardTarget | null>(null);

  const dirty =
    !pending &&
    (notes.trim() !== "" ||
      reflection.body.trim() !== "" ||
      (actualTimeMode === "task" &&
        taskActual.trim() !== minutesInputFromDraft(estimateMinutes ?? null)));

  function buildResult(opts: {
    includeNotes: boolean;
    includeReflection: boolean;
  }): CompleteWorkResult {
    const notesOut =
      opts.includeNotes && notesOn && notes.trim() ? notes.trim() : null;
    const includeReflection =
      opts.includeReflection && reflectionOn && reflection.body.trim() !== "";
    const reflectionOut = includeReflection
      ? { body: reflection.body.trim(), lane: reflection.lane }
      : null;

    return {
      notes: notesOut,
      reflection: reflectionOut,
      actualMinutes: actualTimeMode === "task" ? parseMinutesInput(taskActual) : null,
    };
  }

  function trySubmit() {
    if (pending) return;
    const collapsedNotes = !notesOn && notes.trim() !== "";
    const collapsedReflection = !reflectionOn && reflection.body.trim() !== "";
    if (collapsedNotes && collapsedReflection) {
      setDiscardTarget("both");
      return;
    }
    if (collapsedNotes) {
      setDiscardTarget("notes");
      return;
    }
    if (collapsedReflection) {
      setDiscardTarget("reflection");
      return;
    }
    onConfirm(buildResult({ includeNotes: true, includeReflection: true }));
  }

  function keepEditingDiscard() {
    if (discardTarget === "notes" || discardTarget === "both") setNotesOn(true);
    if (discardTarget === "reflection" || discardTarget === "both") {
      setReflectionOn(true);
    }
    setDiscardTarget(null);
  }

  function confirmDiscardAndSubmit() {
    const target = discardTarget;
    setDiscardTarget(null);
    if (!target) return;
    onConfirm(
      buildResult({
        includeNotes: target === "reflection",
        includeReflection: target === "notes",
      }),
    );
  }

  return (
    <ModalLayer
      ref={layerRef}
      className="modal modal-complete-work"
      labelledBy="complete-work-title"
      dirty={dirty}
      onClose={() => {
        if (!pending) onCancel();
      }}
    >
      <form
        className="complete-work-form"
        onSubmit={(event) => {
          event.preventDefault();
          trySubmit();
        }}
      >
        <ModalHeader id="complete-work-title" title={title}>
          {contextLabel && (
            <p className="muted complete-work-context">{contextLabel}</p>
          )}
        </ModalHeader>
        <ModalBody>
          <p className="muted lede">{description}</p>

          {showReflection && (
            <OptionalPanel
              label="Reflection"
              enabled={reflectionOn}
              onEnabledChange={setReflectionOn}
              disabled={pending}
            >
              <ReflectionDraftFields
                value={reflection}
                onChange={setReflection}
                disabled={pending}
              />
            </OptionalPanel>
          )}

          {showNotes && (
            <OptionalPanel
              label="Notes"
              enabled={notesOn}
              onEnabledChange={setNotesOn}
              disabled={pending}
            >
              <textarea
                rows={4}
                value={notes}
                disabled={pending}
                placeholder="Anything to remember on this application or task…"
                onChange={(event) => setNotes(event.target.value)}
              />
            </OptionalPanel>
          )}

          {actualTimeMode === "task" && (
            <MinutesField value={taskActual} onChange={setTaskActual} disabled={pending} />
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            disabled={pending}
            onClick={() => layerRef.current?.requestClose()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={
              pending ||
              (showReflection && reflectionOn && reflection.body.trim() === "")
            }
          >
            {pending ? "Saving…" : confirmLabel}
          </Button>
        </ModalFooter>
      </form>

      {discardTarget && (
        <div
          className="modal-backdrop modal-backdrop-nested"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          <div className="modal modal-compact" role="alertdialog" aria-modal="true">
            <ModalHeader>
              <h3>
                {discardTarget === "both"
                  ? "Discard reflection/notes?"
                  : discardTarget === "reflection"
                    ? "Discard reflection?"
                    : "Discard notes?"}
              </h3>
            </ModalHeader>
            <ModalBody>
              <p className="muted">
                {discardTarget === "both"
                  ? "Reflection and notes are collapsed but still have text. Discard them to continue, or keep editing."
                  : discardTarget === "reflection"
                    ? "Reflection is collapsed but still has text. Discard it to continue, or keep editing."
                    : "Notes are collapsed but still have text. Discard them to continue, or keep editing."}
              </p>
            </ModalBody>
            <ModalFooter>
              <Button type="button" onClick={keepEditingDiscard}>
                Keep editing
              </Button>
              <Button type="button" variant="primary" onClick={confirmDiscardAndSubmit}>
                Discard
              </Button>
            </ModalFooter>
          </div>
        </div>
      )}
    </ModalLayer>
  );
}
