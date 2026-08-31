import type { MouseEvent } from "react";

type Props = {
  liked: boolean;
  dismissed: boolean;
  disabled?: boolean;
  onLike: (event: MouseEvent<HTMLButtonElement>) => void;
  onDismiss: (event: MouseEvent<HTMLButtonElement>) => void;
};

export default function JobFeedbackButtons({
  liked,
  dismissed,
  disabled,
  onLike,
  onDismiss,
}: Props) {
  return (
    <div className="job-feedback-actions">
      <button
        type="button"
        className={liked ? "job-feedback-btn like on" : "job-feedback-btn like"}
        aria-pressed={liked}
        aria-label={liked ? "Unlike" : "Like"}
        disabled={disabled}
        onClick={onLike}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s-6.2-4.1-8.5-7.4C2.2 11.2 2.6 7.8 5.1 6.3c1.9-1.1 4.1-.6 5.5 1 1.4-1.6 3.6-2.1 5.5-1 2.5 1.5 2.9 4.9 1.6 7.3C18.2 16.9 12 21 12 21z" />
        </svg>
      </button>
      <button
        type="button"
        className={dismissed ? "job-feedback-btn dismiss on" : "job-feedback-btn dismiss"}
        aria-pressed={dismissed}
        aria-label={dismissed ? "Remove mismatch" : "Mark mismatch"}
        disabled={disabled}
        onClick={onDismiss}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            stroke="none"
            d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 21 16 14.83V3zM19 3v12h4V3h-4z"
          />
        </svg>
      </button>
    </div>
  );
}
