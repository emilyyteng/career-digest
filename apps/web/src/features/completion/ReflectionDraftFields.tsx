import {
  DeepWorkToggle,
  LaneChips,
} from "../progress/ReflectionAccordion";
import type { ProgressLane } from "../../api";

export type ReflectionDraft = {
  body: string;
  lane: ProgressLane;
  deepWork: boolean;
  /** Minutes attached to this reflection (points); blank → null. */
  actualMinutes: number | null;
};

/** How minutes relate to the reflection block (prototype A). */
export type ReflectionMinutesMode =
  /** Progress compose: minutes always under meta. */
  | "standalone"
  /** App / interview complete: minutes only when this reflection panel is shown. */
  | "with-reflection"
  /** Misc task: minutes live outside this block (task actual). */
  | "none";

export function emptyReflectionDraft(lane: ProgressLane = "application"): ReflectionDraft {
  return {
    body: "",
    lane,
    deepWork: true,
    actualMinutes: null,
  };
}

export function MinutesField({
  value,
  onChange,
  disabled,
  label = "Time (min)",
  placeholder = "20",
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
  /**
   * `standalone` — always show minutes (Progress).
   * `with-reflection` — show minutes under meta (host only mounts when reflection on).
   * `none` — no minutes in this block (misc task uses outer actual field).
   */
  minutesMode?: ReflectionMinutesMode;
};

/** Shared reflection editor: body + lane + deep work + optional minutes. */
export default function ReflectionDraftFields({
  value,
  onChange,
  disabled,
  placeholder = "What did you work through?",
  minutesMode = "none",
}: Props) {
  const showMinutes = minutesMode === "standalone" || minutesMode === "with-reflection";
  const minutesStr = minutesInputFromDraft(value.actualMinutes);

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
        <DeepWorkToggle
          value={value.deepWork}
          disabled={disabled}
          onChange={(deepWork) => onChange({ ...value, deepWork })}
        />
      </div>
      {showMinutes && (
        <MinutesField
          value={minutesStr}
          disabled={disabled}
          placeholder="20"
          onChange={(next) =>
            onChange({ ...value, actualMinutes: parseMinutesInput(next) })
          }
        />
      )}
    </div>
  );
}
