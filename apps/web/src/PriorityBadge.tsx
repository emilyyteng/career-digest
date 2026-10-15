import type { TaskPriority } from "./api";
import Badge from "./ui/Badge";

const LABELS: Record<TaskPriority, string> = {
  0: "P0",
  1: "P1",
  2: "P2",
};

const TONE = {
  0: "p0",
  1: "p1",
  2: "p2",
} as const;

export default function PriorityBadge({
  priority,
  className = "",
}: {
  priority: TaskPriority | null | undefined;
  className?: string;
}) {
  if (priority !== 0 && priority !== 1 && priority !== 2) return null;
  return (
    <Badge
      tone={TONE[priority]}
      size="compact"
      className={className}
      title={`Priority ${LABELS[priority]}`}
    >
      {LABELS[priority]}
    </Badge>
  );
}

export function PrioritySelect({
  value,
  onChange,
  allowEmpty = true,
  emptyLabel = "None",
  id,
  disabled,
}: {
  value: TaskPriority | null;
  onChange: (value: TaskPriority | null) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      value={value == null ? "" : String(value)}
      disabled={disabled}
      onChange={(event) => {
        const raw = event.target.value;
        if (raw === "") onChange(null);
        else onChange(Number(raw) as TaskPriority);
      }}
    >
      {allowEmpty && <option value="">{emptyLabel}</option>}
      <option value="0">P0</option>
      <option value="1">P1</option>
      <option value="2">P2</option>
    </select>
  );
}
