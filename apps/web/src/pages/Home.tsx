import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getHomeDashboard,
  getProgressToday,
  type HomeDashboard,
  type HomeJobPick,
  type HomeUpcomingItem,
  type ProgressToday,
} from "../api";
import InterviewCountdown from "../features/interviews/InterviewCountdown";
import TodayStrip from "../features/progress/TodayStrip";
import ThemeEmoji from "../ThemeEmoji";
import { formatStepWhen } from "../formatDate";
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
  return item.kind === "interview" ? `interview:${item.stepId}` : `task:${item.id}`;
}

function UpcomingRow({ item }: { item: HomeUpcomingItem }) {
  if (item.kind === "interview") {
    const secondary = ["Interview", item.stepTitle].filter(Boolean).join(" · ");
    return (
      <li className="home-job-row home-interview-row">
        <Link to={`/interviews/${item.threadId}`} className="home-job-main">
          <span className="home-job-title">
            {item.company ?? "Unknown"} · {item.primaryTitle ?? "Untitled"}
          </span>
          <span className="muted home-job-meta">{secondary}</span>
        </Link>
        <div className="home-interview-deadline">
          <div className="home-interview-deadline-date">{item.deadlineLabel}</div>
          <InterviewCountdown target={item.at} />
        </div>
      </li>
    );
  }

  const secondary = [item.categoryName, item.organization].filter(Boolean).join(" · ");
  return (
    <li className="home-job-row home-interview-row">
      <Link to="/tasks" className="home-job-main">
        <span className="home-job-title">{item.title}</span>
        {secondary && <span className="muted home-job-meta">{secondary}</span>}
      </Link>
      <div className="home-interview-deadline">
        <div className="home-interview-deadline-date">{item.deadlineLabel}</div>
        <InterviewCountdown target={item.at} />
      </div>
    </li>
  );
}

export default function Home() {
  const [data, setData] = useState<HomeDashboard | null>(null);
  const [progress, setProgress] = useState<ProgressToday | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tz = browserTz();
    getHomeDashboard(tz).then(setData).catch((err: Error) => setError(err.message));
    getProgressToday(tz)
      .then(setProgress)
      .catch(() => setProgress(null));
  }, []);

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const upcoming = data.upcomingThisWeek;
  const digestWhen = formatWhen(data.lastDigest.lastOkAt ?? data.lastDigest.finishedAt);
  const greetingPeriod = currentGreetingPeriod();

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
        )}
      </header>

      <section className="card home-section home-attention-card">
        <h3 className="home-section-title">Upcoming this week</h3>
        {upcoming.groups.length === 0 ? (
          <p className="muted home-pick-empty">Nothing due this week.</p>
        ) : (
          upcoming.groups.map((group) => (
            <div key={group.key} className="home-attention-subsection">
              <h4 className="home-subheading">{group.label}</h4>
              <ul className="home-list">
                {group.items.map((item) => (
                  <UpcomingRow key={upcomingItemKey(item)} item={item} />
                ))}
              </ul>
            </div>
          ))
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
