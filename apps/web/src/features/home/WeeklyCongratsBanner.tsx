import type { WeeklyCongrats } from "../../api";
import OneTimeNotice from "../notices/OneTimeNotice";

/** Proposed show-from for weekly-goal streak on the congrats banner (M5-07 Q5). */
const STREAK_SHOW_FROM = 2;
const UNIT = 20;
const BONUS = 100;

function goalName(slot: "lc" | "apps"): string {
  return slot === "lc" ? "LC" : "Apps";
}

function streakLabel(weeks: number): string {
  return weeks === 1 ? "1 week in a row" : `${weeks} weeks in a row`;
}

/** Home hero congrats for last week's met targets (R5.18 / M5-02, M5-06 Q4 B). */
export default function WeeklyCongratsBanner({ congrats }: { congrats: WeeklyCongrats }) {
  const met = congrats.goals;
  if (met.length === 0) return null;
  const total = met.reduce((sum, g) => sum + g.points, 0);
  const targetWord = met.length === 1 ? "target" : "targets";

  return (
    <OneTimeNotice
      storageKey={`weekly-congrats-seen:${congrats.weekStart}`}
      className="one-time-notice weekly-congrats"
    >
      <strong className="weekly-congrats-title">You hit last week&apos;s {targetWord}</strong>
      <span className="muted weekly-congrats-week">{congrats.weekLabel}</span>
      <ul className="weekly-congrats-lines">
        {met.map((g) => {
          const showStreak = g.metWeeksStreak >= STREAK_SHOW_FROM;
          return (
            <li key={g.slot}>
              <span className="weekly-congrats-line-main">
                <strong>
                  {goalName(g.slot)} {g.done}/{g.target}
                </strong>
                <span className="muted">
                  {" "}
                  · {g.done} × {UNIT} + {BONUS}
                </span>
                {showStreak && (
                  <span className="weekly-congrats-streak">
                    <span className="weekly-goal-streak-flame" aria-hidden="true">
                      🔥
                    </span>
                    <span>{streakLabel(g.metWeeksStreak)}</span>
                  </span>
                )}
              </span>
              <span className="weekly-congrats-pts">+{g.points}</span>
            </li>
          );
        })}
        {met.length > 1 && (
          <li className="weekly-congrats-total">
            <span>Total</span>
            <span className="weekly-congrats-pts">+{total}</span>
          </li>
        )}
      </ul>
    </OneTimeNotice>
  );
}
