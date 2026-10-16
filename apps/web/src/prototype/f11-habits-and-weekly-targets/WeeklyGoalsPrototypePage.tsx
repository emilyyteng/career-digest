/**
 * F11 M0-02 · Weekly goals column + multi-goal incrementer + Home Targets.
 *
 * Design questions (variants differ only on these):
 *   Q13 — weekly ± chrome: classic stepper vs field+± vs field-only
 *   Q14 — weekly Active/Archived look (default: M0-01 ghost stamp; mute for compare)
 *
 * Locked from M0-01: Habits strip above is a stand-in (Log LC / mark checkoff / ghost).
 * Do not place today-LC in the incrementer. No apps ±.
 *
 * Ticket: docs/features/F11-habits-and-weekly-targets/tickets/M0/M0-02-prototype-weekly-goals-incrementer.md
 */
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ModalLayer from "../../ModalLayer";
import {
  Button,
  ChromeTab,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextField,
} from "../../ui";
import F11Shell, { HUB_PATH, ParamToggle, useParam, useVariant } from "./F11Shell";
import { MOCK_PULSE } from "./fixtures";
import {
  CUSTOM_WEEKLY_CAP,
  recomputePace,
  seedWeeklyGoals,
  unmetForTargets,
  WEEKLY_CAP_SCENARIOS,
  type CapScenario,
  type WeeklyGoal,
} from "./weeklyFixtures";

export type PlusChrome = "stepper" | "field-step" | "field";

const VARIANTS = [
  { key: "A", name: "Q13 classic stepper (− N +)" },
  { key: "B", name: "Q13 field flanked by ±" },
  { key: "C", name: "Q13 field-only (blur commit)" },
] as const;

function variantChrome(key: string): PlusChrome {
  if (key === "B") return "field-step";
  if (key === "C") return "field";
  return "stepper";
}

function GoalBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div
      className="f11w-goal-bar"
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

function WeeksFlame({ weeks }: { weeks: number }) {
  if (weeks < 2) return null;
  return (
    <span className="f11w-flame" aria-label={`${weeks} weeks in a row`}>
      🔥 {weeks} weeks in a row
    </span>
  );
}

function TargetStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <label className="f11w-target-step">
      <span className="muted">Target</span>
      <span className="f11w-target-controls">
        <Button
          size="sm"
          variant="ghost"
          className="f11w-tiny"
          disabled={value <= 1}
          aria-label={`Decrease ${label} target`}
          onClick={() => onChange(Math.max(1, value - 1))}
        >
          −
        </Button>
        <span className="f11w-target-n">{value}</span>
        <Button
          size="sm"
          variant="ghost"
          className="f11w-tiny"
          aria-label={`Increase ${label} target`}
          onClick={() => onChange(value + 1)}
        >
          +
        </Button>
      </span>
    </label>
  );
}

