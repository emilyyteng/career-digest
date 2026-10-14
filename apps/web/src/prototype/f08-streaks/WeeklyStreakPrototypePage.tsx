/**
 * F08 M5-07 · design question 5: weekly-goal streak display (R5.28).
 * Chosen M5-06 layouts: Progress block A2 and congrats banner B.
 * Streak is display-only; no points. Shown per goal.
 *
 * Round-2 direction (2026-10-13): flame treatment, compact — right-aligned on
 * Progress head (no dedicated line); inline with a slight gap on congrats.
 */
import { useState } from "react";
import F08StreaksShell, { btn, ParamToggle, useParam, useVariant } from "./F08StreaksShell";
import {
  CONGRATS_MET_BOTH,
  CONGRATS_MET_LC,
  goalName,
  LAST_WEEK_LABEL,
  PROGRESS_APPS,
  PROGRESS_LC,
  WEEKLY_MET_BONUS,
  WEEKLY_STREAK_SCENARIOS,
  WEEKLY_UNIT_POINTS,
  weeklyGoalPoints,
  type CongratsMet,
} from "./fixtures";
import { GoalBar, PaceText } from "../f08-weekly/parts";

const VARIANTS = [
  { key: "B2", name: "Chosen · flame compact: right on Progress, inline on congrats" },
  { key: "A", name: "Earlier · accent pill" },
  { key: "C", name: "Earlier · large count callout" },
] as const;

function streakLabel(weeks: number): string {
  return weeks === 1 ? "1 week in a row" : `${weeks} weeks in a row`;
}

function streakShort(weeks: number): string {
  return weeks === 1 ? "1 week" : `${weeks} weeks`;
}

function FlameInline({ weeks, className }: { weeks: number; className?: string }) {
  if (weeks <= 0) return null;
  return (
    <span className={className ?? "f08s-flame-inline"}>
      <span className="f08s-flame" aria-hidden="true">
        🔥
      </span>
      <span>{streakLabel(weeks)}</span>
    </span>
  );
}

function StreakPill({ weeks }: { weeks: number }) {
  if (weeks <= 0) return null;
  return <span className="f08s-streak-pill">{streakShort(weeks)}</span>;
}

function StreakCallout({ weeks }: { weeks: number }) {
  if (weeks <= 0) return null;
  return (
    <div className="f08s-streak-callout" aria-label={streakLabel(weeks)}>
      <strong>{weeks}</strong>
      <span>{weeks === 1 ? "week" : "weeks"}</span>
    </div>
  );
}

function ProgressGoalHead({
  title,
  done,
  total,
  weeks,
  variant,
}: {
  title: string;
  done: number;
  total: number;
  weeks: number;
  variant: string;
}) {
  if (variant === "B2") {
    return (
      <div className="weekly-goal-row-head f08s-goal-head-spread">
        <div className="f08s-goal-head-main weekly-goal-row-head">
          <strong className="weekly-goal-title">{title}</strong>
          <span className="weekly-goal-fraction muted">
            {done}/{total}
          </span>
          <PaceText done={done} total={total} />
        </div>
        <FlameInline weeks={weeks} className="f08s-flame-inline is-end" />
      </div>
    );
  }

  if (variant === "C") {
    return (
      <div className="f08s-goal-head-with-callout">
        <div className="f08s-goal-head-main">
          <div className="weekly-goal-row-head">
            <strong className="weekly-goal-title">{title}</strong>
            <span className="weekly-goal-fraction muted">
              {done}/{total}
            </span>
            <PaceText done={done} total={total} />
          </div>
        </div>
        <StreakCallout weeks={weeks} />
      </div>
    );
  }

  return (
    <div className="weekly-goal-row-head">
      <strong className="weekly-goal-title">{title}</strong>
      <span className="weekly-goal-fraction muted">
        {done}/{total}
      </span>
      <PaceText done={done} total={total} />
      <StreakPill weeks={weeks} />
    </div>
  );
}

function ProgressBlock({
  variant,
  lcWeeks,
  appsWeeks,
}: {
  variant: string;
  lcWeeks: number;
  appsWeeks: number;
}) {
  return (
    <section className="card weekly-goals-card f08-card f08-narrow">
      <h3 className="weekly-goals-heading">Weekly goals</h3>
      <div className="weekly-goals-list">
        <div className="weekly-goal-row">
          <ProgressGoalHead
            title="Weekly LC"
            done={PROGRESS_LC.done}
            total={PROGRESS_LC.target}
            weeks={lcWeeks}
            variant={variant}
          />
          <div className="f08-label-target-row">
            <div className="f08-label-line">
              <span className="f08-label-text">{PROGRESS_LC.label}</span>
              <button type="button" className={btn("ghost", "sm")}>
                Edit label
              </button>
            </div>
            <label className="weekly-goal-target-field f08-target-field">
              <span className="muted">Target</span>
              <input type="number" defaultValue={PROGRESS_LC.target} readOnly />
            </label>
          </div>
          <GoalBar done={PROGRESS_LC.done} total={PROGRESS_LC.target} showOverflow />
        </div>
        <div className="weekly-goal-row">
          <ProgressGoalHead
            title="Weekly apps"
            done={PROGRESS_APPS.done}
            total={PROGRESS_APPS.total}
            weeks={appsWeeks}
            variant={variant}
          />
          <GoalBar done={PROGRESS_APPS.done} total={PROGRESS_APPS.total} />
          <ul className="f08-apps-plain">
            {PROGRESS_APPS.members.map((m) => (
              <li key={m.id} className={m.done ? "is-done" : ""}>
                <span>{m.name}</span>
                {m.done && <span className="f08-applied-tag">applied</span>}
              </li>
            ))}
          </ul>
          <p className="muted f08-hint">Tag or untag on Tasks.</p>
        </div>
      </div>
    </section>
  );
}

