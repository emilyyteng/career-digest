/**
 * F11 M0-01 · Habits strip (throwaway). Locked R1.8 / R.5 / R.7 chrome;
 * variants differ only on Q11 checkoff chrome, Q12 today-LC placement,
 * and Q14 archived look (via archLook).
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import ModalLayer from "../../ModalLayer";
import {
  Button,
  ChromeTab,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SelectField,
  TextAreaField,
  TextField,
} from "../../ui";
import {
  CUSTOM_CAP,
  MOCK_APPS,
  MOCK_LC,
  MOCK_LINK_OPTIONS,
  type ArchLook,
  type CustomHabit,
  type DerivedStreak,
} from "./fixtures";

export type CheckChrome = "dedicated" | "mark";
export type TodayLcMode = "expand" | "log";

export type HabitsStripProps = {
  checkChrome: CheckChrome;
  todayLcMode: TodayLcMode;
  archLook: ArchLook;
  customs: CustomHabit[];
  onCustomsChange: (next: CustomHabit[]) => void;
  /** Home shows Update progress → ; Progress does not. */
  surface: "home" | "progress";
  /** Live LC today counts (mock). */
  lcToday: DerivedStreak;
  onLcTodayChange: (next: DerivedStreak) => void;
  message: string | null;
  onMessage: (msg: string | null) => void;
};

type Section = "active" | "archived";

const TIERS = [
  { key: "easy", label: "Easy", pts: 20 },
  { key: "medium", label: "Medium", pts: 30 },
  { key: "hard", label: "Hard", pts: 50 },
] as const;

type TierKey = (typeof TIERS)[number]["key"];

function activeCustoms(customs: CustomHabit[]) {
  return customs
    .filter((h) => !h.archived)
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt);
}

function archivedCustoms(customs: CustomHabit[]) {
  return customs
    .filter((h) => h.archived)
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt);
}

