import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  completeTask,
  createProgressReflection,
  getApplications,
  getProgressDay,
  getProgressHeatmap,
  getProgressOutcome,
  getProgressToday,
  getTasks,
  getWeeklyGoals,
  patchProgressLeetcode,
  patchProgressReflection,
  type ActivityCredit,
  type LeetcodeChangeResult,
  type LeetcodeTier,
  type LeetcodeType,
  type PointsEarnInfo,
  type ProgressDayDetail,
  type ProgressHeatmapDay,
  type ProgressLane,
  type ProgressOutcome,
  type ProgressToday,
  type WeeklyGoalsSnapshot,
} from "../../api";
import HistoryCalendar, { type CalendarDayMark } from "./HistoryCalendar";
import LedgerCompletionsPanel from "./LedgerCompletionsPanel";
import LedgerPointsPanel from "./LedgerPointsPanel";
import LeetcodeLogger, { lcCountsLine } from "./LeetcodeLogger";
import ProgressHeatmap from "./ProgressHeatmap";
import ReflectionAccordion, {
  ReflectionCompose,
  type ReflectionLinkOption,
} from "./ReflectionAccordion";
import TodayStrip from "./TodayStrip";
import WeeklyGoalsBlock from "./WeeklyGoalsBlock";
import EarnFlash from "../completion/EarnFlash";
import ModalLayer from "../../ModalLayer";
import StepActionConfirm from "../../StepActionConfirm";
import { useBeforeUnloadDraftGuard } from "../../useUnsavedDraftGuard";

type ProgressTab = "today" | "history" | "ledger";
type LedgerView = "completions" | "points";

function parseProgressTab(raw: string | null): ProgressTab {
  if (raw === "history" || raw === "ledger") return raw;
  return "today";
}

function parseLedgerView(raw: string | null): LedgerView {
  return raw === "points" ? "points" : "completions";
}

/** ~26 weeks — fills half the today band at 50/50 with daily progress. */
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

