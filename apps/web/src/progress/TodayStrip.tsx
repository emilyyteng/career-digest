import type { ProgressToday } from "../api";

function MetCheck() {
  return (
    <span className="progress-strip-check" aria-hidden="true">
      {" "}
      ✓
    </span>
  );
}

/** Shared Home / Progress today strip; sage ✓ marks each met daily goal. */
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

  return (
    <p className={className}>
      {prefix}
      <span>
        {today.applications.earned}/{today.applications.cap} apps
        {appsMet ? <MetCheck /> : null}
      </span>
      {" · "}
      <span>
        {today.leetcode.earned}/{today.leetcode.cap} LC
        {lcMet ? <MetCheck /> : null}
      </span>
      {" · "}
      <span>
        {today.deepWork ? (
          <>
            deep work
            <MetCheck />
          </>
        ) : (
          "no deep work"
        )}
      </span>
    </p>
  );
}
