import type { ReactNode } from "react";

/**
 * Collapsible panel with light-purple bar + toggle (complete-modal family).
 * Collapse keeps typed text; toggle and bar click both expand/collapse.
 */
type Props = {
  label: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
};

export default function OptionalPanel({
  label,
  enabled,
  onEnabledChange,
  disabled,
  children,
}: Props) {
  return (
    <div className={`complete-optional-panel${enabled ? " is-open" : ""}`}>
      <button
        type="button"
        className="complete-optional-bar"
        disabled={disabled}
        aria-expanded={enabled}
        onClick={() => onEnabledChange(!enabled)}
      >
        <span>{label}</span>
        <span
          className={
            enabled ? "complete-optional-toggle is-on" : "complete-optional-toggle"
          }
          aria-hidden="true"
        >
          <span className="complete-optional-toggle-knob" />
        </span>
      </button>
      {enabled && <div className="complete-optional-body">{children}</div>}
    </div>
  );
}