function creditFor(raw: number, cap: number): ActivityCredit {
  return { raw, earned: Math.min(raw, cap), cap };
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseProgressTab(searchParams.get("tab"));
  const ledgerView = parseLedgerView(searchParams.get("view"));

  const [today, setToday] = useState<ProgressToday | null>(null);
  const [week, setWeek] = useState<ProgressOutcome | null>(null);
  const [month, setMonth] = useState<ProgressOutcome | null>(null);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoalsSnapshot | null>(null);
  const [appHeat, setAppHeat] = useState<ProgressHeatmapDay[]>([]);
  const [techHeat, setTechHeat] = useState<ProgressHeatmapDay[]>([]);
  const [todayDetail, setTodayDetail] = useState<ProgressDayDetail | null>(null);
  const [historyDate, setHistoryDate] = useState<string | null>(null);
  const [historyDetail, setHistoryDetail] = useState<ProgressDayDetail | null>(null);
  const [monthAnchor, setMonthAnchor] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState(false);
  const [composeLane, setComposeLane] = useState<ProgressLane>("application");
  const [historyLane, setHistoryLane] = useState<ProgressLane>("application");
  const [composeLinkKey, setComposeLinkKey] = useState("");
  const [historyLinkKey, setHistoryLinkKey] = useState("");
  const [composeStepId, setComposeStepId] = useState("");
  const [historyStepId, setHistoryStepId] = useState("");
  const [linkOptions, setLinkOptions] = useState<ReflectionLinkOption[]>([]);
  const [composeDirty, setComposeDirty] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [earn, setEarn] = useState<PointsEarnInfo | null>(null);
  const dismissEarn = useCallback(() => setEarn(null), []);
  const [loaded, setLoaded] = useState(false);

  const selectedHistory = historyDate ?? today?.localDate ?? null;
  const composeActive = tab === "today" || (tab === "history" && editingDay);
  const guardDraft = composeDirty && composeActive;
  const leaveConfirmOpen = pendingLeave !== null;

  useBeforeUnloadDraftGuard(guardDraft);

  useEffect(() => {
    if (!guardDraft) return;
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a[href]") as
        | HTMLAnchorElement
        | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const next = `${url.pathname}${url.search}${url.hash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (next === current) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingLeave(() => () => navigate(next));
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [guardDraft, navigate]);

  const handleComposeDirtyChange = useCallback((dirty: boolean) => {
    setComposeDirty(dirty);
  }, []);

  const guardedAction = useCallback(
    (action: () => void) => {
      if (guardDraft) {
        setPendingLeave(() => action);
        return;
      }
      action();
    },
    [guardDraft],
  );

  function cancelLeave() {
    setPendingLeave(null);
  }

  function confirmLeave() {
    setComposeDirty(false);
    const action = pendingLeave;
    setPendingLeave(null);
    action?.();
  }

  const writeSeq = useRef(0);

  const reloadOverview = useCallback(async (isCurrent: () => boolean = () => true) => {
    const [todayRow, weekRow, monthRow, appRow, techRow, goals] = await Promise.all([
      getProgressToday(tz),
      getProgressOutcome(tz, "week"),
      getProgressOutcome(tz, "month"),
      getProgressHeatmap(tz, "application", 400),
      getProgressHeatmap(tz, "technical", 400),
      getWeeklyGoals(tz),
    ]);
    const detail = await getProgressDay(tz, todayRow.localDate);
    if (!isCurrent()) return;
    setToday(todayRow);
    setWeek(weekRow);
    setMonth(monthRow);
    setAppHeat(appRow.days);
    setTechHeat(techRow.days);
    setWeeklyGoals(goals);
    setHistoryDate((prev) => prev ?? todayRow.localDate);
    setMonthAnchor((prev) => prev ?? `${todayRow.localDate.slice(0, 7)}-01`);
    setTodayDetail(detail);
  }, [tz]);

  const reloadHistoryDay = useCallback(
    async (date: string, isCurrent: () => boolean = () => true) => {
      const detail = await getProgressDay(tz, date);
      if (isCurrent()) setHistoryDetail(detail);
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

  function setTab(next: ProgressTab) {
    guardedAction(() => {
      const params = new URLSearchParams(searchParams);
      if (next === "today") {
        params.delete("tab");
        params.delete("view");
      } else {
        params.set("tab", next);
        if (next !== "ledger") params.delete("view");
      }
      setSearchParams(params, { replace: true });
    });
  }

  function setLedgerView(next: LedgerView) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", "ledger");
    if (next === "completions") params.delete("view");
    else params.set("view", "points");
    setSearchParams(params, { replace: true });
  }

  async function refreshAfterWrite(date: string, isCurrent: () => boolean = () => true) {
    await Promise.all([
      reloadOverview(isCurrent),
      date === selectedHistory ? reloadHistoryDay(date, isCurrent) : null,
    ]);
  }

  function applyLeetcodeResult(result: LeetcodeChangeResult) {
    setToday((prev) =>
      prev && {
        ...prev,
        leetcodeWeekTiers: result.weekTiers,
        ...(prev.localDate === result.localDate
          ? { leetcodeTiers: result.tiers, leetcode: creditFor(result.count, prev.leetcode.cap) }
          : {}),
      },
    );
    const patchDay = (prev: ProgressDayDetail | null) =>
      prev && prev.date === result.localDate
        ? { ...prev, leetcodeTiers: result.tiers, leetcode: creditFor(result.count, prev.leetcode.cap) }
        : prev;
    setTodayDetail(patchDay);
    setHistoryDetail(patchDay);
    if (result.weeklyProgress != null) {
      const progress = result.weeklyProgress;
      setWeeklyGoals((prev) =>
        prev && {
          ...prev,
          goals: prev.goals.map((g) =>
            g.slot === "lc" ? { ...g, progressCount: progress, done: progress } : g,
          ),
        },
      );
    }
  }

  async function changeLeetcode(
    tier: LeetcodeTier,
    delta: 1 | -1,
    type: LeetcodeType,
    date?: string,
  ) {
    try {
      const result = await patchProgressLeetcode(tz, { tier, delta, type, date });
      setError(null);
      applyLeetcodeResult(result);
      if (result.points) setEarn(result.points);
      const seq = ++writeSeq.current;
      void refreshAfterWrite(result.localDate, () => seq === writeSeq.current).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "LeetCode update failed");
    }
  }

  useEffect(() => {
    void Promise.all([
      getTasks("open"),
      getTasks("completed", { includeApplicationCompleted: true }),
      getApplications("all"),
    ])
      .then(([openTasks, completedTasks, apps]) => {
        const seenTasks = new Set<string>();
        const taskOpts: ReflectionLinkOption[] = [];
        for (const t of openTasks.tasks) {
          if (seenTasks.has(t.id)) continue;
          seenTasks.add(t.id);
          const org = t.organization?.trim();
          const display = org ? `${org} · ${t.title}` : t.title;
          taskOpts.push({
            key: `task:${t.id}`,
            kind: "task",
            taskId: t.id,
            label: display,
            searchText: `${display} task open`.toLowerCase(),
          });
        }
        for (const t of completedTasks.tasks) {
          if (seenTasks.has(t.id)) continue;
          seenTasks.add(t.id);
          const org = t.organization?.trim();
          const base = org ? `${org} · ${t.title}` : t.title;
          const display = `${base} · done`;
          taskOpts.push({
            key: `task:${t.id}`,
            kind: "task",
            taskId: t.id,
            label: display,
            searchText: `${base} task done completed`.toLowerCase(),
          });
        }
        const appOpts: ReflectionLinkOption[] = apps.applications
          .filter((a) => a.status !== "todo")
          .map((a) => {
            const company = a.company ?? "Unknown";
            const title = a.title ?? "Untitled";
            const label = `${company} · ${title}`;
            return {
              key: `app:${a.id}`,
              kind: "application" as const,
              applicationId: a.id,
              label,
              searchText: `${label} app ${a.status}`.toLowerCase(),
            };
          });
        setLinkOptions([...taskOpts, ...appOpts]);
      })
      .catch(() => setLinkOptions([]));
  }, []);

  async function addReflection(
    input: {
      lane: ProgressLane;
      body: string;
      taskId: string | null;
      applicationId: string | null;
      interviewStepId: string | null;
    },
    localDate?: string,
  ) {
    await createProgressReflection({
      lane: input.lane,
      body: input.body,
      taskId: input.taskId,
      applicationId: input.applicationId,
      interviewStepId: input.interviewStepId,
      localDate: localDate ?? null,
      tz: localDate ? tz : null,
    });
    await refreshAfterWrite(localDate ?? today!.localDate);
  }

  async function saveReflection(
    id: string,
    patch: {
      body: string;
      lane: ProgressLane;
      taskId: string | null;
      applicationId: string | null;
      interviewStepId: string | null;
    },
    date: string,
  ) {
    await patchProgressReflection(id, {
      body: patch.body,
      lane: patch.lane,
      taskId: patch.taskId,
      applicationId: patch.applicationId,
      interviewStepId: patch.interviewStepId,
      ...(patch.taskId == null && patch.applicationId == null
        ? { clearLink: true }
        : {}),
    });
    await refreshAfterWrite(date);
  }

  if (error && !loaded) return <p className="error">{error}</p>;
  if (!loaded || !today || !week || !month) return <p className="muted">Loading…</p>;

  const marks = buildMarks(appHeat, techHeat);
  const heatWindow = appHeat.slice(-HEATMAP_DAYS);
  const techWindow = techHeat.slice(-HEATMAP_DAYS);
  const weeklyLcProgress =
    weeklyGoals?.goals.find((g) => g.slot === "lc")?.progressCount ?? 0;

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
        <button
          type="button"
          className={`tab ${tab === "ledger" ? "on" : ""}`}
          onClick={() => setTab("ledger")}
        >
          ledger
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {tab !== "ledger" && <EarnFlash earn={earn} onDismiss={dismissEarn} />}

      {tab === "today" ? (
        <>
          <header className="card progress-today-head">
            <span className="progress-kicker">
              Today · {formatShort(today.localDate)}
            </span>
            <TodayStrip today={today} />
          </header>

          <div className="progress-outcome-row">
            <div className="card progress-outcome-card">
              <span className="progress-kicker">This week</span>
              <strong>
                {week.applicationsLogged} apps · {week.leetcodeSolves} LC ·{" "}
                {week.reflectionsWritten}{" "}
                {week.reflectionsWritten === 1 ? "reflection" : "reflections"}
              </strong>
            </div>
            <div className="card progress-outcome-card">
              <span className="progress-kicker">This month</span>
              <strong>
                {month.applicationsLogged} apps · {month.leetcodeSolves} LC ·{" "}
                {month.reflectionsWritten}{" "}
                {month.reflectionsWritten === 1 ? "reflection" : "reflections"}
              </strong>
            </div>
          </div>

          {weeklyGoals && (
            <WeeklyGoalsBlock
              snapshot={weeklyGoals}
              onChange={(next) => setWeeklyGoals(next)}
              onCompleteTask={async (taskId) => {
                await completeTask(taskId);
                const next = await getWeeklyGoals(tz);
                setWeeklyGoals(next);
                await refreshAfterWrite(today.localDate);
              }}
            />
          )}

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

            <aside className="card progress-log-panel">
              <div className="card progress-lc-card">
                <h4 className="progress-section-title">LeetCode</h4>
                <LeetcodeLogger
                  tiers={today.leetcodeTiers}
                  weeklyProgress={weeklyLcProgress}
                  onChange={(tier, delta, type) => changeLeetcode(tier, delta, type)}
                />
              </div>
              <div className="lc-counts-aside">
                <p className="muted lc-day-line">
                  {lcCountsLine("Today", today.leetcodeTiers)}
                </p>
                <p className="muted lc-day-line">
                  {lcCountsLine("This week", today.leetcodeWeekTiers)}
                </p>
              </div>
              <h3 className="progress-section-title progress-daily-title">
                Daily progress
              </h3>
              <div className="progress-log-block progress-compose-block">
                <ReflectionCompose
                  lane={composeLane}
                  onLaneChange={setComposeLane}
                  linkKey={composeLinkKey}
                  onLinkKeyChange={setComposeLinkKey}
                  interviewStepId={composeStepId}
                  onInterviewStepIdChange={setComposeStepId}
                  linkOptions={linkOptions}
                  onDirtyChange={handleComposeDirtyChange}
                  onSubmit={(input) => addReflection(input)}
                />
              </div>
              <div className="progress-log-block progress-notes-block">
                <span className="progress-kicker">Today&apos;s notes</span>
                <ReflectionAccordion
                  reflections={todayDetail?.reflections ?? []}
                  canEdit
                  linkOptions={linkOptions}
                  onSave={(id, patch) => saveReflection(id, patch, today.localDate)}
                />
              </div>
              <div className="progress-log-block progress-apps-block">
                <span className="progress-kicker">Apps</span>
                <p className="progress-apps-summary">
                  {(todayDetail?.applications ?? today.applications).raw} logged ·{" "}
                  {(todayDetail?.applications ?? today.applications).earned}/3 earned
                </p>
                {(todayDetail?.applicationRows.length ?? 0) > 0 ? (
                  <ul className="progress-app-list">
                    {todayDetail!.applicationRows.map((app) => (
                      <li key={app.id}>
                        <Link to={`/applications/${app.id}`}>
                          {app.company ?? "Unknown"} · {app.title ?? "Untitled"}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No applications logged today.</p>
                )}
              </div>
            </aside>
          </div>
        </>
      ) : tab === "history" ? (
        <div className="progress-history">
          {monthAnchor && selectedHistory && (
            <HistoryCalendar
              monthAnchor={monthAnchor}
              today={today.localDate}
              selectedDate={selectedHistory}
              marks={marks}
              onMonthChange={(next) => setMonthAnchor(next)}
              onSelectDate={(date) => {
                guardedAction(() => {
                  setHistoryDate(date);
                  setEditingDay(false);
                });
              }}
            />
          )}

          <section className="card progress-log-panel progress-history-detail">
            <div className="progress-history-kicker-row">
              <p className="muted progress-kicker">Selected day</p>
              <label className="progress-edit-toggle">
                <input
                  type="checkbox"
                  checked={editingDay}
                  onChange={(event) => {
                    const next = event.target.checked;
                    if (!next) {
                      guardedAction(() => setEditingDay(false));
                      return;
                    }
                    setEditingDay(true);
                  }}
                />
                Edit this day
              </label>
            </div>
            <h3 className="progress-history-date">
              {selectedHistory ? formatLong(selectedHistory) : "—"}
            </h3>

            {!historyDetail ? (
              <p className="muted">Loading day…</p>
            ) : (
              <>
                <div className="progress-history-flow">
                  <div className="progress-lc-cluster">
                    {editingDay ? (
                      <>
                        <div className="card progress-lc-card">
                          <h4 className="progress-section-title">LeetCode</h4>
                          <LeetcodeLogger
                            tiers={historyDetail.leetcodeTiers}
                            fixedType="misc"
                            onChange={(tier, delta, type) =>
                              changeLeetcode(tier, delta, type, selectedHistory!)
                            }
                          />
                        </div>
                        <div className="lc-counts-aside">
                          <p className="muted lc-day-line">
                            {lcCountsLine("This day", historyDetail.leetcodeTiers)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <h4 className="progress-section-title">LeetCode</h4>
                        <p className="progress-lc-readonly">
                          {historyDetail.leetcode.raw} solved ·{" "}
                          {historyDetail.leetcode.earned}/3 earned
                        </p>
                      </>
                    )}
                  </div>

                  <div className="progress-log-block">
                    <span className="progress-kicker">Apps</span>
                    <p className="progress-apps-summary">
                      {historyDetail.applications.raw} logged ·{" "}
                      {historyDetail.applications.earned}/3 earned
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
                </div>

                {editingDay && (
                  <div className="progress-log-block">
                    <span className="progress-kicker">Add reflection</span>
                    <ReflectionCompose
                      lane={historyLane}
                      onLaneChange={setHistoryLane}
                      linkKey={historyLinkKey}
                      onLinkKeyChange={setHistoryLinkKey}
                      interviewStepId={historyStepId}
                      onInterviewStepIdChange={setHistoryStepId}
                      linkOptions={linkOptions}
                      onDirtyChange={handleComposeDirtyChange}
                      onSubmit={(input) => addReflection(input, selectedHistory!)}
                    />
                  </div>
                )}

                <div className="progress-log-block progress-notes-block">
                  <span className="progress-kicker">Notes</span>
                  <ReflectionAccordion
                    reflections={historyDetail.reflections}
                    canEdit={editingDay}
                    linkOptions={linkOptions}
                    onSave={(id, patch) =>
                      saveReflection(id, patch, selectedHistory!)
                    }
                  />
                </div>
              </>
            )}
          </section>
        </div>
      ) : (
        <section className="card progress-ledger">
          <div className="ledger-subtabs" role="tablist" aria-label="Ledger">
            <button
              type="button"
              className={
                ledgerView === "completions" ? "ledger-subtab on" : "ledger-subtab"
              }
              onClick={() => setLedgerView("completions")}
            >
              Completions
            </button>
            <button
              type="button"
              className={ledgerView === "points" ? "ledger-subtab on" : "ledger-subtab"}
              onClick={() => setLedgerView("points")}
            >
              Points
            </button>
          </div>
          {ledgerView === "completions" ? (
            <LedgerCompletionsPanel tz={tz} todayYmd={today.localDate} />
          ) : (
            <LedgerPointsPanel />
          )}
        </section>
      )}
      {leaveConfirmOpen && (
        <ModalLayer className="modal modal-compact" onClose={cancelLeave}>
          <StepActionConfirm
            title="Leave this page?"
            description="Your reflection draft will be lost if you leave now."
            confirmLabel="Leave"
            onCancel={cancelLeave}
            onConfirm={confirmLeave}
          />
        </ModalLayer>
      )}
    </section>
  );
}
