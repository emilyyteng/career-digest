/**
 * F08 M5-07 · design question 4 / Q7: keep or drop the completion flourish (R5.2).
 * Verdict (2026-10-13): drop — EarnFlash only; confetti/vanish too distracting.
 */
import { useCallback, useState } from "react";
import EarnFlash from "../../features/completion/EarnFlash";
import type { PointsEarnInfo } from "../../api";
import F08StreaksShell, { btn, ParamToggle, useParam, useVariant } from "./F08StreaksShell";
import { FLOURISH_EVENTS, type FlourishEvent } from "./fixtures";

const VARIANTS = [
  { key: "A", name: "Chosen · drop flourish; EarnFlash only" },
  { key: "B", name: "Rejected · confetti (too distracting)" },
  { key: "C", name: "Rejected · vanish" },
] as const;

const EVENT_POINTS: Record<FlourishEvent, { amount: number; message: string }> = {
  task: { amount: 25, message: "Misc task complete" },
  applied: { amount: 35, message: "Application marked applied" },
  lc: { amount: 30, message: "LeetCode · medium" },
  interview: { amount: 80, message: "Interview step finished" },
};

export default function FlourishPrototypePage() {
  const variant = useVariant(VARIANTS);
  const event = useParam(
    "event",
    FLOURISH_EVENTS.map((e) => e.key),
  );
  const [earn, setEarn] = useState<PointsEarnInfo | null>(null);
  const [balance, setBalance] = useState(1180);
  const [taskKey, setTaskKey] = useState(0);

  const resetTask = useCallback(() => {
    setTaskKey((k) => k + 1);
  }, []);

  const complete = useCallback(() => {
    const info = EVENT_POINTS[event];
    const nextBalance = balance + info.amount;
    setBalance(nextBalance);
    if (variant === "A") {
      setEarn({
        amount: info.amount,
        message: info.message,
        balanceAfter: nextBalance,
      });
    } else {
      setEarn({
        amount: info.amount,
        message: `${info.message} (rejected flourish still shows EarnFlash here)`,
        balanceAfter: nextBalance,
      });
    }
  }, [balance, event, variant]);

  return (
    <F08StreaksShell
      title="Completion flourish"
      question="Q4 / Q7: keep the completion flourish? Verdict: drop — EarnFlash is enough."
      variants={VARIANTS}
      surfaceLabel="Q4 Flourish"
      controls={
        <>
          <ParamToggle name="event" label="Event" options={FLOURISH_EVENTS} />
          <button type="button" className={btn("primary", "sm")} onClick={complete}>
            Complete
          </button>
          <button type="button" className={btn("ghost", "sm")} onClick={resetTask}>
            Reset row
          </button>
        </>
      }
      notes={
        <p>
          Verdict (2026-10-13): <strong>drop</strong> the flourish (R5.2 / Q7). Confetti felt distracting and
          hard to get right; vanish not chosen. Completions keep <code>EarnFlash</code> only. M5-13 becomes
          won&apos;t-do.
        </p>
      }
    >
      <div className="f08s-surfaces">
        {earn && <EarnFlash earn={earn} onDismiss={() => setEarn(null)} />}
        <div className="f08s-flourish-stage">
          <p className="f08s-surface-label">Mock completion target</p>
          <div key={taskKey} className="f08s-mock-task">
            <div>
              <strong>
                {event === "task" && "Write cover letter draft"}
                {event === "applied" && "Figma · SWE Intern"}
                {event === "lc" && "LeetCode · Binary Tree Paths"}
                {event === "interview" && "Phone screen · Stripe"}
              </strong>
              <p className="muted f08-hint" style={{ margin: "0.15rem 0 0" }}>
                Balance: {balance}
              </p>
            </div>
            <button type="button" className={btn("primary", "sm")} onClick={complete}>
              {event === "lc" ? "+1" : "Complete"}
            </button>
          </div>
          {variant !== "A" && (
            <p className="muted f08-hint" role="status">
              This variant is kept only as a rejected reference; the chosen path is A.
            </p>
          )}
        </div>
      </div>
    </F08StreaksShell>
  );
}
