type Props = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function StepActionConfirm({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      className="step-action-confirm"
      role="alertdialog"
      aria-labelledby="step-action-title"
      aria-describedby="step-action-desc"
    >
      <h3 id="step-action-title">{title}</h3>
      <p id="step-action-desc" className="muted">{description}</p>
      <div className="form-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="modal-confirm-btn" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  );
}
