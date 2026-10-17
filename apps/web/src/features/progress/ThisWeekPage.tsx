/**
 * Progress This week — R8.10 / M8-03.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createProgressReflection,
  getApplications,
  getProgressCompletions,
  getProgressDay,
  getProgressToday,
  getTasks,
  getWeeklyGoals,
  patchProgressLeetcode,
  patchProgressReflection,
  type CompletionPulseCounts,
  type LeetcodeChangeResult,
  type LeetcodeTier,
  type LeetcodeType,
  type PointsEarnInfo,
  type ProgressDayDetail,
  type ProgressLane,
  type ProgressToday,
  type WeeklyGoalsSnapshot,
} from "../../api";
import NextAchievements from "../achievements/NextAchievements";
import { useAchievementUnlocks } from "../achievements/AchievementUnlockHost";
import EarnFlash from "../completion/EarnFlash";
import ModalLayer from "../../ModalLayer";
import StepActionConfirm from "../../StepActionConfirm";
import { useBeforeUnloadDraftGuard } from "../../useUnsavedDraftGuard";
import LeetcodeLogger, { lcCountsLine } from "./LeetcodeLogger";
import { formatPulseLine } from "./pulseFormat";
import ReflectionAccordion, {
  ReflectionCompose,
  type ReflectionLinkOption,
} from "./ReflectionAccordion";
import HabitsStrip from "./HabitsStrip";
import WeeklyGoalsBlock from "./WeeklyGoalsBlock";

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

function creditFor(raw: number, cap: number) {
  return { raw, earned: Math.min(raw, cap), cap };
}

export default function ThisWeekPage() {
  const tz = useMemo(() => browserTz(), []);
  const navigate = useNavigate();
  const [today, setToday] = useState<ProgressToday | null>(null);
  const [weekPulse, setWeekPulse] = useState<CompletionPulseCounts | null>(null);
  const [monthPulse, setMonthPulse] = useState<CompletionPulseCounts | null>(null);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoalsSnapshot | null>(null);
  const [todayDetail, setTodayDetail] = useState<ProgressDayDetail | null>(null);
  const [composeLane, setComposeLane] = useState<ProgressLane>("application");
  const [composeLinkKey, setComposeLinkKey] = useState("");
  const [composeStepId, setComposeStepId] = useState("");
  const [linkOptions, setLinkOptions] = useState<ReflectionLinkOption[]>([]);
  const [composeDirty, setComposeDirty] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [earn, setEarn] = useState<PointsEarnInfo | null>(null);
  const dismissEarn = useCallback(() => setEarn(null), []);
  const { pushUnlocks } = useAchievementUnlocks();
  const [loaded, setLoaded] = useState(false);
  const writeSeq = useRef(0);

  const guardDraft = composeDirty;
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

  function cancelLeave() {
    setPendingLeave(null);
  }

  function confirmLeave() {
    setComposeDirty(false);
    const action = pendingLeave;
    setPendingLeave(null);
    action?.();
  }

  const reload = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      const [todayRow, diary, goals] = await Promise.all([
        getProgressToday(tz),
        getProgressCompletions(tz, { limit: 1 }),
        getWeeklyGoals(tz),
      ]);
      const detail = await getProgressDay(tz, todayRow.localDate);
      if (!isCurrent()) return;
      setToday(todayRow);
      setWeekPulse(diary.stats.week);
      setMonthPulse(diary.stats.month);
      setWeeklyGoals(goals);
      setTodayDetail(detail);
    },
    [tz],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload(() => !cancelled);
        if (!cancelled) setLoaded(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

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

  function applyLeetcodeResult(result: LeetcodeChangeResult) {
    setToday((prev) =>
      prev && {
        ...prev,
        leetcodeWeekTiers: result.weekTiers,
        ...(prev.localDate === result.localDate
          ? {
              leetcodeTiers: result.tiers,
              leetcodeWeeklyTiers: result.weeklyTiers,
              leetcode: creditFor(result.count, prev.leetcode.cap),
            }
          : {}),
      },
    );
    setTodayDetail((prev) =>
      prev && prev.date === result.localDate
        ? { ...prev, leetcodeTiers: result.tiers, leetcode: creditFor(result.count, prev.leetcode.cap) }
        : prev,
    );
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

  async function changeLeetcode(tier: LeetcodeTier, delta: 1 | -1, type: LeetcodeType) {
    try {
      const result = await patchProgressLeetcode(tz, { tier, delta, type });
      setError(null);
      applyLeetcodeResult(result);
      if (result.points) setEarn(result.points);
      pushUnlocks(result.achievementUnlocks);
      const seq = ++writeSeq.current;
      void reload(() => seq === writeSeq.current).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "LeetCode update failed");
    }
  }

  async function addReflection(input: {
    lane: ProgressLane;
    body: string;
    taskId: string | null;
    applicationId: string | null;
    interviewStepId: string | null;
  }) {
    await createProgressReflection({
      lane: input.lane,
      body: input.body,
      taskId: input.taskId,
      applicationId: input.applicationId,
      interviewStepId: input.interviewStepId,
      localDate: null,
      tz: null,
    });
    await reload();
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
  ) {
    await patchProgressReflection(id, {
      body: patch.body,
      lane: patch.lane,
      taskId: patch.taskId,
      applicationId: patch.applicationId,
      interviewStepId: patch.interviewStepId,
      ...(patch.taskId == null && patch.applicationId == null ? { clearLink: true } : {}),
    });
    await reload();
  }

  if (error && !loaded) return <p className="error">{error}</p>;
  if (!loaded || !today || !weekPulse || !monthPulse) {
    return <p className="muted">Loading…</p>;
  }

  const weeklyLcProgress =
    weeklyGoals?.goals.find((g) => g.slot === "lc")?.progressCount ?? 0;

  return (
    <div className="progress-this-week">
      {error && <p className="error">{error}</p>}
      <EarnFlash earn={earn} onDismiss={dismissEarn} />

      <div className="card progress-today-head">
        <span className="progress-kicker">Today · {formatShort(today.localDate)}</span>
        <HabitsStrip
          today={today}
          tz={tz}
          surface="progress"
          onRefresh={async () => {
            const next = await getProgressToday(tz);
            setToday(next);
          }}
        />
      </div>

      <div className="progress-outcome-row">
        <div className="card progress-outcome-card">
          <span className="progress-kicker">This week</span>
          <strong>{formatPulseLine(weekPulse)}</strong>
          <span className="ledger-stat-mins">{weekPulse.minutes} minutes worked</span>
        </div>
        <div className="card progress-outcome-card">
          <span className="progress-kicker">This month</span>
          <strong>{formatPulseLine(monthPulse)}</strong>
          <span className="ledger-stat-mins">{monthPulse.minutes} minutes worked</span>
        </div>
      </div>

      <div className="progress-week-split">
        <div className="progress-week-main">
          {weeklyGoals && (
            <WeeklyGoalsBlock
              snapshot={weeklyGoals}
              onChange={(next) => setWeeklyGoals(next)}
            />
          )}
          <NextAchievements />
        </div>

        <div className="progress-week-aside">
          <section className="card progress-lc-panel">
            <h4 className="progress-section-title">LeetCode</h4>
            <LeetcodeLogger
              tiers={today.leetcodeTiers}
              weeklyTiers={today.leetcodeWeeklyTiers}
              weeklyProgress={weeklyLcProgress}
              onChange={(tier, delta, type) => changeLeetcode(tier, delta, type)}
            />
            <div className="lc-counts-aside">
              <p className="muted lc-day-line">{lcCountsLine("Today", today.leetcodeTiers)}</p>
              <p className="muted lc-day-line">
                {lcCountsLine("This week", today.leetcodeWeekTiers)}
              </p>
            </div>
          </section>

          <aside className="card progress-daily-panel">
            <h3 className="progress-section-title progress-daily-title">Daily progress</h3>
            <div className="progress-day-stack">
              <div className="progress-log-block">
                <span className="progress-kicker">Add reflection</span>
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
              <div className="progress-log-block">
                <span className="progress-kicker">Notes</span>
                <ReflectionAccordion
                  reflections={todayDetail?.reflections ?? []}
                  canEdit
                  linkOptions={linkOptions}
                  onSave={(id, patch) => saveReflection(id, patch)}
                />
              </div>
              <div className="progress-log-block">
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
                  <p className="progress-day-empty">No applications logged today.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
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
