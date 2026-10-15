/**
 * Progress Past work — R8.4 / R8.13 / M8-04.
 * Layout A: calendar + always-editable day panel | 7-day completions.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createProgressReflection,
  getApplications,
  getProgressDay,
  getProgressHeatmap,
  getProgressToday,
  getTasks,
  patchProgressLeetcode,
  patchProgressReflection,
  type LeetcodeChangeResult,
  type LeetcodeTier,
  type LeetcodeType,
  type PointsEarnInfo,
  type ProgressDayDetail,
  type ProgressHeatmapDay,
  type ProgressLane,
  type ProgressToday,
} from "../../api";
import { useAchievementUnlocks } from "../achievements/AchievementUnlockHost";
import EarnFlash from "../completion/EarnFlash";
import ModalLayer from "../../ModalLayer";
import StepActionConfirm from "../../StepActionConfirm";
import { useBeforeUnloadDraftGuard } from "../../useUnsavedDraftGuard";
import HistoryCalendar, { type CalendarDayMark } from "./HistoryCalendar";
import LedgerCompletionsPanel from "./LedgerCompletionsPanel";
import LeetcodeLogger, { lcCountsLine } from "./LeetcodeLogger";
import ReflectionAccordion, {
  ReflectionCompose,
  type ReflectionLinkOption,
} from "./ReflectionAccordion";

function browserTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
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

function creditFor(raw: number, cap: number) {
  return { raw, earned: Math.min(raw, cap), cap };
}

/** Calendar intensity = apps + LC raw (R8.13). */
function buildMarks(
  appDays: ProgressHeatmapDay[],
  techDays: ProgressHeatmapDay[],
): Record<string, CalendarDayMark> {
  const marks: Record<string, CalendarDayMark> = {};
  for (const day of appDays) {
    marks[day.date] = { raw: day.raw };
  }
  for (const day of techDays) {
    const prev = marks[day.date];
    marks[day.date] = { raw: (prev?.raw ?? 0) + day.raw };
  }
  return marks;
}

