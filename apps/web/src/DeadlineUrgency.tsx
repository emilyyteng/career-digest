import { useEffect, useState } from "react";
import type { TaskDueKind } from "./api";

const HALF_DAY_MS = 12 * 3600_000;
const MAX_CHUNKS = 14;
const FIVE_DAYS_MS = 5 * 24 * 3600_000;

/** Severity-4: overdue · soon (pink, under 24h) · ahead (P1 gold) · ok (mint). */
export type DeadlineUrgencyTone = "overdue" | "soon" | "ahead" | "ok";

export function urgencyTone(ms: number): DeadlineUrgencyTone {
  if (ms <= 0) return "overdue";
  if (ms < 24 * 3600_000) return "soon";
  if (ms < FIVE_DAYS_MS) return "ahead";
  return "ok";
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Mono-friendly padded countdown; units joined with `:` (M1-15). */
export function formatDeadlineCountdown(ms: number): string {
  if (ms <= 0) return "Overdue";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}d:${pad2(hours)}h:${pad2(mins)}m`;
  if (hours > 0) return `${pad2(hours)}h:${pad2(mins)}m:${pad2(secs)}s`;
  return `${pad2(mins)}m:${pad2(secs)}s`;
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

function pieSlicePath(cx: number, cy: number, r: number, fill: number): string {
  const clamped = Math.max(0, Math.min(1, fill));
  if (clamped >= 0.999) {
    return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
  }
  const angle = clamped * 2 * Math.PI;
  const x = cx + r * Math.sin(angle);
  const y = cy - r * Math.cos(angle);
  const large = clamped > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x} ${y} Z`;
}

export function PieCircle({ fill, tone }: { fill: number; tone: string }) {
  const cx = 7;
  const cy = 7;
  const r = 5.5;
  return (
    <svg
      className={`deadline-pie deadline-pie-${tone}`}
      width="12"
      height="12"
      viewBox="0 0 14 14"
      aria-hidden="true"
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="var(--deadline-pie-empty)"
        stroke="color-mix(in srgb, var(--deadline-pie-fill) 35%, var(--border))"
        strokeWidth="1"
      />
      <path d={pieSlicePath(cx, cy, r, fill)} fill="var(--deadline-pie-fill)" />
    </svg>
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
