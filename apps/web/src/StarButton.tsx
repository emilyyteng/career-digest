import type { MouseEvent } from "react";

type Props = {
  starred: boolean;
  disabled?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

export default function StarButton({ starred, disabled, onClick }: Props) {
  return (
    <button
      type="button"
      className={starred ? "star on" : "star"}
      aria-pressed={starred}
      aria-label={starred ? "Unstar" : "Star"}
      disabled={disabled}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    </button>
  );
}