function DerivedPill({
  label,
  streak,
  expandable,
  expanded,
  onToggleExpand,
}: {
  label: string;
  streak: DerivedStreak;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const n = Math.max(0, streak.completedToday);
  const className = [
    "f11-habit-pill",
    "f11-habit-pill-derived",
    streak.todayCounts ? "is-done" : "is-pending",
    expandable ? "is-expandable" : "",
    expanded ? "is-expanded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <div className="f11-habit-pill-top">
        <strong className="f11-habit-n">{streak.length}</strong>
        <span className="f11-habit-mark" aria-hidden="true">
          {streak.todayCounts ? "✓" : "−"}
        </span>
      </div>
      <span className="f11-habit-label">{label} daily streak</span>
      <span className="f11-habit-sub">
        {n} completed today
        {expandable && (
          <span className="f11-habit-expand-hint">
            {expanded ? " · hide log" : " · tap to log"}
          </span>
        )}
      </span>
    </>
  );

  if (expandable && onToggleExpand) {
    return (
      <button
        type="button"
        className={className}
        aria-expanded={expanded}
        aria-label={`${label} ${streak.length}-day daily streak, ${n} completed today. ${expanded ? "Hide" : "Show"} today’s LC controls`}
        onClick={onToggleExpand}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      className={className}
      aria-label={`${label} ${streak.length}-day daily streak, ${n} completed today`}
    >
      {body}
    </div>
  );
}

function MockLcTodayControls({
  counts,
  onChange,
}: {
  counts: Record<TierKey, number>;
  onChange: (tier: TierKey, delta: 1 | -1) => void;
}) {
  return (
    <div className="f11-lc-today" role="group" aria-label="Today’s LeetCode">
      <p className="f11-lc-today-title">Today’s LC</p>
      <div className="f11-lc-tier-list">
        {TIERS.map((t) => (
          <div key={t.key} className="f11-lc-tier">
            <span className="f11-lc-tier-name">
              {t.label}
              <span className="muted"> +{t.pts}</span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="f11-lc-step"
              disabled={counts[t.key] <= 0}
              aria-label={`Remove one ${t.label}`}
              onClick={() => onChange(t.key, -1)}
            >
              −
            </Button>
            <span className="f11-lc-count">{counts[t.key]}</span>
            <Button
              size="sm"
              variant="ghost"
              className="f11-lc-step"
              aria-label={`Add one ${t.label}`}
              onClick={() => onChange(t.key, 1)}
            >
              +
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomActivePill({
  habit,
  checkChrome,
  onToggle,
  onEdit,
}: {
  habit: CustomHabit;
  checkChrome: CheckChrome;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const sub = habit.doneToday ? "done" : "not yet";
  const base = [
    "f11-habit-pill",
    "f11-habit-pill-custom",
    habit.doneToday ? "is-done" : "is-pending",
    `check-${checkChrome}`,
  ].join(" ");

  // Same label metrics as Apps/LC; pencil is out of flow so it can't inflate the line box.
  const titleRow = (
    <span className="f11-habit-label f11-habit-label-edit">
      {habit.name} daily streak
      <button
        type="button"
        className="f11-habit-pencil"
        aria-label={`Edit ${habit.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        <span className="f11-pencil-flip" aria-hidden="true">
          ✎
        </span>
      </button>
    </span>
  );

  const markControl =
    checkChrome === "dedicated" ? (
      <Button
        size="sm"
        variant={habit.doneToday ? "primary" : "secondary"}
        className="f11-habit-check-btn"
        aria-pressed={habit.doneToday}
        aria-label={
          habit.doneToday
            ? `Undo checkoff for ${habit.name}`
            : `Check off ${habit.name} for today`
        }
        onClick={onToggle}
      >
        {habit.doneToday ? "✓" : "−"}
      </Button>
    ) : (
      <button
        type="button"
        className="f11-habit-mark-btn"
        aria-pressed={habit.doneToday}
        aria-label={
          habit.doneToday
            ? `Undo checkoff for ${habit.name}`
            : `Check off ${habit.name} for today`
        }
        onClick={onToggle}
      >
        {habit.doneToday ? "✓" : "−"}
      </button>
    );

  return (
    <div
      className={base}
      aria-label={`${habit.name} ${habit.length}-day daily streak, ${sub}`}
    >
      <div className="f11-habit-pill-top">
        <strong className="f11-habit-n">{habit.length}</strong>
        {markControl}
      </div>
      {titleRow}
      <span className="f11-habit-sub">{sub}</span>
    </div>
  );
}

function ArchivedCustom({
  habit,
  archLook,
  onRestore,
}: {
  habit: CustomHabit;
  archLook: ArchLook;
  onRestore: () => void;
}) {
  if (archLook === "list") {
    return (
      <div className="f11-arch-row">
        <div className="f11-arch-row-main">
          <strong>{habit.name}</strong>
          <span className="muted">
            {habit.length}-day streak · archived
          </span>
        </div>
        <Button size="sm" variant="secondary" onClick={onRestore}>
          Restore
        </Button>
      </div>
    );
  }

  if (archLook === "ghost") {
    return (
      <div className="f11-habit-pill f11-habit-pill-archived is-ghost">
        <span className="f11-arch-stamp">Archived</span>
        <strong className="f11-habit-n">{habit.length}</strong>
        <span className="f11-habit-label">{habit.name}</span>
        <span className="f11-habit-sub muted">streak paused from Active</span>
        <Button size="sm" variant="primary" className="f11-arch-restore" onClick={onRestore}>
          Restore
        </Button>
      </div>
    );
  }

  // mute (default)
  return (
    <div className="f11-habit-pill f11-habit-pill-archived is-mute">
      <strong className="f11-habit-n">{habit.length}</strong>
      <span className="f11-habit-label">{habit.name}</span>
      <span className="f11-habit-sub">archived · no checkoff</span>
      <Button size="sm" variant="ghost" className="f11-arch-restore" onClick={onRestore}>
        Restore
      </Button>
    </div>
  );
}

function CreateSlot({ onCreate }: { onCreate: () => void }) {
  return (
    <Button
      variant="ghost"
      className="f11-habit-create"
      aria-label="Create custom habit"
      onClick={onCreate}
    >
      <span className="f11-habit-create-plus">+</span>
      <span className="f11-habit-label">New habit</span>
    </Button>
  );
}

export default function HabitsStrip({
  checkChrome,
  todayLcMode,
  archLook,
  customs,
  onCustomsChange,
  surface,
  lcToday,
  onLcTodayChange,
  message,
  onMessage,
}: HabitsStripProps) {
  const [section, setSection] = useState<Section>("active");
  const [lcOpen, setLcOpen] = useState(false);
  const [tierCounts, setTierCounts] = useState<Record<TierKey, number>>({
    easy: 0,
    medium: 0,
    hard: 0,
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [reflectOpen, setReflectOpen] = useState(false);
  const [reflectLink, setReflectLink] = useState<string>(MOCK_LINK_OPTIONS[0]!.key);
  const [reflectBody, setReflectBody] = useState("");
  const [reflectLane, setReflectLane] = useState<"application" | "technical" | "other">(
    "technical",
  );
  const titleId = useId();
  const nextCreated = useRef(
    Math.max(0, ...customs.map((c) => c.createdAt)) + 1,
  );

  const active = activeCustoms(customs);
  const archived = archivedCustoms(customs);
  const atCustomCap = active.length >= CUSTOM_CAP;
  const hasArchived = archived.length > 0;

  function patchHabit(id: string, patch: Partial<CustomHabit>) {
    onCustomsChange(customs.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }

  function toggleDone(id: string) {
    const h = customs.find((c) => c.id === id);
    if (!h || h.archived) return;
    // Prototype: flip today's boolean only; streak length stays for scannability.
    patchHabit(id, { doneToday: !h.doneToday });
  }

  function restore(id: string) {
    if (atCustomCap) {
      onMessage(`Restore blocked: already at the custom cap (${CUSTOM_CAP}). Archive one first.`);
      return;
    }
    onMessage(null);
    const wasLast = archived.length === 1;
    patchHabit(id, { archived: false });
    if (wasLast) setSection("active");
  }

  useEffect(() => {
    if (!hasArchived && section === "archived") setSection("active");
  }, [hasArchived, section]);

  function archive(id: string) {
    patchHabit(id, { archived: true, doneToday: false });
    setEditId(null);
    setArchiveConfirmId(null);
    onMessage(null);
  }

  function applyRename() {
    const name = renameDraft.trim();
    if (!editId || !name) return;
    patchHabit(editId, { name: name.slice(0, 50) });
    setEditId(null);
  }

  function createHabit() {
    const name = createName.trim();
    if (!name || atCustomCap) return;
    const id = `h${Date.now()}`;
    nextCreated.current += 1;
    onCustomsChange([
      ...customs,
      {
        id,
        name: name.slice(0, 50),
        length: 0,
        doneToday: false,
        archived: false,
        createdAt: nextCreated.current,
      },
    ]);
    setCreateOpen(false);
    setCreateName("");
    setSection("active");
  }

  function stepLc(tier: TierKey, delta: 1 | -1) {
    setTierCounts((prev) => {
      const nextVal = Math.max(0, prev[tier] + delta);
      const next = { ...prev, [tier]: nextVal };
      const total = next.easy + next.medium + next.hard;
      onLcTodayChange({
        ...lcToday,
        completedToday: total,
        todayCounts: total > 0,
        length: total > 0 ? Math.max(1, MOCK_LC.length) : MOCK_LC.length,
      });
      return next;
    });
  }

  const editing = editId ? customs.find((c) => c.id === editId) : null;
  const archiveTarget = archiveConfirmId
    ? customs.find((c) => c.id === archiveConfirmId)
    : null;

  const lcPanel: ReactNode = lcOpen ? (
    <MockLcTodayControls counts={tierCounts} onChange={stepLc} />
  ) : null;

  const inlineActions = (
    <div className="f11-habits-inline-actions">
      <Button
        size="sm"
        variant="secondary"
        className="f11-add-reflection"
        onClick={() => setReflectOpen(true)}
      >
        Add reflection
        <span className="f11-pencil-flip" aria-hidden="true">
          ✎
        </span>
      </Button>
      {todayLcMode === "log" && (
        <button
          type="button"
          className={`f11-log-lc-disclosure${lcOpen ? " is-open" : ""}`}
          aria-expanded={lcOpen}
          onClick={() => setLcOpen((o) => !o)}
        >
          <span className="f11-log-lc-label">{lcOpen ? "Hide LC" : "Log LC"}</span>
          <span className="f11-log-lc-caret" aria-hidden="true">
            ▾
          </span>
        </button>
      )}
    </div>
  );

  return (
    <section className="f11-habits-strip card" aria-labelledby={titleId}>
      <div className="f11-habits-head">
        <h3 id={titleId} className="f11-habits-title">
          Habits
        </h3>
        <div className="ui-chrome-tabs f11-section-tabs" role="tablist" aria-label="Habits section">
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
            onClick={() => setSection("archived")}
          >
            Archived
          </ChromeTab>
        </div>
      </div>

      {message && (
        <p className="f11-strip-msg" role="status">
          {message}
        </p>
      )}

      {section === "active" ? (
        <>
          <div className="f11-habits-band">
            <div className="f11-habits-row">
              <DerivedPill label="Apps" streak={MOCK_APPS} />
              <DerivedPill
                label="LC"
                streak={lcToday}
                expandable={todayLcMode === "expand"}
                expanded={todayLcMode === "expand" && lcOpen}
                onToggleExpand={
                  todayLcMode === "expand" ? () => setLcOpen((o) => !o) : undefined
                }
              />
              {active.map((h) => (
                <CustomActivePill
                  key={h.id}
                  habit={h}
                  checkChrome={checkChrome}
                  onToggle={() => toggleDone(h.id)}
                  onEdit={() => {
                    setEditId(h.id);
                    setRenameDraft(h.name);
                  }}
                />
              ))}
              {!atCustomCap && <CreateSlot onCreate={() => setCreateOpen(true)} />}
            </div>
            {inlineActions}
          </div>
          {todayLcMode === "expand" && lcPanel}
          {todayLcMode === "log" && lcPanel}
        </>
      ) : (
        <>
          <div className="f11-habits-band">
            <div
              className={
                archLook === "list"
                  ? "f11-habits-arch-list"
                  : "f11-habits-row f11-habits-row-arch"
              }
            >
              {archived.map((h) => (
                <ArchivedCustom
                  key={h.id}
                  habit={h}
                  archLook={archLook}
                  onRestore={() => restore(h.id)}
                />
              ))}
            </div>
            {inlineActions}
          </div>
        </>
      )}

      {surface === "home" && (
        <div className="f11-habits-foot-link">
          <Link to="/progress" className="home-section-link f11-update-progress">
            Update progress →
          </Link>
        </div>
      )}

      {editing && !archiveConfirmId && (
        <ModalLayer
          className="modal modal-compact"
          labelledBy="f11-edit-title"
          onClose={() => setEditId(null)}
          dirty={renameDraft.trim() !== editing.name}
        >
          <ModalHeader id="f11-edit-title" title="Edit habit" />
          <ModalBody>
            <label className="f11-field-label">
              Name
              <TextField
                value={renameDraft}
                maxLength={50}
                onChange={(e) => setRenameDraft(e.target.value)}
              />
            </label>
            <p className="muted f11-hint">Rename keeps history. Archive removes it from Active.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setEditId(null)}>
              Cancel
            </Button>
            <Button
              variant="ghost"
              className="f11-btn-danger"
              onClick={() => setArchiveConfirmId(editing.id)}
            >
              Archive
            </Button>
            <Button variant="primary" disabled={!renameDraft.trim()} onClick={applyRename}>
              Save name
            </Button>
          </ModalFooter>
        </ModalLayer>
      )}

      {archiveTarget && (
        <ModalLayer
          className="modal modal-compact"
          labelledBy="f11-archive-title"
          onClose={() => setArchiveConfirmId(null)}
        >
          <ModalHeader id="f11-archive-title" title="Archive this habit?" />
          <ModalBody>
            <p className="f11-hint" style={{ marginTop: 0 }}>
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
              className="f11-btn-danger"
              onClick={() => archive(archiveTarget.id)}
            >
              Archive
            </Button>
          </ModalFooter>
        </ModalLayer>
      )}

      {createOpen && (
        <ModalLayer
          className="modal modal-compact"
          labelledBy="f11-create-title"
          onClose={() => setCreateOpen(false)}
          dirty={createName.trim().length > 0}
        >
          <ModalHeader id="f11-create-title" title="New habit" />
          <ModalBody>
            <label className="f11-field-label">
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
            <Button variant="primary" disabled={!createName.trim()} onClick={createHabit}>
              Create
            </Button>
          </ModalFooter>
        </ModalLayer>
      )}

      {reflectOpen && (
        <ModalLayer
          className="modal modal-compact"
          labelledBy="f11-reflect-title"
          onClose={() => setReflectOpen(false)}
          dirty={reflectBody.trim().length > 0}
        >
          <ModalHeader id="f11-reflect-title" title="Today’s reflection" />
          <ModalBody>
            <p className="muted f11-hint">
              Standalone add for today — no notes list, no apps list. Full day list stays in Past
              work.
            </p>
            <label className="f11-field-label">
              Link
              <SelectField
                value={reflectLink}
                onChange={(e) => setReflectLink(e.target.value)}
              >
                {MOCK_LINK_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </SelectField>
            </label>
            <label className="f11-field-label">
              Body
              <TextAreaField
                rows={4}
                value={reflectBody}
                onChange={(e) => setReflectBody(e.target.value)}
              />
            </label>
            <fieldset className="f11-lane-fieldset">
              <legend className="f11-field-label">Lane</legend>
              <div className="progress-lane-chips" role="group" aria-label="Reflection lane">
                {(["application", "technical", "other"] as const).map((lane) => (
                  <button
                    key={lane}
                    type="button"
                    className={
                      reflectLane === lane ? "progress-lane-chip is-on" : "progress-lane-chip"
                    }
                    onClick={() => setReflectLane(lane)}
                  >
                    {lane}
                  </button>
                ))}
              </div>
            </fieldset>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setReflectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!reflectBody.trim()}
              onClick={() => {
                onMessage(`Reflection saved (mock) · ${reflectLane} · ${reflectLink}`);
                setReflectBody("");
                setReflectOpen(false);
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
