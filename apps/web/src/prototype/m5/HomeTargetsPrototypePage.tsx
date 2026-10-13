/**
 * Home Upcoming → Targets section with Sunday weekly goal rows (M5).
 */
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import DeadlineUrgency, { DeadlineUrgencyPiesOnly } from "../../DeadlineUrgency";
import PriorityBadge from "../../PriorityBadge";
import {
  homeSundayTargets,
  homeSundayTargetsMetLc,
  type ProtoHomeWeeklyTarget,
} from "./fixtures";
import PrototypeSwitcher from "../PrototypeSwitcher";
import "../m4/prototype-m4.css";
import "./prototype-m5.css";

const VARIANTS = [
  { key: "A", name: "Interview-style row + Sunday pies" },
  { key: "B", name: "Goal badge + pace in meta" },
  { key: "C", name: "Compact · link to Progress" },
] as const;

/** Fixed demo: end of upcoming Sunday for urgency pies. */
const SUNDAY_END = "2026-03-15T23:59:59.000-07:00";
const SUNDAY_LABEL = "Sun · Mar 15";

function WeeklyTargetRow({
  item,
  variant,
}: {
  item: ProtoHomeWeeklyTarget;
  variant: string;
}) {
  if (item.met) return null;

  const progressLink = "/progress#weekly-goals";

  if (variant === "C") {
    return (
      <li className="home-job-row home-weekly-target-row">
        <Link to={progressLink} className="home-job-main">
          <span className="home-job-title home-upcoming-title task-title-line home-upcoming-title-oneline">
            <span className="proto-m5-target-badge">Goal</span>
            <span className="task-title-text">{item.primary}</span>
          </span>
          <span className="muted home-job-meta">{item.secondary}</span>
        </Link>
      </li>
    );
  }

  if (variant === "B") {
    const behind = item.secondary.includes("behind");
    return (
      <li className="home-job-row home-weekly-target-row home-interview-row">
        <Link to={progressLink} className="home-job-main">
          <span className="home-job-title home-upcoming-title task-title-line home-upcoming-title-oneline">
            <span className="proto-m5-target-badge">
              {item.kind === "weekly_lc" ? "LC" : "Apps"}
            </span>
            <span className="task-title-text">{item.primary}</span>
          </span>
          <span className="muted home-job-meta">
            {item.secondary}
            {behind && (
              <span className="proto-m5-target-pace behind"> · adjust on Progress</span>
            )}
          </span>
        </Link>
        <div className="home-interview-deadline">
          <div className="home-interview-deadline-date">{SUNDAY_LABEL}</div>
          <DeadlineUrgency
            dueAt={SUNDAY_END}
            className="deadline-urgency-prominent deadline-urgency-compact deadline-urgency-home"
          />
        </div>
      </li>
    );
  }

  return (
    <li className="home-job-row home-weekly-target-row home-interview-row">
      <Link to={progressLink} className="home-job-main">
        <span className="home-job-title home-upcoming-title task-title-line">
          <PriorityBadge priority={2} />
          <span className="task-title-text">{item.primary}</span>
        </span>
        <span className="muted home-job-meta">{item.secondary}</span>
      </Link>
      <div className="home-interview-deadline">
        <div className="home-interview-deadline-date">{SUNDAY_LABEL}</div>
        <DeadlineUrgency
          dueAt={SUNDAY_END}
          className="deadline-urgency-prominent deadline-urgency-compact deadline-urgency-home"
        />
      </div>
    </li>
  );
}

function DemoDeadlineRow() {
  return (
    <li className="home-job-row">
      <Link to="/tasks/demo" className="home-job-main">
        <span className="home-job-title home-upcoming-title task-title-line home-upcoming-title-oneline">
          <PriorityBadge priority={0} />
          <span className="task-title-text">Finish take-home · Acme</span>
        </span>
        <span className="muted home-job-meta">Misc · est 90m</span>
      </Link>
    </li>
  );
}

export default function HomeTargetsPrototypePage() {
  const [params] = useSearchParams();
  const variant = params.get("variant") ?? "A";
  const showMetToggle = params.get("lcMet") === "1";
  const rows: ProtoHomeWeeklyTarget[] = useMemo(
    () => (showMetToggle ? homeSundayTargetsMetLc : homeSundayTargets),
    [showMetToggle],
  );

  return (
    <section className="prototype-page proto-m5-home-shell">
      <p className="prototype-banner">
        <Link to="/prototype/m5">← M5 hub</Link>
        {" · "}
        Weekly goal rows live under <strong>Targets</strong> only.{" "}
        <Link to={`?variant=${variant}&lcMet=${showMetToggle ? "0" : "1"}`}>
          Toggle LC met (hide row)
        </Link>
      </p>
      <h2>Home · Upcoming Targets</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Sunday column groups LC + apps goals (not real tasks). Rows drop when that week’s target
        is hit. Deadlines section unchanged — no weekly goals there.
      </p>

      <section className="card home-section home-attention-card">
        <h3 className="home-section-title">Upcoming · 1 week</h3>
        <div className="home-attention-subsection">
          <h4 className="home-subheading">Deadlines</h4>
          <div className="home-target-days">
            <div className="home-target-day">
              <h5 className="home-target-day-label">
                <span className="home-target-day-label-text">Wed · Mar 11</span>
                <DeadlineUrgencyPiesOnly
                  endAt="2026-03-11T23:59:59.000-07:00"
                  className="deadline-urgency-compact"
                />
              </h5>
              <ul className="home-list">
                <DemoDeadlineRow />
              </ul>
            </div>
          </div>
        </div>
        <div className="home-attention-subsection">
          <h4 className="home-subheading">Targets</h4>
          <div className="home-target-days">
            <div className="home-target-day">
              <h5 className="home-target-day-label">
                <span className="home-target-day-label-text">{SUNDAY_LABEL}</span>
                <DeadlineUrgencyPiesOnly endAt={SUNDAY_END} className="deadline-urgency-compact" />
              </h5>
              <ul className="home-list">
                {rows.map((row) => (
                  <WeeklyTargetRow key={row.id} item={row} variant={variant} />
                ))}
                <DemoDeadlineRow />
              </ul>
            </div>
          </div>
        </div>
      </section>

      <PrototypeSwitcher variants={[...VARIANTS]} surfaceLabel="Home targets" />
    </section>
  );
}
