/**
 * F08 M5-06 · design question 4: the weekly congrats banner on Home.
 * Placement on Home, visual treatment, and how it states each goal's count
 * and points.
 * Must satisfy R5.18 (one-time notice: names apps, LC or both with count out
 * of target and points; none if neither met; × closes it; seen per week in
 * localStorage) and R5.28 (weekly streak shown, display only).
 */
import { useState } from "react";
import F08Shell, { btn, ParamToggle, useParam, useVariant } from "./F08Shell";
import {
  CONGRATS_SCENARIOS,
  goalName,
  LAST_MONDAY,
  LAST_WEEK_LABEL,
  streakFor,
  WEEKLY_MET_BONUS,
  WEEKLY_UNIT_POINTS,
  weeklyGoalPoints,
  type LastWeekGoal,
} from "./fixtures";
import MockHome from "./MockHome";

const VARIANTS = [
  { key: "A", name: "Top strip · one line" },
  { key: "B", name: "In hero · per-goal rows + breakdown" },
  { key: "C", name: "Above Upcoming · goal chips" },
] as const;

const SEEN_KEY = `proto-f08-congrats-seen:${LAST_MONDAY.toISOString().slice(0, 10)}`;

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSeen(seen: boolean) {
  try {
    if (seen) window.localStorage.setItem(SEEN_KEY, "1");
    else window.localStorage.removeItem(SEEN_KEY);
  } catch {
    /* private mode: banner just reappears */
  }
}

function streakText(goal: LastWeekGoal["goal"]): string | null {
  const n = streakFor(goal);
  return n >= 2 ? `${goalName(goal)}: ${n} weeks in a row` : null;
}

function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="earn-flash-dismiss f08-dismiss" aria-label="Dismiss" onClick={onClick}>
      ×
    </button>
  );
}

function BannerA({ met, onDismiss }: { met: LastWeekGoal[]; onDismiss: () => void }) {
  const streaks = met.map((g) => streakText(g.goal)).filter(Boolean);
  return (
    <p className="f08-congrats f08-congrats-strip" role="status">
      <span>
        <strong>Last week&apos;s targets met</strong> · {LAST_WEEK_LABEL}
        {met.map((g) => (
          <span key={g.goal}>
            {" · "}
            {goalName(g.goal)} {g.done}/{g.target} <strong>+{weeklyGoalPoints(g.done, g.target)}</strong>
          </span>
        ))}
        {streaks.length > 0 && <span className="f08-congrats-streak"> · {streaks.join(" · ")}</span>}
      </span>
      <DismissButton onClick={onDismiss} />
    </p>
  );
}

function BannerB({ met, onDismiss }: { met: LastWeekGoal[]; onDismiss: () => void }) {
  const total = met.reduce((sum, g) => sum + weeklyGoalPoints(g.done, g.target), 0);
  return (
    <div className="f08-congrats f08-congrats-box" role="status">
      <div className="f08-row-between">
        <strong>You hit last week&apos;s targets</strong>
        <DismissButton onClick={onDismiss} />
      </div>
      <span className="muted f08-hint">{LAST_WEEK_LABEL}</span>
      <ul className="f08-congrats-lines">
        {met.map((g) => {
          const streak = streakText(g.goal);
          return (
            <li key={g.goal}>
              <span>
                <strong>
                  {goalName(g.goal)} {g.done}/{g.target}
                </strong>
                <span className="muted">
                  {" "}
                  · {g.done} × {WEEKLY_UNIT_POINTS} + {WEEKLY_MET_BONUS} met
                </span>
                {streak && <span className="f08-congrats-streak"> · {streak}</span>}
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

function BannerC({ met, onDismiss }: { met: LastWeekGoal[]; onDismiss: () => void }) {
  return (
    <section className="card f08-card f08-congrats f08-congrats-card" role="status">
      <div className="f08-row-between">
        <h3 className="home-section-title">{LAST_WEEK_LABEL} · targets met</h3>
        <DismissButton onClick={onDismiss} />
      </div>
      <div className="f08-chip-row">
        {met.map((g) => {
          const streak = streakText(g.goal);
          return (
            <span key={g.goal} className="f08-goal-chip">
              {goalName(g.goal)} {g.done}/{g.target} · <strong>+{weeklyGoalPoints(g.done, g.target)} pts</strong>
              {streak && <span className="muted"> · {streak.replace(`${goalName(g.goal)}: `, "")}</span>}
            </span>
          );
        })}
      </div>
      <div className="f08-row-end">
        <button type="button" className={btn("primary", "sm")} onClick={onDismiss}>
          Got it
        </button>
      </div>
    </section>
  );
}

export default function CongratsBannerPrototypePage() {
  const variant = useVariant(VARIANTS);
  const scenarioKey = useParam("s", CONGRATS_SCENARIOS.map((s) => s.key));
  const scenario = CONGRATS_SCENARIOS.find((s) => s.key === scenarioKey)!;
  const met = scenario.goals.filter((g) => g.target > 0 && g.done >= g.target);
  const [seen, setSeen] = useState(readSeen);

  function dismiss() {
    writeSeen(true);
    setSeen(true);
  }

  const show = met.length > 0 && !seen;
  const Banner = variant === "B" ? BannerB : variant === "C" ? BannerC : BannerA;
  const node = show ? <Banner met={met} onDismiss={dismiss} /> : null;

  return (
    <F08Shell
      title="Home · Weekly congrats banner"
      question="Q4: placement on Home, visual treatment, and how it states each goal's count and points."
      variants={VARIANTS}
      surfaceLabel="Q4 Congrats"
      controls={
        <>
          <ParamToggle
            name="s"
            label="Last week"
            options={CONGRATS_SCENARIOS.map((s) => ({ key: s.key, label: s.label }))}
          />
          <div className="f08-param">
            <span className="f08-param-label">
              {met.length === 0 ? "No banner: nothing met" : seen ? "Seen this week" : "Not seen yet"}
            </span>
            <button
              type="button"
              className={btn("ghost", "sm")}
              disabled={!seen}
              onClick={() => {
                writeSeen(false);
                setSeen(false);
              }}
            >
              Reset seen
            </button>
          </div>
        </>
      }
      notes={
        <p>
          Shown on the first Home visit after the week closes; × (or “Got it” in C) marks the week seen in
          localStorage, so a reload keeps it hidden. Only met goals are named, and a missed goal is never
          mentioned (B1). Points use R5.15: +{WEEKLY_UNIT_POINTS} per unit, +{WEEKLY_MET_BONUS} when met. The
          streak shows from 2 weeks (Proposed). The prototype stores its flag under a <code>proto-</code> key.
        </p>
      }
    >
      <MockHome
        weekLine="bars"
        bannerTop={variant === "A" ? node : null}
        bannerInHero={variant === "B" ? node : null}
        bannerAboveUpcoming={variant === "C" ? node : null}
      />
    </F08Shell>
  );
}
