/**
 * Static Home stand-in for the F08 M5-06 Home prototypes (target rows,
 * congrats banner). Uses production Home classes with mock content.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { DeadlineUrgencyPiesOnly } from "../../DeadlineUrgency";
import PriorityBadge from "../../PriorityBadge";
import {
  APP_MEMBERS,
  dayLabel,
  LC_TARGET,
  SUNDAY_LABEL,
  THIS_MONDAY,
  THIS_SUNDAY,
  THIS_SUNDAY_END_ISO,
} from "./fixtures";
import { PaceText } from "./parts";

export type WeekLine = "bars" | "text" | "none";

export type WeekSnapshot = {
  lcDone: number;
  lcTarget: number;
  appsDone: number;
  appsTotal: number;
};

export const DEFAULT_WEEK: WeekSnapshot = {
  lcDone: 7,
  lcTarget: LC_TARGET,
  appsDone: APP_MEMBERS.filter((m) => m.status === "completed").length,
  appsTotal: APP_MEMBERS.length,
};

function dayEndIso(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();
}

/** A real target task mid-week; lands on whichever weekday is still ahead (or Sunday). */
const MID_WEEK = (() => {
  const today = new Date();
  const wed = new Date(THIS_MONDAY.getFullYear(), THIS_MONDAY.getMonth(), THIS_MONDAY.getDate() + 2);
  return wed.getTime() > today.getTime() ? wed : THIS_SUNDAY;
})();

function HeroWeekBars({ week }: { week: WeekSnapshot }) {
  const cols = "max-content max-content minmax(2.75rem, 1fr) max-content";
  const goals = [
    { id: "lc", title: "LC", done: week.lcDone, total: week.lcTarget },
    { id: "apps", title: "Apps", done: week.appsDone, total: week.appsTotal },
  ];
  return (
    <div className="weekly-goals-block compact" style={{ gridTemplateColumns: `${cols} ${cols}` }}>
      {goals.map((g, i) => {
        const pct = g.total > 0 ? Math.min(100, Math.round((g.done / g.total) * 100)) : 0;
        return (
          <div key={g.id} style={{ display: "contents" }}>
            <span
              className={
                i > 0 ? "weekly-goal-title-cluster weekly-goal-cluster-start" : "weekly-goal-title-cluster"
              }
            >
              {i === 0 && <span className="weekly-goals-kicker">This week: </span>}
              <strong className="weekly-goal-title">{g.title}</strong>
            </span>
            <span className="weekly-goal-fraction">
              {g.done}/{g.total}
            </span>
            <div className="weekly-goal-bar">
              <span style={{ width: `${pct}%` }} />
            </div>
            <PaceText done={g.done} total={g.total} />
          </div>
        );
      })}
    </div>
  );
}

export default function MockHome({
  week = DEFAULT_WEEK,
  weekLine = "bars",
  bannerTop,
  bannerInHero,
  bannerAboveUpcoming,
  sundayTargetRows,
}: {
  week?: WeekSnapshot;
  weekLine?: WeekLine;
  bannerTop?: ReactNode;
  bannerInHero?: ReactNode;
  bannerAboveUpcoming?: ReactNode;
  sundayTargetRows?: ReactNode;
}) {
  const sameDay = MID_WEEK.getTime() === THIS_SUNDAY.getTime();
  return (
    <section className="home-page f08-home">
      {bannerTop}
      <header className="home-hero card f08-card">
        <div className="home-hero-top">
          <div className="home-hero-main">
            <h2 className="home-greeting">
              <span>Good morning, Emily</span>
            </h2>
            <p className="muted home-hero-sub">Your internship digest at a glance.</p>
          </div>
        </div>
        {bannerInHero}
        <div className="home-progress-stack">
          <div className="home-progress-row">
            <p className="home-progress-strip">
              Today: <span>2/3 apps</span> · <span>1/3 LC</span>
            </p>
            <span className="home-section-link">Update progress →</span>
          </div>
          {weekLine === "bars" && (
            <div className="home-progress-row home-progress-row-week">
              <HeroWeekBars week={week} />
            </div>
          )}
          {weekLine === "text" && (
            <div className="home-progress-row">
              <p className="home-progress-strip">
                This week: {week.lcDone}/{week.lcTarget} LC
                {week.appsTotal > 0 ? ` · ${week.appsDone}/${week.appsTotal} apps` : ""}
              </p>
            </div>
          )}
        </div>
      </header>

      {bannerAboveUpcoming}

      <section className="card home-section home-attention-card f08-card">
        <div className="home-section-head home-upcoming-head">
          <h3 className="home-section-title">Upcoming · 1 week</h3>
        </div>
        <div className="home-attention-subsection">
          <h4 className="home-subheading">Deadlines</h4>
          <div className="home-target-days">
            <div className="home-target-day">
              <h5 className="home-target-day-label">
                <span className="home-target-day-label-text">{dayLabel(MID_WEEK)}</span>
                <DeadlineUrgencyPiesOnly endAt={dayEndIso(MID_WEEK)} className="deadline-urgency-compact" />
              </h5>
              <ul className="home-list">
                <li className="home-job-row">
                  <span className="home-job-main">
                    <span className="home-job-title home-upcoming-title task-title-line home-upcoming-title-oneline">
                      <PriorityBadge priority={0} />
                      <span className="task-title-text">Submit OA · Datadog</span>
                    </span>
                    <span className="muted home-job-meta">Application · est 90m</span>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="home-attention-subsection">
          <h4 className="home-subheading">Targets</h4>
          <div className="home-target-days">
            {!sameDay && (
              <div className="home-target-day">
                <h5 className="home-target-day-label">
                  <span className="home-target-day-label-text">{dayLabel(MID_WEEK)}</span>
                  <DeadlineUrgencyPiesOnly endAt={dayEndIso(MID_WEEK)} className="deadline-urgency-compact" />
                </h5>
                <ul className="home-list">
                  <li className="home-job-row">
                    <span className="home-job-main">
                      <span className="home-job-title home-upcoming-title task-title-line home-upcoming-title-oneline">
                        <PriorityBadge priority={2} />
                        <span className="task-title-text">Read “Designing Data-Intensive Apps” ch. 5</span>
                      </span>
                      <span className="muted home-job-meta">Reading · est 45m</span>
                    </span>
                  </li>
                </ul>
              </div>
            )}
            <div className="home-target-day">
              <h5 className="home-target-day-label">
                <span className="home-target-day-label-text">{SUNDAY_LABEL}</span>
                <DeadlineUrgencyPiesOnly endAt={THIS_SUNDAY_END_ISO} className="deadline-urgency-compact" />
              </h5>
              <ul className="home-list">
                {sundayTargetRows}
                <li className="home-job-row">
                  <span className="home-job-main">
                    <span className="home-job-title home-upcoming-title task-title-line home-upcoming-title-oneline">
                      <PriorityBadge priority={1} />
                      <span className="task-title-text">Update resume bullets</span>
                    </span>
                    <span className="muted home-job-meta">Writing · est 30m</span>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <p className="muted f08-hint">
        Mock Home. <Link to="/prototype/f08/weekly/progress-block">Weekly block prototype →</Link>
      </p>
    </section>
  );
}
