/**
 * F11 M2-01 · Habits strip (Home + Progress). Verdict D: mark hit-target
 * checkoff, ghost archived, ChromeTabs. Add reflection / Log LC land in M2-02.
 */
import { useCallback, useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import {
  archiveCustomHabit,
  createCustomHabit,
  renameCustomHabit,
  restoreCustomHabit,
  setCustomHabitCheckoff,
  type PointsEarnInfo,
  type ProgressToday,
} from "../../api";
import ModalLayer from "../../ModalLayer";
import EarnFlash from "../completion/EarnFlash";
import {
  Button,
  ChromeTab,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextField,
} from "../../ui";

const CUSTOM_CAP = 3;

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

  const habits = today.habits ?? { active: [], archived: [] };
  const active = habits.active;
  const archived = habits.archived;
  const atCustomCap = active.length >= CUSTOM_CAP;
  const hasArchived = archived.length > 0;

  useEffect(() => {
    if (!hasArchived && section === "archived") setSection("active");
  }, [hasArchived, section]);

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

  const editing =
    editId != null
      ? active.find((h) => h.id === editId) ?? archived.find((h) => h.id === editId)
      : null;
  const archiveTarget =
    archiveConfirmId != null
      ? active.find((h) => h.id === archiveConfirmId) ??
        archived.find((h) => h.id === archiveConfirmId)
      : null;

  return (
    <section
      className={["habits-strip", "card", className].filter(Boolean).join(" ")}
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
        </div>
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
    </section>
  );
}