function ProgressControl({
  chrome,
  done,
  onDelta,
  onSet,
  label,
}: {
  chrome: PlusChrome;
  done: number;
  onDelta: (d: 1 | -1) => void;
  onSet: (n: number) => void;
  label: string;
}) {
  const [draft, setDraft] = useState(String(done));
  useEffect(() => {
    setDraft(String(done));
  }, [done]);

  if (chrome === "stepper") {
    return (
      <div className="f11w-plus-row" role="group" aria-label={`${label} weekly progress`}>
        <Button
          size="sm"
          variant="ghost"
          className="f11w-tiny"
          disabled={done <= 0}
          aria-label={`Decrease ${label}`}
          onClick={() => onDelta(-1)}
        >
          −
        </Button>
        <span className="f11w-plus-count">{done}</span>
        <Button
          size="sm"
          variant="ghost"
          className="f11w-tiny"
          aria-label={`Increase ${label}`}
          onClick={() => onDelta(1)}
        >
          +
        </Button>
      </div>
    );
  }

  if (chrome === "field-step") {
    return (
      <div className="f11w-plus-row f11w-plus-field-step" role="group" aria-label={`${label} weekly progress`}>
        <Button
          size="sm"
          variant="ghost"
          className="f11w-tiny"
          disabled={done <= 0}
          aria-label={`Decrease ${label}`}
          onClick={() => onDelta(-1)}
        >
          −
        </Button>
        <TextField
          type="number"
          fieldSize="num"
          className="f11w-plus-field"
          min={0}
          value={draft}
          aria-label={`${label} count`}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = Number(draft);
            if (Number.isInteger(n) && n >= 0) onSet(n);
            else setDraft(String(done));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          className="f11w-tiny"
          aria-label={`Increase ${label}`}
          onClick={() => onDelta(1)}
        >
          +
        </Button>
      </div>
    );
  }

  return (
    <label className="f11w-plus-field-only">
      <span className="visually-hidden">{label} weekly progress</span>
      <TextField
        type="number"
        fieldSize="num"
        className="f11w-plus-field"
        min={0}
        value={draft}
        aria-label={`${label} count`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = Number(draft);
          if (Number.isInteger(n) && n >= 0) onSet(n);
          else setDraft(String(done));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    </label>
  );
}

function StripStandIn() {
  return (
    <div className="f11w-strip-standin card" aria-label="Habits strip stand-in (M0-01 locked)">
      <div className="f11-habits-head">
        <h3 className="f11-habits-title">Habits</h3>
        <div className="ui-chrome-tabs f11-section-tabs">
          <ChromeTab size="page" active>
            Active
          </ChromeTab>
          <ChromeTab size="page" disabled title="Stand-in">
            Archived
          </ChromeTab>
        </div>
      </div>
      <p className="muted f11w-standin-note">
        M0-01 locked stand-in — mark checkoff · Log LC disclosure · ghost archived. Not re-litigated
        here; no today-LC in the weekly incrementer below.
      </p>
    </div>
  );
}

export default function WeeklyGoalsPrototypePage() {
  const variant = useVariant(VARIANTS);
  const chrome = variantChrome(variant);
  const cap = useParam(
    "cap",
    WEEKLY_CAP_SCENARIOS.map((s) => s.key),
  ) as CapScenario;
  const archLook = useParam("arch", ["ghost", "mute"] as const);

  const [goals, setGoals] = useState(() => seedWeeklyGoals(cap));
  const [section, setSection] = useState<"active" | "archived">("active");
  const [message, setMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createTarget, setCreateTarget] = useState(3);
  const [editId, setEditId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const nextCreated = useRef(10);
  const titleId = useId();

  useEffect(() => {
    setGoals(seedWeeklyGoals(cap));
    setMessage(null);
    setSection("active");
  }, [cap]);

  const activeCustoms = goals.filter((g) => g.kind === "custom" && !g.archived);
  const archivedCustoms = goals
    .filter((g) => g.kind === "custom" && g.archived)
    .sort((a, b) => a.createdAt - b.createdAt);
  const atCap = activeCustoms.length >= CUSTOM_WEEKLY_CAP;
  const hasArchived = archivedCustoms.length > 0;

  const activeRows = goals
    .filter((g) => !g.archived)
    .sort((a, b) => {
      const order = { apps: 0, lc: 1, custom: 2 };
      if (a.kind !== b.kind) return order[a.kind] - order[b.kind];
      return a.createdAt - b.createdAt;
    });

  const incrementRows = activeRows.filter((g) => g.kind === "lc" || g.kind === "custom");

  useEffect(() => {
    if (!hasArchived && section === "archived") setSection("active");
  }, [hasArchived, section]);

  function patchGoal(id: string, patch: Partial<WeeklyGoal>) {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const next = { ...g, ...patch };
        if (patch.done !== undefined || patch.target !== undefined) {
          next.pace = recomputePace(next.done, next.target);
        }
        return next;
      }),
    );
  }

  function setDone(id: string, done: number) {
    patchGoal(id, { done: Math.max(0, done) });
  }

  function restore(id: string) {
    if (atCap) {
      setMessage(
        `Restore blocked: already at the custom weekly cap (${CUSTOM_WEEKLY_CAP}). Archive one first.`,
      );
      return;
    }
    setMessage(null);
    const wasLast = archivedCustoms.length === 1;
    patchGoal(id, { archived: false });
    if (wasLast) setSection("active");
  }

  function archive(id: string) {
    patchGoal(id, { archived: true });
    setEditId(null);
    setArchiveConfirmId(null);
    setMessage(null);
  }

  function createGoal() {
    const name = createName.trim();
    if (!name || atCap) return;
    nextCreated.current += 1;
    setGoals((prev) => [
      ...prev,
      {
        id: `g${Date.now()}`,
        kind: "custom",
        name: name.slice(0, 50),
        done: 0,
        target: Math.max(1, createTarget),
        pace: "behind",
        metWeeksStreak: 0,
        archived: false,
        createdAt: nextCreated.current,
      },
    ]);
    setCreateOpen(false);
    setCreateName("");
    setCreateTarget(3);
    setSection("active");
  }

  const editing = editId ? goals.find((g) => g.id === editId) : null;
  const archiveTarget = archiveConfirmId
    ? goals.find((g) => g.id === archiveConfirmId)
    : null;
  const homeTargets = unmetForTargets(goals);

  return (
    <F11Shell
      title="Weekly goals + incrementer · Home Targets"
      question="Q13: weekly ± chrome for LC + customs (no apps ±, no today-LC). Q14: Active vs Archived in the weekly column — default ghost stamp from M0-01."
      variants={VARIANTS}
      surfaceLabel="M0-02 weekly"
      controls={
        <>
          <ParamToggle name="cap" label="Cap scenario" options={[...WEEKLY_CAP_SCENARIOS]} />
          <ParamToggle
            name="arch"
            label="Q14 archived look"
            options={[
              { key: "ghost", label: "Ghost (M0-01)" },
              { key: "mute", label: "Muted" },
            ]}
          />
        </>
      }
      notes={
        <>
          <p>
            <strong>Q13 variants:</strong> A classic stepper · B field flanked by ± · C field-only.
            Same chrome on every incrementer row. Pencil = rename/archive; near-label Target stepper =
            goal size.
          </p>
          <p>
            <strong>Q14:</strong> Ghost stamp adapted from the Habits strip (preferred). Muted is a
            compare-only option. Archived rows have Restore only — no ±.
          </p>
          <p>
            Record verdicts for Q13 / Q14 (weekly) in the ticket when you pick.{" "}
            <Link to={`${HUB_PATH}/strip`}>M0-01 strip →</Link>
          </p>
        </>
      }
    >
      <div className="f11-surfaces">
        <div className="f11-surface-frame">
          <p className="f11-surface-label">Progress · This week</p>
          <div className="f11-progress-mock f11w-page">
            <div className="f11-pulse-row">
              {(
                [
                  ["This week", MOCK_PULSE.week],
                  ["This month", MOCK_PULSE.month],
                ] as const
              ).map(([label, p]) => (
                <div key={label} className="f11-pulse-card card">
                  <span className="progress-kicker">{label}</span>
                  <strong className="f11-pulse-line">{p.line}</strong>
                  <span className="muted f11-pulse-min">{p.minutes} minutes worked</span>
                </div>
              ))}
            </div>

            <StripStandIn />

            {message && (
              <p className="f11-strip-msg" role="status">
                {message}
              </p>
            )}

            <div className="f11w-split">
              <section className="card f11w-column" aria-labelledby={titleId}>
                <div className="f11w-column-head">
                  <h3 id={titleId} className="f11w-column-title">
                    Weekly goals
                  </h3>
                  <div className="f11w-column-head-actions">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="f11w-add"
                      disabled={atCap}
                      title={atCap ? `Custom cap (${CUSTOM_WEEKLY_CAP}) reached` : "Add custom weekly goal"}
                      onClick={() => {
                        if (atCap) {
                          setMessage(
                            `Create blocked: already at the custom weekly cap (${CUSTOM_WEEKLY_CAP}).`,
                          );
                          return;
                        }
                        setCreateOpen(true);
                      }}
                    >
                      +
                    </Button>
                    <div
                      className="ui-chrome-tabs f11-section-tabs"
                      role="tablist"
                      aria-label="Weekly goals section"
                    >
                      <ChromeTab
                        size="page"
                        active={section === "active"}
                        onClick={() => setSection("active")}
                      >
                        Active
                      </ChromeTab>
                      <ChromeTab
                        size="page"
                        active={section === "archived"}
                        disabled={!hasArchived}
                        title={!hasArchived ? "No archived customs" : undefined}
                        onClick={() => setSection("archived")}
                      >
                        Archived
                      </ChromeTab>
                    </div>
                  </div>
                </div>

                {section === "active" ? (
                  <ul className="f11w-goal-list">
                    {activeRows.map((g) => (
                      <li key={g.id} className="f11w-goal-row">
                        <div className="f11w-goal-row-head">
                          <div className="f11w-goal-row-main">
                            <strong className="f11w-goal-name">{g.name}</strong>
                            {g.kind === "custom" && (
                              <button
                                type="button"
                                className="f11-habit-pencil f11w-row-pencil"
                                aria-label={`Edit ${g.name}`}
                                onClick={() => {
                                  setEditId(g.id);
                                  setRenameDraft(g.name);
                                }}
                              >
                                <span className="f11-pencil-flip" aria-hidden="true">
                                  ✎
                                </span>
                              </button>
                            )}
                            <span className="muted f11w-fraction">
                              {g.done}/{g.target}
                            </span>
                            <span className="muted f11w-pace">{g.pace}</span>
                          </div>
                          <WeeksFlame weeks={g.metWeeksStreak} />
                        </div>
                        {(g.kind === "lc" || g.kind === "custom") && (
                          <div className="f11w-label-target-row">
                            {g.kind === "lc" && (
                              <span className="muted f11w-lc-label-hint">Label: Grind 75 W4</span>
                            )}
                            <TargetStepper
                              value={g.target}
                              label={g.name}
                              onChange={(n) => patchGoal(g.id, { target: n })}
                            />
                          </div>
                        )}
                        <GoalBar done={g.done} total={g.target} />
                        {g.kind === "apps" && (
                          <p className="muted f11w-apps-note">
                            Progress from application-task completion only — no ± here.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className={`f11w-goal-list f11w-arch-list is-${archLook}`}>
                    {archivedCustoms.map((g) => (
                      <li
                        key={g.id}
                        className={`f11w-arch-row is-${archLook}`}
                      >
                        {archLook === "ghost" && (
                          <span className="f11-arch-stamp">Archived</span>
                        )}
                        <div className="f11w-arch-main">
                          <strong>{g.name}</strong>
                          <span className="muted">
                            target {g.target}/week · {g.metWeeksStreak >= 2
                              ? `${g.metWeeksStreak} weeks in a row (paused)`
                              : "no ± while archived"}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant={archLook === "ghost" ? "primary" : "ghost"}
                          onClick={() => restore(g.id)}
                        >
                          Restore
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <aside className="card f11w-incrementer" aria-label="Weekly progress check-in">
                <h3 className="f11w-column-title">Check in</h3>
                <p className="muted f11w-inc-hint">
                  ± for LC and custom weekly goals. No apps ±. No today-LC (that lives on the Habits
                  strip).
                </p>
                <ul className="f11w-inc-list">
                  {incrementRows.map((g) => (
                    <li key={g.id} className="f11w-inc-row">
                      <div className="f11w-inc-label">
                        <strong>{g.name}</strong>
                        <span className="muted">
                          {g.done}/{g.target}
                        </span>
                      </div>
                      <ProgressControl
                        chrome={chrome}
                        done={g.done}
                        label={g.name}
                        onDelta={(d) => setDone(g.id, g.done + d)}
                        onSet={(n) => setDone(g.id, n)}
                      />
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </div>
        </div>

        <div className="f11-surface-frame">
          <p className="f11-surface-label">Home · Targets (Sunday / unmet)</p>
          <div className="card f11w-home-targets">
            <h3 className="f11w-column-title">Targets</h3>
            {homeTargets.length === 0 ? (
              <p className="muted">All weekly goals met — nothing on Targets.</p>
            ) : (
              <ul className="f11w-target-rows">
                {homeTargets.map((g) => (
                  <li key={g.id} className="f11w-target-row">
                    <div>
                      <strong>
                        {g.kind === "lc"
                          ? `Weekly LC goal · Grind 75 W4`
                          : g.kind === "apps"
                            ? "Weekly apps goal"
                            : `Weekly · ${g.name}`}
                      </strong>
                      <span className="muted f11w-target-meta">
                        {g.done}/{g.target}
                        {g.kind === "custom" ? " check-ins" : g.kind === "lc" ? " solved" : " applied"}{" "}
                        · {g.target - g.done} to go
                      </span>
                    </div>
                    <span className="muted f11w-target-day">Sunday</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="muted f11w-standin-note">
              Custom weeklies appear alongside apps/LC using the same unmet / Sunday Targets pattern
              (R3.2). Name + target carry week to week; progress resets Mondays (mock).
            </p>
          </div>
        </div>
      </div>

      {createOpen && (
        <ModalLayer
          className="modal modal-compact"
          labelledBy="f11w-create-title"
          onClose={() => setCreateOpen(false)}
          dirty={createName.trim().length > 0}
        >
          <ModalHeader id="f11w-create-title" title="New weekly goal" />
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
            <label className="f11-field-label">
              Weekly target
              <TextField
                type="number"
                fieldSize="num"
                min={1}
                value={createTarget}
                onChange={(e) => setCreateTarget(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <p className="muted f11-hint">Default target is 3. Carries week to week; progress resets.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!createName.trim()} onClick={createGoal}>
              Create
            </Button>
          </ModalFooter>
        </ModalLayer>
      )}

      {editing && !archiveConfirmId && (
        <ModalLayer
          className="modal modal-compact"
          labelledBy="f11w-edit-title"
          onClose={() => setEditId(null)}
          dirty={renameDraft.trim() !== editing.name}
        >
          <ModalHeader id="f11w-edit-title" title="Edit weekly goal" />
          <ModalBody>
            <label className="f11-field-label">
              Name
              <TextField
                value={renameDraft}
                maxLength={50}
                onChange={(e) => setRenameDraft(e.target.value)}
              />
            </label>
            <p className="muted f11-hint">
              Rename keeps history. Target size stays on the near-label stepper — not here.
            </p>
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
            <Button
              variant="primary"
              disabled={!renameDraft.trim()}
              onClick={() => {
                patchGoal(editing.id, { name: renameDraft.trim().slice(0, 50) });
                setEditId(null);
              }}
            >
              Save name
            </Button>
          </ModalFooter>
        </ModalLayer>
      )}

      {archiveTarget && (
        <ModalLayer
          className="modal modal-compact"
          labelledBy="f11w-archive-title"
          onClose={() => setArchiveConfirmId(null)}
        >
          <ModalHeader id="f11w-archive-title" title="Archive this weekly goal?" />
          <ModalBody>
            <p className="f11-hint" style={{ marginTop: 0 }}>
              <strong>{archiveTarget.name}</strong> leaves Active and stops counting toward the
              custom cap until restored.
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
    </F11Shell>
  );
}
