import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getHomeDashboard,
  getProgressToday,
  type HomeDashboard,
  type HomeJobPick,
  type HomeUpcomingItem,
  type ProgressToday,
  type WeeklyPaceLabel,
} from "../api";
import DeadlineUrgency, { DeadlineUrgencyPiesOnly } from "../DeadlineUrgency";
import { endOfLocalCivilDayIso } from "../formatDate";
import WeeklyCongratsBanner from "../features/home/WeeklyCongratsBanner";
import TodayStrip from "../features/progress/TodayStrip";
import PriorityBadge from "../PriorityBadge";
import ThemeEmoji from "../ThemeEmoji";
import { formatEstimateMinutes, formatStepWhen } from "../formatDate";
import {
  greetingEmojiForPeriod,
  greetingLabelForPeriod,
  greetingPeriodFromHour,
} from "../pageTheme";
import { listLinkState } from "../navigationReturn";

function browserTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

const UPCOMING_DAYS_KEY = "home.upcomingDays";

function readUpcomingDays(): 7 | 14 {
  try {
    const raw = localStorage.getItem(UPCOMING_DAYS_KEY);
    if (raw === "14") return 14;
  } catch {
    /* ignore */
  }
  return 7;
}

function writeUpcomingDays(days: 7 | 14) {
  try {
    localStorage.setItem(UPCOMING_DAYS_KEY, String(days));
  } catch {
    /* ignore */
  }
}

function currentGreetingPeriod() {
  return greetingPeriodFromHour(new Date().getHours());
}

function formatWhen(value: string | null | undefined): string | null {
  if (!value) return null;
  return formatStepWhen(value);
}

