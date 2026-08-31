import type { ProgressToday } from "../api";

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

function LaneMark({ met }: { met: boolean }) {
  return (
    <span
      className={met ? "progress-strip-check" : "progress-strip-miss"}
      aria-hidden="true"
    >
      {met ? "✓" : "_"}
    </span>
  );
}

/** Shared Home / Progress today strip with per-goal ✓ / _ markers. */
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
  const anyDeepWork = today.effortApplication || today.effortTechnical;

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
      <span className="progress-strip-deep-work">
        {anyDeepWork ? "deep work" : "no deep work"}
        {" "}
        <LaneMark met={today.effortApplication} />
        {anyDeepWork ? null : " "}
        <LaneMark met={today.effortTechnical} />
      </span>
    </p>
  );
}
