import { useEffect, useState } from "react";
import { getCountdownParts } from "../../formatDate";

function CountdownSegment({ value, unit }: { value: string; unit: string }) {
  return (
    <span className="interview-countdown-segment">
      <span className="interview-countdown-digits">{value}</span>
      <span className="interview-countdown-unit">{unit}</span>
    </span>
  );
}

export default function InterviewCountdown({ target }: { target: string }) {
  const [parts, setParts] = useState(() => getCountdownParts(target));

  useEffect(() => {
    const tick = () => setParts(getCountdownParts(target));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (!parts) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className={[
        "interview-countdown",
        parts.overdue ? "overdue" : "",
        parts.urgent ? "urgent" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="timer"
      aria-live="polite"
    >
      <span className="interview-countdown-label">
        {parts.overdue ? "Overdue" : "Time left"}
      </span>
      <span className="interview-countdown-digits-row">
        <CountdownSegment value={pad(parts.days)} unit="d" />
        <span className="interview-countdown-sep">:</span>
        <CountdownSegment value={pad(parts.hours)} unit="h" />
        <span className="interview-countdown-sep">:</span>
        <CountdownSegment value={pad(parts.minutes)} unit="m" />
        <span className="interview-countdown-sep">:</span>
        <CountdownSegment value={pad(parts.seconds)} unit="s" />
      </span>
    </div>
  );
}