export default function PastWorkPage() {
  const tz = useMemo(() => browserTz(), []);
  const navigate = useNavigate();
  const [today, setToday] = useState<ProgressToday | null>(null);
  const [appHeat, setAppHeat] = useState<ProgressHeatmapDay[]>([]);
  const [techHeat, setTechHeat] = useState<ProgressHeatmapDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<ProgressDayDetail | null>(null);
  const [monthAnchor, setMonthAnchor] = useState<string | null>(null);
  const [historyLane, setHistoryLane] = useState<ProgressLane>("application");
  const [historyLinkKey, setHistoryLinkKey] = useState("");
  const [historyStepId, setHistoryStepId] = useState("");
  const [linkOptions, setLinkOptions] = useState<ReflectionLinkOption[]>([]);
  const [composeDirty, setComposeDirty] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [earn, setEarn] = useState<PointsEarnInfo | null>(null);
  const dismissEarn = useCallback(() => setEarn(null), []);
  const { pushUnlocks } = useAchievementUnlocks();
  const [loaded, setLoaded] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const writeSeq = useRef(0);

  const focus = selectedDate ?? today?.localDate ?? null;
  const guardDraft = composeDirty;
  const leaveConfirmOpen = pendingLeave !== null;
  useBeforeUnloadDraftGuard(guardDraft);

  useEffect(() => {
    if (!guardDraft) return;
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a[href]") as
        | HTMLAnchorElement
        | null;
      if (!anchor || (anchor.target && anchor.target !== "_self")) return;
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

  const reloadHeat = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      const [todayRow, appRow, techRow] = await Promise.all([
        getProgressToday(tz),
        getProgressHeatmap(tz, "application", 400),
        getProgressHeatmap(tz, "technical", 400),
      ]);
      if (!isCurrent()) return todayRow;
      setToday(todayRow);
      setAppHeat(appRow.days);
      setTechHeat(techRow.days);
      setSelectedDate((prev) => prev ?? todayRow.localDate);
      setMonthAnchor((prev) => prev ?? `${todayRow.localDate.slice(0, 7)}-01`);
      return todayRow;
    },
    [tz],
  );

  const reloadDay = useCallback(
    async (date: string, isCurrent: () => boolean = () => true) => {
      const detail = await getProgressDay(tz, date);
      if (isCurrent()) setDayDetail(detail);
    },
    [tz],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reloadHeat(() => !cancelled);
        if (!cancelled) setLoaded(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadHeat]);

  useEffect(() => {
    if (!focus) return;
    let cancelled = false;
    (async () => {
      try {
        await reloadDay(focus, () => !cancelled);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load day");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [focus, reloadDay]);

  useEffect(() => {
    void Promise.all([
      getTasks("open"),
      getTasks("completed", { includeApplicationCompleted: true }),
      getApplications("all"),
    ])
      .then(([openTasks, completedTasks, apps]) => {
        const seenTasks = new Set<string>();
        const taskOpts: ReflectionLinkOption[] = [];
        for (const t of [...openTasks.tasks, ...completedTasks.tasks]) {
          if (seenTasks.has(t.id)) continue;
          seenTasks.add(t.id);
          const org = t.organization?.trim();
          const base = org ? `${org} · ${t.title}` : t.title;
          const done = t.status === "completed";
          const display = done ? `${base} · done` : base;
          taskOpts.push({
            key: `task:${t.id}`,
            kind: "task",
            taskId: t.id,
            label: display,
            searchText: `${base} task ${done ? "done completed" : "open"}`.toLowerCase(),
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

  async function refreshAfterWrite(date: string) {
    const seq = ++writeSeq.current;
    const isCurrent = () => seq === writeSeq.current;
    await Promise.all([reloadHeat(isCurrent), reloadDay(date, isCurrent)]);
    if (isCurrent()) setReloadToken((n) => n + 1);
  }

  function applyLeetcodeResult(result: LeetcodeChangeResult) {
    setDayDetail((prev) =>
      prev && prev.date === result.localDate
        ? {
            ...prev,
            leetcodeTiers: result.tiers,
            leetcode: creditFor(result.count, prev.leetcode.cap),
          }
        : prev,
    );
  }

  async function changeLeetcode(
    tier: LeetcodeTier,
    delta: 1 | -1,
    type: LeetcodeType,
    date: string,
  ) {
    try {
      const result = await patchProgressLeetcode(tz, { tier, delta, type, date });
      setError(null);
      applyLeetcodeResult(result);
      if (result.points) setEarn(result.points);
      pushUnlocks(result.achievementUnlocks);
      void refreshAfterWrite(result.localDate).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "LeetCode update failed");
    }
  }

  async function addReflection(
    input: {
      lane: ProgressLane;
      body: string;
      taskId: string | null;
      applicationId: string | null;
      interviewStepId: string | null;
    },
    localDate: string,
  ) {
    await createProgressReflection({
      lane: input.lane,
      body: input.body,
      taskId: input.taskId,
      applicationId: input.applicationId,
      interviewStepId: input.interviewStepId,
      localDate,
      tz,
    });
    await refreshAfterWrite(localDate);
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
      ...(patch.taskId == null && patch.applicationId == null ? { clearLink: true } : {}),
    });
    await refreshAfterWrite(date);
  }

  if (error && !loaded) return <p className="error">{error}</p>;
  if (!loaded || !today || !focus || !monthAnchor) {
    return <p className="muted">Loading…</p>;
  }

  const marks = buildMarks(appHeat, techHeat);

  return (
    <div className="progress-past-work">
      {error && <p className="error">{error}</p>}
      <EarnFlash earn={earn} onDismiss={dismissEarn} />

      <div className="progress-past-columns">
        <div className="progress-past-left">
          <HistoryCalendar
            monthAnchor={monthAnchor}
            today={today.localDate}
            selectedDate={focus}
            marks={marks}
            onMonthChange={(next) => setMonthAnchor(next)}
            onSelectDate={(date) => {
              guardedAction(() => setSelectedDate(date));
            }}
          />

          <section className="card progress-log-panel progress-history-detail">
            <p className="muted progress-kicker">Selected day</p>
            <h3 className="progress-history-date">{formatLong(focus)}</h3>

            {!dayDetail || dayDetail.date !== focus ? (
              <p className="muted">Loading day…</p>
            ) : (
              <>
                <div className="progress-history-flow">
                  <div className="progress-lc-cluster">
                    <div className="card progress-lc-card">
                      <h4 className="progress-section-title">LeetCode</h4>
                      <LeetcodeLogger
                        tiers={dayDetail.leetcodeTiers}
                        fixedType="misc"
                        onChange={(tier, delta, type) =>
                          changeLeetcode(tier, delta, type, focus)
                        }
                      />
                    </div>
                    <div className="lc-counts-aside">
                      <p className="muted lc-day-line">
                        {lcCountsLine("This day", dayDetail.leetcodeTiers)}
                      </p>
                    </div>
                  </div>

                  <div className="progress-log-block">
                    <span className="progress-kicker">Interviews</span>
                    {dayDetail.interviewRows.length > 0 ? (
                      <ul className="progress-app-list">
                        {dayDetail.interviewRows.map((step) => (
                          <li key={step.id}>
                            <Link to={step.href}>
                              {step.company ?? "Interview"} · {step.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">No interviews this day.</p>
                    )}
                  </div>

                  <div className="progress-log-block">
                    <span className="progress-kicker">Apps</span>
                    <p className="progress-apps-summary">
                      {dayDetail.applications.raw} logged ·{" "}
                      {dayDetail.applications.earned}/3 earned
                    </p>
                    {dayDetail.applicationRows.length > 0 ? (
                      <ul className="progress-app-list">
                        {dayDetail.applicationRows.map((app) => (
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
                    onSubmit={(input) => addReflection(input, focus)}
                  />
                </div>

                <div className="progress-log-block progress-notes-block">
                  <span className="progress-kicker">Notes</span>
                  <ReflectionAccordion
                    reflections={dayDetail.reflections}
                    canEdit
                    linkOptions={linkOptions}
                    onSave={(id, patch) => saveReflection(id, patch, focus)}
                  />
                </div>
              </>
            )}
          </section>
        </div>

        <section className="card progress-past-completions">
          <h3 className="progress-section-title">Completions</h3>
          <p className="muted progress-past-completions-hint">
            7 days ending on {formatLong(focus)}
          </p>
          <LedgerCompletionsPanel
            tz={tz}
            todayYmd={today.localDate}
            endDate={focus}
            days={7}
            hideStats
            hideWeeklyTab
            focusDate={focus}
            reloadToken={reloadToken}
          />
        </section>
      </div>

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
    </div>
  );
}
