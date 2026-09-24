import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getHomeDashboard,
  getProgressToday,
  type HomeDashboard,
  type HomeJobPick,
  type HomeUpcomingItem,
  type ProgressToday,
  type WeeklyGoalsSnapshot,
} from "../api";
import InterviewCountdown from "../features/interviews/InterviewCountdown";
import TodayStrip from "../features/progress/TodayStrip";
import WeeklyGoalsBlock from "../features/progress/WeeklyGoalsBlock";
import PriorityBadge from "../PriorityBadge";
import ThemeEmoji from "../ThemeEmoji";
import { formatEstimateMinutes, formatStepWhen } from "../formatDate";
import {
  greetingEmojiForPeriod,
  greetingLabelForPeriod,
  greetingPeriodFromHour,
} from "../pageTheme";

function browserTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
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
  return `task:${item.id}`;
}

function UpcomingRow({
  item,
  showSchedule = true,
}: {
  item: HomeUpcomingItem;
  showSchedule?: boolean;
}) {
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
            <InterviewCountdown target={item.at} />
          </div>
        )}
      </li>
    );
  }

  return (
    <li className="home-job-row">
      <Link to="/tasks" className="home-job-main">
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
          <InterviewCountdown target={item.at} />
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
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoalsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tz = browserTz();
    getHomeDashboard(tz)
      .then((dash) => {
        setData(dash);
        setWeeklyGoals(dash.weeklyGoals);
      })
      .catch((err: Error) => setError(err.message));
    getProgressToday(tz)
      .then(setProgress)
      .catch(() => setProgress(null));
  }, []);

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const upcoming = data.upcomingThisWeek;
  const digestWhen = formatWhen(data.lastDigest.lastOkAt ?? data.lastDigest.finishedAt);
  const greetingPeriod = currentGreetingPeriod();
  const sections = upcoming.sections ?? [];

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
        {progress && (
          <div className="home-progress-stack">
            <div className="home-progress-row">
              <TodayStrip
                today={progress}
                prefix="Today: "
                className="home-progress-strip"
              />
              <Link to="/progress" className="home-section-link">
                Update progress →
              </Link>
            </div>
            <div className="home-progress-row home-progress-row-week">
              <WeeklyGoalsBlock
                snapshot={weeklyGoals}
                compact
                onChange={setWeeklyGoals}
              />
            </div>
          </div>
        )}
      </header>

      <section className="card home-section home-attention-card">
        <h3 className="home-section-title">Upcoming this week</h3>
        {sections.every(sectionIsEmpty) ? (
          <p className="muted home-pick-empty">Nothing due this week.</p>
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
                          <h5 className="home-target-day-label">{group.label}</h5>
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
