import { useEffect, useState } from "react";
import type { TaskDueKind } from "./api";

const HALF_DAY_MS = 12 * 3600_000;
const MAX_CHUNKS = 14;
const FIVE_DAYS_MS = 5 * 24 * 3600_000;

export type DeadlineUrgencyTone = "overdue" | "urgent" | "soon" | "ahead" | "ok";

export function urgencyTone(ms: number): DeadlineUrgencyTone {
  if (ms <= 0) return "overdue";
  if (ms < 6 * 3600_000) return "urgent";
  if (ms < 24 * 3600_000) return "soon";
  if (ms < FIVE_DAYS_MS) return "ahead";
  return "ok";
}

export function formatDeadlineCountdown(ms: number): string {
  if (ms <= 0) return "Overdue";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

/** Full 12h circles + exact pie fraction on the last; no empty trailing circles. */
export function buildDeadlineCircles(ms: number): Array<{ key: number; fill: number }> {
  if (ms <= 0) return [];
  const capped = Math.min(ms, MAX_CHUNKS * HALF_DAY_MS);
  const full = Math.floor(capped / HALF_DAY_MS);
  const frac = (capped % HALF_DAY_MS) / HALF_DAY_MS;
  const circles: Array<{ key: number; fill: number }> = [];
  for (let i = 0; i < full && i < MAX_CHUNKS; i++) {
    circles.push({ key: i, fill: 1 });
  }
  if (full < MAX_CHUNKS && frac > 0.001) {
    circles.push({ key: full, fill: frac });
  }
  if (circles.length === 0 && ms > 0) {
    circles.push({ key: 0, fill: Math.max(0.04, frac) });
  }
  return circles;
}

export function PieCircle({ fill, tone }: { fill: number; tone: string }) {
  const pct = Math.max(0, Math.min(1, fill)) * 100;
  return (
    <span
      className={`deadline-pie deadline-pie-${tone}`}
      style={{
        background: `conic-gradient(var(--deadline-pie-fill) ${pct}%, var(--deadline-pie-empty) 0)`,
      }}
      aria-hidden="true"
    />
  );
}

/** Pie circles only (no countdown text). Updates every second when `endAt` is set. */
export function DeadlineUrgencyPiesOnly({
  endAt,
  className,
}: {
  endAt: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endAt]);

  const ms = new Date(endAt).getTime() - now;
  const tone = urgencyTone(ms);
  const circles = buildDeadlineCircles(ms);
  if (ms <= 0 || circles.length === 0) return null;

  return (
    <span
      className={["deadline-pies", `deadline-tone-${tone}`, className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      {circles.map((c) => (
        <PieCircle key={c.key} fill={c.fill} tone={tone} />
      ))}
    </span>
  );
}

/**
 * Inline 12h pie-circles + countdown for dated tasks (deadline or target).
 * Renders nothing when undated.
 */
export default function DeadlineUrgency({
  dueAt,
  dueKind,
  className,
}: {
  dueAt: string | null | undefined;
  dueKind?: TaskDueKind | null | undefined;
  /** e.g. `deadline-urgency-prominent` for card / home aside sizing */
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const dated = Boolean(dueAt);

  useEffect(() => {
    if (!dated) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [dated, dueAt]);

  // dueKind kept for call-site clarity; urgency treats deadline and target alike.
  void dueKind;

  if (!dueAt) return null;

  const ms = new Date(dueAt).getTime() - now;
  const tone = urgencyTone(ms);
  const circles = buildDeadlineCircles(ms);

  return (
    <span
      className={["deadline-urgency-inline", className].filter(Boolean).join(" ")}
      role="timer"
      aria-live="polite"
    >
      {circles.length > 0 && (
        <span className={`deadline-pies deadline-tone-${tone}`} aria-hidden="true">
          {circles.map((c) => (
            <PieCircle key={c.key} fill={c.fill} tone={tone} />
          ))}
        </span>
      )}
      <span className={`deadline-countdown deadline-tone-${tone}`}>
        {formatDeadlineCountdown(ms)}
      </span>
    </span>
  );
}
