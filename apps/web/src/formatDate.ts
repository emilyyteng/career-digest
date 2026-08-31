export function formatShortDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

export function formatStepWhen(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const datePart = formatShortDate(value);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (hours === 0 && minutes === 0) return datePart;
  const h = String(hours).padStart(2, "0");
  const m = String(minutes).padStart(2, "0");
  return `${datePart} ${h}:${m}`;
}

/** Prominent deadline line for interview cards. */
export function formatDeadlineLong(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function stepDeadlineAt(step: {
  dueAt: string | null;
  scheduledAt: string | null;
  status: string;
}): string | null {
  if (step.status === "scheduled" && step.scheduledAt) return step.scheduledAt;
  return step.dueAt;
}

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  overdue: boolean;
  urgent: boolean;
};

export function getCountdownParts(target: string | null | undefined): CountdownParts | null {
  if (!target) return null;
  const end = new Date(target).getTime();
  if (Number.isNaN(end)) return null;
  let diff = end - Date.now();
  const overdue = diff < 0;
  if (overdue) diff = -diff;
  const urgent = !overdue && diff < 24 * 60 * 60 * 1000;
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, overdue, urgent };
}

/** Combine local date + optional time into ISO for API. */
export function combineDateAndTime(date: string, time: string): string | null {
  if (!date.trim()) return null;
  const t = time.trim() || "12:00";
  const local = new Date(`${date}T${t}:00`);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

export function applyByLabel(value: string | null | undefined): string | null {
  const formatted = formatDeadlineLong(value);
  if (!formatted) return null;
  return `Apply by: ${formatted}`;
}

export function dueLabel(value: string | null | undefined): string | null {
  const formatted = formatDeadlineLong(value);
  if (!formatted) return null;
  return `Due: ${formatted}`;
}

/** Default apply-by time when none is set (end of day). */
export const DEFAULT_APPLY_BY_TIME = "23:59";

/** Local time for apply-by `<input type="time">` (defaults to end of day). */
export function applyByTimeInputValue(value: string | null | undefined): string {
  const time = toTimeInputValue(value);
  return time || DEFAULT_APPLY_BY_TIME;
}

/** Combine apply-by date + time for API (empty time → 11:59 PM). */
export function combineApplyByDateTime(date: string, time: string): string | null {
  if (!date.trim()) return null;
  return combineDateAndTime(date, time.trim() || DEFAULT_APPLY_BY_TIME);
}

/** Local time for `<input type="time">`. */
export function toTimeInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** Local calendar date for `<input type="date">`. */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
