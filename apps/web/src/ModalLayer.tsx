import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  children: ReactNode;
  className?: string;
  onClose?: () => void;
};

/** Full-screen modal shell portaled to document.body. */
export default function ModalLayer({
  children,
  className = "modal",
  onClose,
}: Props) {
  useEffect(() => {
    if (!onClose) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (onClose && event.target === event.currentTarget) onClose();
      }}
    >
      <div className={className} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>,
    document.body,
  );
}
