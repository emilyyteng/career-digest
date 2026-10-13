import { LaneChips } from "../progress/ReflectionAccordion";
import type { ProgressLane } from "../../api";

/** Reflections carry no time; time belongs to the work (R5.31). */
export type ReflectionDraft = {
  body: string;
  lane: ProgressLane;
};

export function emptyReflectionDraft(lane: ProgressLane = "application"): ReflectionDraft {
  return { body: "", lane };
}

export function MinutesField({
  value,
  onChange,
  disabled,
  label = "Actual time (min)",
  placeholder = "0",
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}) {
  return (
    <label className="reflection-minutes-field">
      <span className="reflection-minutes-label">{label}</span>
      <input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function minutesInputFromDraft(minutes: number | null | undefined): string {
  return minutes == null ? "" : String(minutes);
}

export function parseMinutesInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

type Props = {
  value: ReflectionDraft;
  onChange: (next: ReflectionDraft) => void;
  disabled?: boolean;
  placeholder?: string;
};

/** Shared reflection editor: body + lane. */
export default function ReflectionDraftFields({
  value,
  onChange,
  disabled,
  placeholder = "What did you work through?",
}: Props) {
  return (
    <div className="complete-reflection-fields">
      <textarea
        rows={4}
        value={value.body}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange({ ...value, body: event.target.value })}
      />
      <div className="progress-compose-meta">
        <LaneChips
          value={value.lane}
          disabled={disabled}
          onChange={(lane) => onChange({ ...value, lane })}
        />
      </div>
    </div>
  );
}