function CongratsB({
  met,
  lcWeeks,
  appsWeeks,
  variant,
  onDismiss,
}: {
  met: CongratsMet[];
  lcWeeks: number;
  appsWeeks: number;
  variant: string;
  onDismiss: () => void;
}) {
  const total = met.reduce((sum, g) => sum + weeklyGoalPoints(g.done, g.target), 0);
  const weeksFor = (goal: "apps" | "lc") => (goal === "lc" ? lcWeeks : appsWeeks);

  return (
    <div className="f08-congrats f08-congrats-box" role="status">
      <div className="f08-row-between">
        <strong>You hit last week&apos;s {met.length === 1 ? "target" : "targets"}</strong>
        <button type="button" className="earn-flash-dismiss f08-dismiss" aria-label="Dismiss" onClick={onDismiss}>
          ×
        </button>
      </div>
      <span className="muted f08-hint">{LAST_WEEK_LABEL}</span>
      <ul className="f08-congrats-lines">
        {met.map((g) => {
          const weeks = weeksFor(g.goal);
          return (
            <li key={g.goal}>
              <span>
                <strong>
                  {goalName(g.goal)} {g.done}/{g.target}
                </strong>
                <span className="muted">
                  {" "}
                  · {g.done} × {WEEKLY_UNIT_POINTS} + {WEEKLY_MET_BONUS}
                </span>
                {variant === "B2" && weeks > 0 && (
                  <FlameInline weeks={weeks} className="f08s-flame-inline is-gap" />
                )}
                {variant === "A" && weeks > 0 && (
                  <>
                    {" "}
                    <StreakPill weeks={weeks} />
                  </>
                )}
                {variant === "C" && weeks > 0 && (
                  <span className="f08s-congrats-line-extra">{streakLabel(weeks)}</span>
                )}
              </span>
              <span className="f08-pts">+{weeklyGoalPoints(g.done, g.target)}</span>
            </li>
          );
        })}
        {met.length > 1 && (
          <li className="f08-congrats-total">
            <span>Total</span>
            <span className="f08-pts">+{total}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

export default function WeeklyStreakPrototypePage() {
  const variant = useVariant(VARIANTS);
  const streakKey = useParam(
    "streak",
    WEEKLY_STREAK_SCENARIOS.map((s) => s.key),
  );
  const metKey = useParam("met", ["both", "lc"] as const);
  const showFrom = useParam("from", ["2", "1"] as const);
  const scenario = WEEKLY_STREAK_SCENARIOS.find((s) => s.key === streakKey)!;
  const minWeeks = Number(showFrom);
  const lcWeeks = scenario.lcWeeks >= minWeeks ? scenario.lcWeeks : 0;
  const appsWeeks = scenario.appsWeeks >= minWeeks ? scenario.appsWeeks : 0;
  const met = metKey === "lc" ? CONGRATS_MET_LC : CONGRATS_MET_BOTH;
  const [dismissed, setDismissed] = useState(false);

  return (
    <F08StreaksShell
      title="Weekly-goal streak display"
      question="Q5: how “3 weeks in a row” reads in Progress (A2) and the congrats banner (B). Flame, compact — not a dedicated line."
      variants={VARIANTS}
      surfaceLabel="Q5 Weekly streak"
      controls={
        <>
          <ParamToggle
            name="streak"
            label="Streak lengths"
            options={WEEKLY_STREAK_SCENARIOS.map((s) => ({ key: s.key, label: s.label }))}
          />
          <ParamToggle
            name="met"
            label="Congrats met"
            options={[
              { key: "both", label: "Both" },
              { key: "lc", label: "LC only" },
            ]}
          />
          <ParamToggle
            name="from"
            label="Show from"
            options={[
              { key: "2", label: "2 weeks" },
              { key: "1", label: "1 week" },
            ]}
          />
          {dismissed && (
            <button type="button" className={btn("ghost", "sm")} onClick={() => setDismissed(false)}>
              Reset banner
            </button>
          )}
        </>
      }
      notes={
        <p>
          Verdict direction (2026-10-13): flame from B, but compact — right-justified on the Progress goal
          head (same row as title/counts), and inline with a slight gap after the points breakdown on the Home
          congrats banner. Display only (R5.28). Proposed: show from 2 weeks.
        </p>
      }
    >
      <div className="f08s-surfaces">
        <div>
          <p className="f08s-surface-label">Progress · weekly goals (A2)</p>
          <ProgressBlock variant={variant} lcWeeks={lcWeeks} appsWeeks={appsWeeks} />
        </div>
        <div>
          <p className="f08s-surface-label">Home · congrats banner (B)</p>
          {!dismissed ? (
            <div className="card f08-card" style={{ padding: "0.75rem 0.9rem" }}>
              <p className="muted f08-hint" style={{ marginTop: 0 }}>
                Hero (mock)
              </p>
              <CongratsB
                met={met}
                lcWeeks={lcWeeks}
                appsWeeks={appsWeeks}
                variant={variant}
                onDismiss={() => setDismissed(true)}
              />
            </div>
          ) : (
            <p className="muted">Banner dismissed.</p>
          )}
        </div>
      </div>
    </F08StreaksShell>
  );
}
