import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  createProgressReflection,
  getProgressDay,
  getProgressHeatmap,
  getProgressOutcome,
  getProgressToday,
  patchProgressLeetcode,
  patchProgressReflection,
  type ProgressDayDetail,
  type ProgressHeatmapDay,
  type ProgressLane,
  type ProgressOutcome,
  type ProgressToday,
} from "../api";
import HistoryCalendar, { type CalendarDayMark } from "../progress/HistoryCalendar";
import LeetcodeStepper from "../progress/LeetcodeStepper";
import ProgressHeatmap from "../progress/ProgressHeatmap";
import ReflectionAccordion, {
  ReflectionCompose,
} from "../progress/ReflectionAccordion";

/** ~26 weeks — fills the left column when cells stretch to card width. */
const HEATMAP_DAYS = 182;

function browserTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function formatShort(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatLong(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function buildMarks(
  appDays: ProgressHeatmapDay[],
  techDays: ProgressHeatmapDay[],
): Record<string, CalendarDayMark> {
  const marks: Record<string, CalendarDayMark> = {};
  for (const day of appDays) {
    marks[day.date] = {
      earned: day.earned,
      effort: day.effort,
    };
  }
  for (const day of techDays) {
    const prev = marks[day.date];
    marks[day.date] = {
      earned: Math.max(prev?.earned ?? 0, day.earned),
      effort: Boolean(prev?.effort || day.effort),
    };
  }
  return marks;
}

export default function Progress() {
  const tz = useMemo(() => browserTz(), []);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "history" ? "history" : "today";

  const [today, setToday] = useState<ProgressToday | null>(null);
  const [week, setWeek] = useState<ProgressOutcome | null>(null);
  const [month, setMonth] = useState<ProgressOutcome | null>(null);
  const [appHeat, setAppHeat] = useState<ProgressHeatmapDay[]>([]);
  const [techHeat, setTechHeat] = useState<ProgressHeatmapDay[]>([]);
  const [todayDetail, setTodayDetail] = useState<ProgressDayDetail | null>(null);
  const [historyDate, setHistoryDate] = useState<string | null>(null);
  const [historyDetail, setHistoryDetail] = useState<ProgressDayDetail | null>(null);
  const [monthAnchor, setMonthAnchor] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const selectedHistory = historyDate ?? today?.localDate ?? null;

  const reloadOverview = useCallback(async () => {
    const [todayRow, weekRow, monthRow, appRow, techRow] = await Promise.all([
      getProgressToday(tz),
      getProgressOutcome(tz, "week"),
      getProgressOutcome(tz, "month"),
      getProgressHeatmap(tz, "application", 400),
      getProgressHeatmap(tz, "technical", 400),
    ]);
    setToday(todayRow);
    setWeek(weekRow);
    setMonth(monthRow);
    setAppHeat(appRow.days);
    setTechHeat(techRow.days);
    setHistoryDate((prev) => prev ?? todayRow.localDate);
    setMonthAnchor((prev) => prev ?? `${todayRow.localDate.slice(0, 7)}-01`);
    const detail = await getProgressDay(tz, todayRow.localDate);
    setTodayDetail(detail);
  }, [tz]);

  const reloadHistoryDay = useCallback(
    async (date: string) => {
      const detail = await getProgressDay(tz, date);
      setHistoryDetail(detail);
    },
    [tz],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reloadOverview();
        if (!cancelled) setLoaded(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadOverview]);

  useEffect(() => {
    if (!selectedHistory) return;
    let cancelled = false;
    (async () => {
      try {
        await reloadHistoryDay(selectedHistory);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load day");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedHistory, reloadHistoryDay]);

  function setTab(next: "today" | "history") {
    const params = new URLSearchParams(searchParams);
    if (next === "today") params.delete("tab");
    else params.set("tab", "history");
    setSearchParams(params, { replace: true });
  }

  async function refreshAfterWrite(date: string) {
    await reloadOverview();
    if (date === today?.localDate) {
      setTodayDetail(await getProgressDay(tz, date));
    }
    if (date === selectedHistory) {
      await reloadHistoryDay(date);
    }
  }

  async function setLeetcode(count: number, date?: string) {
    await patchProgressLeetcode(tz, { count, date });
    await refreshAfterWrite(date ?? today!.localDate);
  }

  async function addReflection(lane: ProgressLane, body: string, localDate?: string) {
    await createProgressReflection({
      lane,
      body,
      localDate: localDate ?? null,
      tz: localDate ? tz : null,
    });
    await refreshAfterWrite(localDate ?? today!.localDate);
  }

  async function saveReflection(id: string, body: string, date: string) {
    await patchProgressReflection(id, body);
    await refreshAfterWrite(date);
  }

  if (error && !loaded) return <p className="error">{error}</p>;
  if (!loaded || !today || !week || !month) return <p className="muted">Loading…</p>;

  const marks = buildMarks(appHeat, techHeat);
  const heatWindow = appHeat.slice(-HEATMAP_DAYS);
  const techWindow = techHeat.slice(-HEATMAP_DAYS);
  const historyLc = historyDetail?.leetcode.raw ?? 0;
  const deepWorkLabel = today.deepWork ? "deep work ✓" : "no deep work";

  return (
    <section className="progress-page">
      <div className="tabs">
        <button
          type="button"
          className={`tab ${tab === "today" ? "on" : ""}`}
          onClick={() => setTab("today")}
        >
          today
        </button>
        <button
          type="button"
          className={`tab ${tab === "history" ? "on" : ""}`}
          onClick={() => setTab("history")}
        >
          history
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {tab === "today" ? (
        <>
          <header className="card progress-today-head">
            <p className="progress-today-label">
              Today · {formatShort(today.localDate)}
            </p>
            <p className="progress-today-strip">
              {today.applications.earned}/{today.applications.cap} apps ·{" "}
              {today.leetcode.earned}/{today.leetcode.cap} LC · {deepWorkLabel}
            </p>
          </header>

          <div className="progress-outcome-row">
            <div className="card progress-outcome-card">
              <span className="progress-kicker">This week</span>
              <strong>
                {week.applicationsLogged} apps · {week.leetcodeSolves} LC ·{" "}
                {week.deepWorkUnits} deep work
              </strong>
            </div>
            <div className="card progress-outcome-card">
              <span className="progress-kicker">This month</span>
              <strong>
                {month.applicationsLogged} apps · {month.leetcodeSolves} LC ·{" "}
                {month.deepWorkUnits} deep work
              </strong>
            </div>
          </div>

          <div className="progress-today-band">
            <div className="progress-heat-stack">
              <ProgressHeatmap
                title="Application prep"
                days={heatWindow}
                today={today.localDate}
              />
              <ProgressHeatmap
                title="Technical prep"
                days={techWindow}
                today={today.localDate}
              />
            </div>

            <div className="progress-log-stack">
              <aside className="card progress-lc-card">
                <h3 className="progress-section-title">LeetCode</h3>
                <LeetcodeStepper
                  value={today.leetcode.raw}
                  onCommit={(count) => setLeetcode(count)}
                />
              </aside>

              <aside className="card progress-log-panel">
                <h3 className="progress-section-title">Log today</h3>
                <div className="progress-log-block">
                  <ReflectionCompose
                    onSubmit={(lane, body) => addReflection(lane, body)}
                  />
                </div>
                <div className="progress-log-block">
                  <span className="progress-kicker">Today&apos;s notes</span>
                  <ReflectionAccordion
                    reflections={todayDetail?.reflections ?? []}
                    canEdit
                    onSave={(id, body) => saveReflection(id, body, today.localDate)}
                  />
                </div>
              </aside>
            </div>
          </div>
        </>
      ) : (
        <div className="progress-history">
          {monthAnchor && selectedHistory && (
            <HistoryCalendar
              monthAnchor={monthAnchor}
              today={today.localDate}
              selectedDate={selectedHistory}
              marks={marks}
              onMonthChange={(next) => setMonthAnchor(next)}
              onSelectDate={(date) => {
                setHistoryDate(date);
                setEditingDay(false);
              }}
            />
          )}

          <div className="progress-log-stack">
            <section className="card progress-log-panel progress-history-detail">
              <div className="progress-log-panel-head">
                <div>
                  <p className="muted progress-kicker">Selected day</p>
                  <h3 className="progress-history-date">
                    {selectedHistory ? formatLong(selectedHistory) : "—"}
                  </h3>
                </div>
                <label className="progress-edit-toggle">
                  <input
                    type="checkbox"
                    checked={editingDay}
                    onChange={(event) => setEditingDay(event.target.checked)}
                  />
                  Edit this day
                </label>
              </div>

              <aside className="card progress-lc-card">
                <h3 className="progress-section-title">LeetCode</h3>
                {!historyDetail ? (
                  <p className="muted">…</p>
                ) : editingDay ? (
                  <LeetcodeStepper
                    value={historyLc}
                    onCommit={(count) => setLeetcode(count, selectedHistory!)}
                  />
                ) : (
                  <p className="progress-lc-readonly">
                    {historyDetail.leetcode.raw}{" "}
                    {historyDetail.leetcode.raw === 1 ? "solve" : "solves"}
                  </p>
                )}
              </aside>

              {!historyDetail ? (
                <p className="muted">Loading day…</p>
              ) : (
                <>
                  <div className="progress-log-block">
                    <span className="progress-kicker">Apps</span>
                    <p className="progress-apps-summary">
                      {historyDetail.applications.raw} logged ·{" "}
                      {historyDetail.applications.earned}/5 earned
                    </p>
                    {historyDetail.applicationRows.length > 0 ? (
                      <ul className="progress-app-list">
                        {historyDetail.applicationRows.map((app) => (
                          <li key={app.id}>
                            <Link to={`/applications/${app.id}`}>
                              {app.company ?? "Unknown"} · {app.title ?? "Untitled"}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">No applications logged this day.</p>
                    )}
                  </div>

                  {editingDay && (
                    <div className="progress-log-block">
                      <span className="progress-kicker">Add reflection</span>
                      <ReflectionCompose
                        onSubmit={(lane, body) =>
                          addReflection(lane, body, selectedHistory!)
                        }
                      />
                    </div>
                  )}

                  <div className="progress-log-block">
                    <span className="progress-kicker">Notes</span>
                    <ReflectionAccordion
                      reflections={historyDetail.reflections}
                      canEdit={editingDay}
                      onSave={(id, body) =>
                        saveReflection(id, body, selectedHistory!)
                      }
                    />
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      )}
    </section>
  );
}
