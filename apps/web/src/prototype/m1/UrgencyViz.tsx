import { useEffect, useState } from "react";

const HALF_DAY_MS = 12 * 3600_000;
const MAX_CHUNKS = 14;

function urgencyTone(ms: number): "overdue" | "urgent" | "soon" | "ok" {
  if (ms <= 0) return "overdue";
  if (ms < 6 * 3600_000) return "urgent";
  if (ms < 24 * 3600_000) return "soon";
  return "ok";
}

export function formatLiveCountdown(ms: number): string {
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

function useRemainingMs(dueAt: string | null | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!dueAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [dueAt]);
  if (!dueAt) return null;
  return new Date(dueAt).getTime() - now;
}

type CircleSpec = { key: number; fill: number };

/** Full circles for each complete 12h, last circle = exact pie fraction. No empty trailing circles. */
export function buildDeadlineCircles(ms: number): CircleSpec[] {
  if (ms <= 0) return [];
  const capped = Math.min(ms, MAX_CHUNKS * HALF_DAY_MS);
  const full = Math.floor(capped / HALF_DAY_MS);
  const frac = (capped % HALF_DAY_MS) / HALF_DAY_MS;
  const circles: CircleSpec[] = [];
  for (let i = 0; i < full && i < MAX_CHUNKS; i++) {
    circles.push({ key: i, fill: 1 });
  }
  if (full < MAX_CHUNKS && frac > 0.001) {
    circles.push({ key: full, fill: frac });
  }
  // Always show at least a sliver when time remains but < ~minutes into first chunk
  if (circles.length === 0 && ms > 0) {
    circles.push({ key: 0, fill: Math.max(0.04, frac) });
  }
  return circles;
}

function PieCircle({ fill, tone }: { fill: number; tone: string }) {
  const pct = Math.max(0, Math.min(1, fill)) * 100;
  return (
    <span
      className={`proto-pie proto-pie-${tone}`}
      style={{
        background: `conic-gradient(var(--proto-pie-fill) ${pct}%, var(--proto-pie-empty) 0)`,
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Inline deadline urgency: precise 12h pie-circles + live countdown.
 * Hidden when there is no deadline (targets / undated).
 */
export function DeadlineCirclesInline({
  dueAt,
  dueKind,
  countdownFirst = false,
}: {
  dueAt: string | null | undefined;
  dueKind: "deadline" | "target" | null | undefined;
  /** Put countdown before circles instead of after */
  countdownFirst?: boolean;
}) {
  const ms = useRemainingMs(dueKind === "deadline" ? dueAt : null);
  if (dueKind !== "deadline" || dueAt == null || ms == null) return null;

  const tone = urgencyTone(ms);
  const circles = buildDeadlineCircles(ms);
  const countdown = (
    <span className={`proto-inline-countdown proto-urgency-${tone}`}>
      {formatLiveCountdown(ms)}
    </span>
  );
  const pies =
    circles.length > 0 ? (
      <span className={`proto-pies proto-urgency-${tone}`} aria-hidden="true">
        {circles.map((c) => (
          <PieCircle key={c.key} fill={c.fill} tone={tone} />
        ))}
      </span>
    ) : null;

  return (
    <span className="proto-deadline-inline">
      {countdownFirst ? (
        <>
          {countdown}
          {pies}
        </>
      ) : (
        <>
          {pies}
          {countdown}
        </>
      )}
    </span>
  );
}

/** Kept for older variant comparison if needed */
export function WeekMaxBar({ dueAt }: { dueAt: string }) {
  const ms = useRemainingMs(dueAt) ?? 0;
  const tone = urgencyTone(ms);
  const weekMs = 7 * 24 * 3600_000;
  const pct = ms <= 0 ? 0 : Math.min(100, (ms / weekMs) * 100);
  return (
    <div className={`proto-urgency proto-urgency-${tone}`}>
      <div className="proto-urgency-bar-track" aria-hidden="true">
        <span className="proto-urgency-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="proto-urgency-meta">
        <span className="proto-urgency-countdown">{formatLiveCountdown(ms)}</span>
        <span className="muted proto-urgency-hint">legacy · bar max = 1 week</span>
      </div>
    </div>
  );
}
