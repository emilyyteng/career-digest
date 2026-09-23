import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Props = {
  children: ReactNode;
  className?: string;
  /** Attempt to dismiss (backdrop down+up, Escape). */
  onClose: () => void;
  /**
   * When true, Escape / backdrop dismiss shows Keep editing / Discard.
   * Confirm-only modals leave this false.
   * Forms that own their discard UI also leave this false and wire onClose → requestClose.
   */
  dirty?: boolean;
  labelledBy?: string;
  backdropClassName?: string;
};

export type ModalLayerHandle = {
  requestClose: () => void;
};

/**
 * Full-screen modal shell portaled to document.body.
 * Backdrop closes only if pointerdown and pointerup both land on the backdrop.
 */
const ModalLayer = forwardRef<ModalLayerHandle, Props>(function ModalLayer(
  {
    children,
    className = "modal",
    onClose,
    dirty = false,
    labelledBy,
    backdropClassName = "modal-backdrop",
  },
  ref,
) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const backdropPointerDown = useRef(false);
  const dirtyRef = useRef(dirty);
  const onCloseRef = useRef(onClose);
  dirtyRef.current = dirty;
  onCloseRef.current = onClose;

  function requestClose() {
    if (dirtyRef.current) {
      setConfirmDiscard(true);
      return;
    }
    onCloseRef.current();
  }

  useImperativeHandle(ref, () => ({ requestClose }), []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setConfirmDiscard((open) => {
        if (open) return false;
        if (dirtyRef.current) return true;
        onCloseRef.current();
        return false;
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function clear() {
      backdropPointerDown.current = false;
    }
    window.addEventListener("pointercancel", clear);
    return () => window.removeEventListener("pointercancel", clear);
  }, []);

  return createPortal(
    <div
      className={backdropClassName}
      onPointerDown={(event) => {
        backdropPointerDown.current = event.target === event.currentTarget;
      }}
      onPointerUp={(event) => {
        const startedOnBackdrop = backdropPointerDown.current;
        backdropPointerDown.current = false;
        if (startedOnBackdrop && event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <div className={className} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
      {confirmDiscard && (
        <div
          className="modal-backdrop modal-backdrop-nested"
          onPointerDown={(event) => {
            event.stopPropagation();
            backdropPointerDown.current = event.target === event.currentTarget;
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            const started = backdropPointerDown.current;
            backdropPointerDown.current = false;
            if (started && event.target === event.currentTarget) {
              setConfirmDiscard(false);
            }
          }}
        >
          <div className="modal modal-compact" role="alertdialog" aria-modal="true">
            <h3>Discard edits?</h3>
            <p className="muted">Unsaved changes will be lost.</p>
            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDiscard(false);
                  onCloseRef.current();
                }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
});

export default ModalLayer;
