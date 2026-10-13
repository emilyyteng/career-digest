import type { ProgressToday } from "../../api";

function SegmentMark({ met }: { met: boolean }) {
  return (
    <span
      className={met ? "progress-strip-check" : "progress-strip-miss"}
      aria-hidden="true"
    >
      {" "}
      {met ? "✓" : "_"}
    </span>
  );
}

function DeepWorkBadge({
  label,
  met,
}: {
  label: string;
  met: boolean;
}) {
  return (
    <span className={met ? "progress-strip-badge is-on" : "progress-strip-badge"}>
      {label}
      {met ? " ✓" : ""}
    </span>
  );
}

/** Shared Home / Progress today strip with per-goal ✓ / O markers + deep-work badges. */
export default function TodayStrip({
  today,
  prefix,
  className = "progress-today-strip",
}: {
  today: ProgressToday;
  prefix?: string;
  className?: string;
}) {
  const appsMet = today.applications.earned >= today.applications.cap;
  const lcMet = today.leetcode.earned >= today.leetcode.cap;
  const anyDeepWork =
    today.effortApplication || today.effortTechnical || today.effortOther;

  return (
    <p className={className}>
      {prefix}
      <span>
        {today.applications.earned}/{today.applications.cap} apps
        <SegmentMark met={appsMet} />
      </span>
      {" · "}
      <span>
        {today.leetcode.earned}/{today.leetcode.cap} LC
        <SegmentMark met={lcMet} />
      </span>
      {" · "}
      <span className={`progress-strip-deep-work${anyDeepWork ? " is-active" : ""}`}>
        deep work{" "}
        <span className="progress-strip-badges">
          <DeepWorkBadge label="app" met={today.effortApplication} />
          <DeepWorkBadge label="tech" met={today.effortTechnical} />
          <DeepWorkBadge label="other" met={today.effortOther} />
        </span>
      </span>
    </p>
  );
}
