import type { ReactNode } from "react";
import type { ProgressToday } from "../api";

function Segment({
  met,
  children,
}: {
  met: boolean;
  children: ReactNode;
}) {
  return (
    <span className={met ? "progress-strip-met" : undefined}>{children}</span>
  );
}

/** Shared Home / Progress today strip: colors a segment when that daily goal is met. */
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
      <Segment met={appsMet}>
        {today.applications.earned}/{today.applications.cap} apps
      </Segment>
      {" · "}
      <Segment met={lcMet}>
        {today.leetcode.earned}/{today.leetcode.cap} LC
      </Segment>
      {" · "}
      <Segment met={today.deepWork}>
        {today.deepWork ? "deep work ✓" : "no deep work"}
      </Segment>
    </p>
  );
}
