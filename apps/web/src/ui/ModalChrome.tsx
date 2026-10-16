import type { ReactNode } from "react";

/**
 * Inner modal anatomy for use inside `ModalLayer` (F09 M1-12).
 * Order: header → body → footer. Footer actions: secondary then primary.
 */

export function ModalHeader({
  id,
  title,
  children,
  className = "",
}: {
  /** Sets `aria-labelledby` target when `title` is used. */
  id?: string;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`modal-header${className ? ` ${className}` : ""}`}>
      {title != null && <h2 id={id}>{title}</h2>}
      {children}
    </header>
  );
}

export function ModalBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`modal-body${className ? ` ${className}` : ""}`}>{children}</div>
  );
}

/** Footer / action row. Put Cancel (secondary) before Confirm (primary). */
export function ModalFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`modal-footer form-actions${className ? ` ${className}` : ""}`}
    >
      {children}
    </div>
  );
}
