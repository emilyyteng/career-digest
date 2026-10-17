/**
 * F11 M2-01 / M2-02 · Habits strip (Home + Progress). Verdict D chrome +
 * Add reflection modal and Log LC disclosure (Q12).
 */
import { useCallback, useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import {
  archiveCustomHabit,
  createCustomHabit,
  createProgressReflection,
  getApplications,
  getTasks,
  getWeeklyGoals,
  patchProgressLeetcode,
  renameCustomHabit,
  restoreCustomHabit,
  setCustomHabitCheckoff,
  type LeetcodeTier,
  type LeetcodeType,
  type PointsEarnInfo,
  type ProgressLane,
  type ProgressToday,
} from "../../api";
import ModalLayer from "../../ModalLayer";
import EarnFlash from "../completion/EarnFlash";
import { useAchievementUnlocks } from "../achievements/AchievementUnlockHost";
import LeetcodeLogger from "./LeetcodeLogger";
import {
  LaneChips,
  WorkLinkFields,
  type ReflectionLinkOption,
} from "./ReflectionAccordion";
import {
  Button,
  ChromeTab,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextAreaField,
  TextField,
} from "../../ui";

const CUSTOM_CAP = 6;

type Section = "active" | "archived";

type HabitRow = {
  id: string;
  name: string;
  length: number;
  todayCounts: boolean;
};

function DerivedPill({
  label,
  length,
  todayCounts,
  completedToday,
}: {
  label: string;
  length: number;
  todayCounts: boolean;
  completedToday: number;
}) {
  const n = Math.max(0, completedToday);
  return (
    <div
      className={
        todayCounts ? "habits-pill habits-pill-derived is-done" : "habits-pill habits-pill-derived is-pending"
      }
      aria-label={`${label} ${length}-day daily streak${todayCounts ? ", done today" : ", not yet today"}, ${n} completed today`}
    >
      <div className="habits-pill-top">
        <span className="habits-pill-top-lead">
          <strong className="habits-n">{length}</strong>
          <span className="habits-kind">daily streak</span>
        </span>
        <span className="habits-mark" aria-hidden="true">
          {todayCounts ? "✓" : "−"}
        </span>
      </div>
      <span className="habits-label">{label}</span>
      <span className="habits-sub">{n} completed today</span>
    </div>
  );
}

function CustomActivePill({
  habit,
  busy,
  onToggle,
  onEdit,
}: {
  habit: HabitRow;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const sub = habit.todayCounts ? "done" : "not yet";
  return (
    <div
      className={
        habit.todayCounts
          ? "habits-pill habits-pill-custom is-done"
          : "habits-pill habits-pill-custom is-pending"
      }
      aria-label={`${habit.name} ${habit.length}-day daily streak, ${sub}`}
    >
      <div className="habits-pill-top">
        <span className="habits-pill-top-lead">
          <strong className="habits-n">{habit.length}</strong>
          <span className="habits-kind">daily streak</span>
        </span>
        <button
          type="button"
          className="habits-mark-btn"
          disabled={busy}
          aria-pressed={habit.todayCounts}
          aria-label={
            habit.todayCounts
              ? `Undo checkoff for ${habit.name}`
              : `Check off ${habit.name} for today`
          }
          onClick={onToggle}
        >
          {habit.todayCounts ? "✓" : "−"}
        </button>
      </div>
      <span className="habits-label habits-label-edit">
        {habit.name}
        <button
          type="button"
          className="habits-pencil"
          disabled={busy}
          aria-label={`Edit ${habit.name}`}
          onClick={onEdit}
        >
          <span className="habits-pencil-flip" aria-hidden="true">
            ✎
          </span>
        </button>
      </span>
      <span className="habits-sub">{sub}</span>
    </div>
  );
}

function ArchivedCustom({
  habit,
  busy,
  onRestore,
}: {
  habit: HabitRow;
  busy: boolean;
  onRestore: () => void;
}) {
  return (
    <div className="habits-pill habits-pill-archived is-ghost">
      <span className="habits-arch-stamp">Archived</span>
      <div className="habits-pill-top">
        <span className="habits-pill-top-lead">
          <strong className="habits-n">{habit.length}</strong>
          <span className="habits-kind">daily streak</span>
        </span>
      </div>
      <span className="habits-label">{habit.name}</span>
      <span className="habits-sub muted">streak paused from Active</span>
      <Button
        size="sm"
        variant="primary"
        className="habits-arch-restore"
        disabled={busy}
        onClick={onRestore}
      >
        Restore
      </Button>
    </div>
  );
}

function CreateSlot({ disabled, onCreate }: { disabled: boolean; onCreate: () => void }) {
  return (
    <Button
      variant="ghost"
      className="habits-create"
      disabled={disabled}
      aria-label="Create custom habit"
      onClick={onCreate}
    >
      <span className="habits-create-plus">+</span>
      <span className="habits-label">New habit</span>
    </Button>
  );
}

async function loadReflectionLinkOptions(): Promise<ReflectionLinkOption[]> {
  const [openTasks, completedTasks, apps] = await Promise.all([
    getTasks("open"),
    getTasks("completed", { includeApplicationCompleted: true }),
    getApplications("all"),
  ]);
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
  return [...taskOpts, ...appOpts];
}

export default function HabitsStrip({
  today,
  tz,
  surface,
  onRefresh,
  className = "",
}: {
  today: ProgressToday;
  tz: string;
  surface: "home" | "progress";
  /** Reload progress/today after mutations (parent owns fetch). */
  onRefresh: () => Promise<void>;
  className?: string;
}) {
  const titleId = useId();
  const { pushUnlocks } = useAchievementUnlocks();
  const [section, setSection] = useState<Section>("active");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [earn, setEarn] = useState<PointsEarnInfo | null>(null);
  const dismissEarn = useCallback(() => setEarn(null), []);
  const [editId, setEditId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");

  const [lcOpen, setLcOpen] = useState(false);
  const [weeklyLcProgress, setWeeklyLcProgress] = useState(0);
  const [reflectOpen, setReflectOpen] = useState(false);
  const [reflectBody, setReflectBody] = useState("");
  const [reflectLane, setReflectLane] = useState<ProgressLane>("technical");
  const [reflectLinkKey, setReflectLinkKey] = useState("");
  const [reflectStepId, setReflectStepId] = useState("");
  const [linkOptions, setLinkOptions] = useState<ReflectionLinkOption[]>([]);
  const [reflectBusy, setReflectBusy] = useState(false);

  const habits = today.habits ?? { active: [], archived: [] };
  const active = habits.active;
  const archived = habits.archived;
  const atCustomCap = active.length >= CUSTOM_CAP;
  const hasArchived = archived.length > 0;

  useEffect(() => {
    if (!hasArchived && section === "archived") setSection("active");
  }, [hasArchived, section]);

  useEffect(() => {
    if (section === "archived") setLcOpen(false);
  }, [section]);

  useEffect(() => {
    void getWeeklyGoals(tz)
      .then((snap) => {
        const lc = snap.goals.find((g) => g.slot === "lc");
        setWeeklyLcProgress(lc?.progressCount ?? 0);
      })
      .catch(() => setWeeklyLcProgress(0));
  }, [tz, today.localDate, today.leetcode.raw]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await onRefresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function openReflect() {
    setMessage(null);
    setReflectBody("");
    setReflectLane("technical");
    setReflectLinkKey("");
    setReflectStepId("");
    setReflectOpen(true);
    try {
      setLinkOptions(await loadReflectionLinkOptions());
    } catch {
      setLinkOptions([]);
    }
  }

  async function changeLeetcode(tier: LeetcodeTier, delta: 1 | -1, type: LeetcodeType) {
    setMessage(null);
    try {
      const result = await patchProgressLeetcode(tz, { tier, delta, type });
      if (result.points) setEarn(result.points);
      pushUnlocks(result.achievementUnlocks);
      if (result.weeklyProgress != null) setWeeklyLcProgress(result.weeklyProgress);
      await onRefresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "LeetCode update failed");
    }
  }

  const editing =
    editId != null
      ? active.find((h) => h.id === editId) ?? archived.find((h) => h.id === editId)
      : null;
  const archiveTarget =
    archiveConfirmId != null
      ? active.find((h) => h.id === archiveConfirmId) ??
        archived.find((h) => h.id === archiveConfirmId)
      : null;

  const inlineActions = (
    <div className="habits-inline-actions">
      <Button
        size="sm"
        variant="secondary"
        className="habits-add-reflection"
        onClick={() => void openReflect()}
      >
        Add reflection
        <span className="habits-pencil-flip" aria-hidden="true">
          ✎
        </span>
      </Button>
      {section === "active" && (
        <button
          type="button"
          className={`habits-log-lc-disclosure${lcOpen ? " is-open" : ""}`}
          aria-expanded={lcOpen}
          onClick={() => setLcOpen((o) => !o)}
        >
          <span className="habits-log-lc-label">{lcOpen ? "Hide LC" : "Log LC"}</span>
          <span className="habits-log-lc-caret" aria-hidden="true">
            {lcOpen ? "▴" : "▾"}
          </span>
        </button>
      )}
    </div>
  );

  return (
    <section
      className={["habits-strip", className].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
    >
      <EarnFlash earn={earn} onDismiss={dismissEarn} />
      <div className="habits-head">
        <h3 id={titleId} className="habits-title">
          Habits
        </h3>
        <div className="ui-chrome-tabs habits-section-tabs" role="tablist" aria-label="Habits section">
          <ChromeTab
            size="page"
            active={section === "active"}
            aria-selected={section === "active"}
            onClick={() => setSection("active")}
          >
            Active
          </ChromeTab>
          <ChromeTab
            size="page"
            active={section === "archived"}
            aria-selected={section === "archived"}
            disabled={!hasArchived}
            title={!hasArchived ? "No archived customs" : undefined}
            onClick={() => hasArchived && setSection("archived")}
          >
            Archived
          </ChromeTab>
        </div>
      </div>

      {message && (
        <p className="habits-strip-msg" role="status">
          {message}
        </p>
      )}

      {section === "active" ? (
        <>
          <div className="habits-band">
            <div className="habits-row">
              <DerivedPill
                label="Applications"
                length={today.streaks.apps.length}
                todayCounts={today.streaks.apps.todayCounts}
                completedToday={today.applications.raw}
              />
              <DerivedPill
                label="LeetCode"
                length={today.streaks.lc.length}
                todayCounts={today.streaks.lc.todayCounts}
                completedToday={today.leetcode.raw}
              />
              {active.map((h) => (
                <CustomActivePill
                  key={h.id}
                  habit={h}
                  busy={busy}
                  onToggle={() =>
                    void run(async () => {
                      const result = await setCustomHabitCheckoff(
                        tz,
                        h.id,
                        !h.todayCounts,
                      );
                      if (result.points) setEarn(result.points);
                    })
                  }
                  onEdit={() => {
                    setEditId(h.id);
                    setRenameDraft(h.name);
                    setMessage(null);
                  }}
                />
              ))}
              {!atCustomCap && (
                <CreateSlot
                  disabled={busy}
                  onCreate={() => {
                    setCreateOpen(true);
                    setCreateName("");
                    setMessage(null);
                  }}
                />
              )}
            </div>
            {inlineActions}
          </div>
          {lcOpen && (
            <div className="habits-lc-panel">
              <LeetcodeLogger
                tiers={today.leetcodeTiers}
                weeklyTiers={today.leetcodeWeeklyTiers}
                weeklyProgress={weeklyLcProgress}
                onChange={changeLeetcode}
              />
            </div>
          )}
        </>
      ) : (
        <div className="habits-band">
          <div className="habits-row habits-row-arch">
            {archived.map((h) => (
              <ArchivedCustom
                key={h.id}
                habit={h}
                busy={busy}
                onRestore={() =>
                  void run(async () => {
                    await restoreCustomHabit(tz, h.id);
                    if (archived.length === 1) setSection("active");
                  })
                }
              />
            ))}
          </div>
          {inlineActions}
        </div>
      )}

      {surface === "home" && (
        <div className="habits-foot-link">
          <Link to="/progress" className="home-section-link habits-update-progress">
            Update progress →
          </Link>
        </div>
      )}

      {editing && !archiveConfirmId && (
        <ModalLayer
          className="modal modal-compact"
          labelledBy="habits-edit-title"
          onClose={() => setEditId(null)}
          dirty={renameDraft.trim() !== editing.name}
        >
          <ModalHeader id="habits-edit-title" title="Edit habit" />
          <ModalBody>
            <label className="habits-field-label">
              Name
              <TextField
                value={renameDraft}
                maxLength={50}
                onChange={(e) => setRenameDraft(e.target.value)}
              />
            </label>
            <p className="muted habits-hint">
              Rename keeps history. Archive removes it from Active.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setEditId(null)}>
              Cancel
            </Button>
            <Button
              variant="ghost"
              className="habits-btn-danger"
              onClick={() => setArchiveConfirmId(editing.id)}
            >
              Archive
            </Button>
            <Button
              variant="primary"
              disabled={!renameDraft.trim() || busy}
              onClick={() =>
                void run(async () => {
                  await renameCustomHabit(tz, editing.id, renameDraft.trim());
                  setEditId(null);
                })
              }
            >
              Save name
            </Button>
          </ModalFooter>
        </ModalLayer>
      )}

      {archiveTarget && (
        <ModalLayer
          className="modal modal-compact"
          labelledBy="habits-archive-title"
          onClose={() => setArchiveConfirmId(null)}
        >
          <ModalHeader id="habits-archive-title" title="Archive this habit?" />
          <ModalBody>
            <p className="habits-hint" style={{ marginTop: 0 }}>
              <strong>{archiveTarget.name}</strong> will leave Active. It won’t earn streak points
              until you restore it. History stays with the habit.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setArchiveConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="ghost"
              className="habits-btn-danger"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await archiveCustomHabit(tz, archiveTarget.id);
                  setEditId(null);
                  setArchiveConfirmId(null);
                })
              }
            >
              Archive
            </Button>
          </ModalFooter>
        </ModalLayer>
      )}

      {createOpen && (
        <ModalLayer
          className="modal modal-compact"
          labelledBy="habits-create-title"
          onClose={() => setCreateOpen(false)}
          dirty={createName.trim().length > 0}
        >
          <ModalHeader id="habits-create-title" title="New habit" />
          <ModalBody>
            <label className="habits-field-label">
              Name
              <TextField
                value={createName}
                maxLength={50}
                placeholder="e.g. Gym"
                autoFocus
                onChange={(e) => setCreateName(e.target.value)}
              />
            </label>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!createName.trim() || busy}
              onClick={() =>
                void run(async () => {
                  await createCustomHabit(tz, createName.trim());
                  setCreateOpen(false);
                  setCreateName("");
                  setSection("active");
                })
              }
            >
              Create
            </Button>
          </ModalFooter>
        </ModalLayer>
      )}

      {reflectOpen && (
        <ModalLayer
          className="modal modal-compact"
          labelledBy="habits-reflect-title"
          onClose={() => setReflectOpen(false)}
          dirty={reflectBody.trim().length > 0}
        >
          <ModalHeader id="habits-reflect-title" title="Today’s reflection" />
          <ModalBody>
            <p className="muted habits-hint" style={{ marginTop: 0 }}>
              Standalone add for today — no notes list, no apps list. Full day list stays in Past
              work.
            </p>
            <WorkLinkFields
              linkKey={reflectLinkKey}
              onLinkKeyChange={(key) => {
                setReflectLinkKey(key);
                setReflectStepId("");
              }}
              linkOptions={linkOptions}
              interviewStepId={reflectStepId}
              onInterviewStepIdChange={setReflectStepId}
              disabled={reflectBusy}
            />
            <label className="habits-field-label">
              Body
              <TextAreaField
                rows={4}
                value={reflectBody}
                disabled={reflectBusy}
                onChange={(e) => setReflectBody(e.target.value)}
              />
            </label>
            <div className="habits-reflect-lane">
              <LaneChips
                value={reflectLane}
                onChange={setReflectLane}
                disabled={reflectBusy}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setReflectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!reflectBody.trim() || reflectBusy}
              onClick={() => {
                if (!reflectBody.trim() || reflectBusy) return;
                const opt = linkOptions.find((o) => o.key === reflectLinkKey);
                void (async () => {
                  setReflectBusy(true);
                  setMessage(null);
                  try {
                    await createProgressReflection({
                      lane: reflectLane,
                      body: reflectBody.trim(),
                      taskId: opt?.taskId ?? null,
                      applicationId: opt?.applicationId ?? null,
                      interviewStepId:
                        opt?.applicationId && reflectStepId ? reflectStepId : null,
                      localDate: today.localDate,
                      tz,
                    });
                    setReflectOpen(false);
                    setReflectBody("");
                    await onRefresh();
                  } catch (err) {
                    setMessage(
                      err instanceof Error ? err.message : "Could not add reflection",
                    );
                  } finally {
                    setReflectBusy(false);
                  }
                })();
              }}
            >
              Add reflection
            </Button>
          </ModalFooter>
        </ModalLayer>
      )}
    </section>
  );
}