function PickList({ items, empty }: { items: HomeJobPick[]; empty: string }) {
  if (items.length === 0) return <p className="muted home-pick-empty">{empty}</p>;
  return (
    <ul className="home-list">
      {items.map((job) => (
        <li key={job.id} className="home-job-row">
          <Link to={`/jobs/${job.id}`} className="home-job-main">
            <span className="home-job-title">{job.company} · {job.title}</span>
            {job.location && <span className="muted home-job-meta">{job.location}</span>}
            {job.rankReason && job.pickKind !== "new_to_digest" && (
              <span className="muted home-job-meta home-rank-note">{job.rankReason}</span>
            )}
          </Link>
          {job.rankScore != null && (
            <span className="badge home-rank-badge">{job.rankScore}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function upcomingItemKey(item: HomeUpcomingItem): string {
  if (item.kind === "interview") return `interview:${item.stepId}`;
  if (item.kind === "subtask") return `subtask:${item.subtaskId}`;
  if (item.kind === "weekly_goal") return `weekly_goal:${item.slot}`;
  return `task:${item.id}`;
}

function paceText(label: WeeklyPaceLabel, amount: number, done: number, total: number): string {
  if (total > 0 && done >= total) return "met";
  if (label === "ahead") return `${amount} ahead`;
  if (label === "behind") return `${amount} behind`;
  return "on track";
}

function UpcomingRow({
  item,
  showSchedule = true,
}: {
  item: HomeUpcomingItem;
  showSchedule?: boolean;
}) {
  const location = useLocation();
  const estimate = formatEstimateMinutes(item.estimateMinutes);

  function TitleLine({ text }: { text: string }) {
    return (
      <span
        className={`home-job-title home-upcoming-title task-title-line${
          showSchedule ? "" : " home-upcoming-title-oneline"
        }`}
      >
        <PriorityBadge priority={item.priority} />
        <span className="task-title-text">{text}</span>
        {estimate && <span className="task-estimate-inline">{estimate}</span>}
      </span>
    );
  }

  if (item.kind === "weekly_goal") {
    const pct = item.total > 0 ? Math.min(100, Math.round((item.done / item.total) * 100)) : 0;
    return (
      <li className="home-job-row home-interview-row home-weekly-goal-row">
        <Link to="/progress" className="home-job-main">
          <span className="home-job-title home-upcoming-title task-title-line home-upcoming-title-oneline">
            <span className="task-title-text">{item.title}</span>
          </span>
          <span className="muted home-job-meta home-weekly-goal-meta">
            <span className="home-weekly-goal-mini-bar" aria-hidden="true">
              <span className="weekly-goal-bar">
                <span style={{ width: `${pct}%` }} />
              </span>
            </span>
            <span>
              {item.done}/{item.total}
            </span>
            <span className={item.pace.label === "behind" ? "weekly-pace behind" : "weekly-pace on-track"}>
              {paceText(item.pace.label, item.pace.amount, item.done, item.total)}
            </span>
          </span>
        </Link>
        <div className="home-interview-deadline">
          <div className="home-interview-deadline-date">{item.deadlineLabel}</div>
          <span className="muted home-weekly-goal-reset">resets Monday</span>
        </div>
      </li>
    );
  }

  if (item.kind === "interview") {
    const secondary = ["Interview", item.stepTitle].filter(Boolean).join(" · ");
    return (
      <li className="home-job-row home-interview-row">
        <Link to={`/interviews/${item.threadId}`} className="home-job-main">
          <TitleLine
            text={
              item.company
                ? `${item.company}${item.primaryTitle ? ` · ${item.primaryTitle}` : ""}`
                : (item.primaryTitle ?? "Interview")
            }
          />
          <span className="muted home-job-meta">{secondary}</span>
        </Link>
        {showSchedule && (
          <div className="home-interview-deadline">
            <div className="home-interview-deadline-date">{item.deadlineLabel}</div>
            <DeadlineUrgency
              dueAt={item.at}
              className="deadline-urgency-prominent deadline-urgency-compact deadline-urgency-home"
            />
          </div>
        )}
      </li>
    );
  }

  const taskPath = item.id ? `/tasks/${item.id}` : "/tasks";

  return (
    <li className="home-job-row">
      <Link to={taskPath} state={listLinkState(location)} className="home-job-main">
        <TitleLine text={item.title} />
        {(item.organization || item.categoryName) && (
          <span className="muted home-job-meta">
            {[item.organization, item.categoryName].filter(Boolean).join(" · ")}
          </span>
        )}
      </Link>
      {showSchedule && (
        <div className="home-interview-deadline">
          <div className="home-interview-deadline-date">{item.deadlineLabel}</div>
          <DeadlineUrgency
            dueAt={item.at}
            className="deadline-urgency-prominent deadline-urgency-compact deadline-urgency-home"
          />
        </div>
      )}
    </li>
  );
}

function sectionIsEmpty(section: HomeDashboard["upcomingThisWeek"]["sections"][number]): boolean {
  if (section.layout === "by_day") {
    return (section.dayGroups ?? []).every((g) => g.items.length === 0);
  }
  return section.items.length === 0;
}

export default function Home() {
  const [data, setData] = useState<HomeDashboard | null>(null);
  const [progress, setProgress] = useState<ProgressToday | null>(null);
  const [upcomingDays, setUpcomingDays] = useState<7 | 14>(() => readUpcomingDays());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tz = browserTz();
    getHomeDashboard(tz, upcomingDays)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [upcomingDays]);

  useEffect(() => {
    const tz = browserTz();
    getProgressToday(tz)
      .then(setProgress)
      .catch(() => setProgress(null));
  }, []);

  function onUpcomingDaysChange(days: 7 | 14) {
    writeUpcomingDays(days);
    setUpcomingDays(days);
  }

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const upcoming = data.upcomingThisWeek;
  const digestWhen = formatWhen(data.lastDigest.lastOkAt ?? data.lastDigest.finishedAt);
  const greetingPeriod = currentGreetingPeriod();
  const sections = upcoming.sections ?? [];
  const windowDays = upcoming.windowDays ?? upcomingDays;
  const upcomingTitle =
    windowDays === 14 ? "Upcoming · 2 weeks" : "Upcoming · 1 week";
  const upcomingEmpty =
    windowDays === 14 ? "Nothing due in the next two weeks." : "Nothing due this week.";

  return (
    <section className="home-page">
      <header className="home-hero card">
        <div className="home-hero-top">
          <div className="home-hero-main">
            <h2 className="home-greeting">
              <span>
                {greetingLabelForPeriod(greetingPeriod)}
                {data.greetingName ? `, ${data.greetingName}` : ""}
              </span>
              <ThemeEmoji
                emoji={greetingEmojiForPeriod(greetingPeriod)}
                className="theme-emoji theme-emoji-greeting"
              />
            </h2>
            <p className="muted home-hero-sub">
              Your internship digest at a glance.
            </p>
          </div>
          <div className="home-last-digest">
            <span className="home-last-digest-label">Last digest</span>
            <span className="home-last-digest-value">
              {digestWhen ?? "Not run yet"}
            </span>
            {data.lastDigest.status === "error" && data.lastDigest.error && (
              <span className="error home-digest-error">{data.lastDigest.error}</span>
            )}
            <Link to="/status" className="home-section-link">Pipeline status →</Link>
          </div>
        </div>
        {data.weeklyCongrats && data.weeklyCongrats.goals.length > 0 && (
          <WeeklyCongratsBanner congrats={data.weeklyCongrats} />
        )}
        {progress && (
          <div className="home-progress-stack">
            <div className="home-progress-row">
              <TodayStrip today={progress} className="home-progress-strip" />
              <Link to="/progress" className="home-section-link">
                Update progress →
              </Link>
            </div>
          </div>
        )}
      </header>

      <section className="card home-section home-attention-card">
        <div className="home-section-head home-upcoming-head">
          <h3 className="home-section-title">{upcomingTitle}</h3>
          <div className="home-upcoming-range" role="group" aria-label="Upcoming range">
            <button
              type="button"
              className={
                upcomingDays === 7
                  ? "secondary home-upcoming-range-btn is-active"
                  : "secondary home-upcoming-range-btn"
              }
              aria-pressed={upcomingDays === 7}
              onClick={() => onUpcomingDaysChange(7)}
            >
              1 week
            </button>
            <button
              type="button"
              className={
                upcomingDays === 14
                  ? "secondary home-upcoming-range-btn is-active"
                  : "secondary home-upcoming-range-btn"
              }
              aria-pressed={upcomingDays === 14}
              onClick={() => onUpcomingDaysChange(14)}
            >
              2 weeks
            </button>
          </div>
        </div>
        {sections.every(sectionIsEmpty) ? (
          <p className="muted home-pick-empty">{upcomingEmpty}</p>
        ) : (
          sections.map((section) =>
            sectionIsEmpty(section) ? null : (
              <div key={section.key} className="home-attention-subsection">
                <h4 className="home-subheading">{section.label}</h4>
                {section.layout === "by_day" ? (
                  <div className="home-target-days">
                    {(section.dayGroups ?? []).map((group) =>
                      group.items.length === 0 ? null : (
                        <div key={group.key} className="home-target-day">
                          <h5
                            className={`home-target-day-label${
                              group.key === "overdue" ? " is-overdue" : ""
                            }`}
                          >
                            <span className="home-target-day-label-text">{group.label}</span>
                            {(() => {
                              const dayEnd = endOfLocalCivilDayIso(group.key);
                              return dayEnd ? (
                                <DeadlineUrgencyPiesOnly
                                  endAt={dayEnd}
                                  className="deadline-urgency-compact"
                                />
                              ) : null;
                            })()}
                          </h5>
                          <ul className="home-list">
                            {group.items.map((item) => (
                              <UpcomingRow
                                key={upcomingItemKey(item)}
                                item={item}
                                showSchedule={false}
                              />
                            ))}
                          </ul>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <ul className="home-list">
                    {section.items.map((item) => (
                      <UpcomingRow key={upcomingItemKey(item)} item={item} />
                    ))}
                  </ul>
                )}
              </div>
            ),
          )
        )}
      </section>

      <section className="card home-section home-picks-card">
        <div className="home-section-head">
          <h3 className="home-section-title">New &amp; top picks</h3>
          <Link to="/jobs" className="home-section-link">Browse jobs →</Link>
        </div>
        <div className="home-picks-grid">
          <div className="home-picks-col">
            <h4 className="home-subheading">Top ranked</h4>
            <PickList items={data.newAndTopPicks.topRanked} empty="No ranked jobs yet." />
          </div>
          <div className="home-picks-col">
            <h4 className="home-subheading">Newly ranked</h4>
            <PickList items={data.newAndTopPicks.newlyRanked} empty="No new rankings this week." />
          </div>
          <div className="home-picks-col">
            <h4 className="home-subheading">New to digest</h4>
            <PickList items={data.newAndTopPicks.newToDigest} empty="No new listings recently." />
          </div>
        </div>
      </section>
    </section>
  );
}
