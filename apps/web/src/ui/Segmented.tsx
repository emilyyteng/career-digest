import type { ReactNode } from "react";
import Button from "./Button";

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
};

type Props<T extends string> = {
  value: T;
  options: ReadonlyArray<SegmentedOption<T>>;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
  className?: string;
};

/** Rounded segmented control; active segment matches ink primary. */
export default function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
  className = "",
}: Props<T>) {
  return (
    <div
      className={`ui-segmented${className ? ` ${className}` : ""}`}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((opt) => (
        <Button
          key={opt.value}
          variant="ghost"
          size="sm"
          role="radio"
          aria-checked={value === opt.value}
          disabled={disabled}
          className={`ui-seg${value === opt.value ? " is-active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
