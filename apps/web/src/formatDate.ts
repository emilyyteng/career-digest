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
};

export function getCountdownParts(target: string | null | undefined): CountdownParts | null {
  if (!target) return null;
  const end = new Date(target).getTime();
  if (Number.isNaN(end)) return null;
  let diff = end - Date.now();
  const overdue = diff < 0;
  if (overdue) diff = -diff;
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, overdue };
}

/** Combine local date + optional time into ISO for API. */
export function combineDateAndTime(date: string, time: string): string | null {
  if (!date.trim()) return null;
  const t = time.trim() || "12:00";
  const local = new Date(`${date}T${t}:00`);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
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
