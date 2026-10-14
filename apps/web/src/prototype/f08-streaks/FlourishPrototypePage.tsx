/**
 * F08 M5-07 · design question 4 / Q7: keep or drop the completion flourish (R5.2).
 * If kept: which events trigger it, and whether it replaces EarnFlash.
 */
import { useCallback, useState } from "react";
import EarnFlash from "../../features/completion/EarnFlash";
import type { PointsEarnInfo } from "../../api";
import F08StreaksShell, { btn, ParamToggle, useParam, useVariant } from "./F08StreaksShell";
import { FLOURISH_EVENTS, type FlourishEvent } from "./fixtures";

const VARIANTS = [
  { key: "A", name: "Drop · EarnFlash only" },
  { key: "B", name: "Keep confetti · with EarnFlash" },
  { key: "C", name: "Keep vanish · task fades; EarnFlash stays" },
] as const;

const EVENT_POINTS: Record<FlourishEvent, { amount: number; message: string }> = {
  task: { amount: 25, message: "Misc task complete" },
  applied: { amount: 35, message: "Application marked applied" },
  lc: { amount: 30, message: "LeetCode · medium" },
  interview: { amount: 80, message: "Interview step finished" },
};

function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="f08s-confetti" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  );
}

export default function FlourishPrototypePage() {
  const variant = useVariant(VARIANTS);
  const event = useParam(
    "event",
    FLOURISH_EVENTS.map((e) => e.key),
  );
  const flashMode = useParam("flash", ["keep", "replace"] as const);
  const [earn, setEarn] = useState<PointsEarnInfo | null>(null);
  const [balance, setBalance] = useState(1180);
  const [confetti, setConfetti] = useState(false);
  const [vanishing, setVanishing] = useState(false);
  const [taskKey, setTaskKey] = useState(0);
  const [doneLabel, setDoneLabel] = useState<string | null>(null);

  const resetTask = useCallback(() => {
    setVanishing(false);
    setConfetti(false);
    setDoneLabel(null);
    setTaskKey((k) => k + 1);
  }, []);

  const complete = useCallback(() => {
    const info = EVENT_POINTS[event];
    const nextBalance = balance + info.amount;
    setBalance(nextBalance);
    setConfetti(false);
    setVanishing(false);
    setDoneLabel(null);

    const showFlash = variant === "A" || flashMode === "keep";
    if (showFlash) {
      setEarn({
        amount: info.amount,
        message: info.message,
        balanceAfter: nextBalance,
      });
    } else {
      setEarn(null);
      setDoneLabel(`${info.message} · +${info.amount} (no EarnFlash)`);
    }

    if (variant === "B") {
      setConfetti(true);
      window.setTimeout(() => setConfetti(false), 950);
    }
    if (variant === "C") {
      setVanishing(true);
      window.setTimeout(() => {
        setDoneLabel((prev) => prev ?? `${info.message} · row cleared`);
      }, 480);
    }
  }, [balance, event, flashMode, variant]);

  return (
    <F08StreaksShell
      title="Completion flourish"
      question="Q4 / Q7: keep the completion flourish at all? If kept, which events trigger it, and does it replace EarnFlash?"
      variants={VARIANTS}
      surfaceLabel="Q4 Flourish"
      controls={
        <>
          <ParamToggle name="event" label="Event" options={FLOURISH_EVENTS} />
          {(variant === "B" || variant === "C") && (
            <ParamToggle
              name="flash"
              label="EarnFlash"
              options={[
                { key: "keep", label: "Keep both" },
                { key: "replace", label: "Replace flash" },
              ]}
            />
          )}
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
          R5.2 may be dropped after this pass. Affirmations stay out. Reduced-motion users get no confetti
          animation. Prefer a clear keep/drop; if keep, name the trigger set (all completions vs only
          tasks/apps).
        </p>
      }
    >
      <div className="f08s-surfaces">
        {earn && <EarnFlash earn={earn} onDismiss={() => setEarn(null)} />}
        <div className="f08s-flourish-stage">
          <p className="f08s-surface-label">Mock completion target</p>
          <div key={taskKey} className={vanishing ? "f08s-mock-task is-vanishing" : "f08s-mock-task"}>
            <div>
              <strong>
                {event === "task" && "Write cover letter draft"}
                {event === "applied" && "Figma · SWE Intern"}
                {event === "lc" && "LeetCode · Binary Tree Paths"}
                {event === "interview" && "Phone screen · Stripe"}
              </strong>
              <p className="muted f08-hint" style={{ margin: "0.15rem 0 0" }}>
                Balance {balance}
              </p>
            </div>
            <button type="button" className={btn("primary", "sm")} onClick={complete} disabled={vanishing}>
              {event === "lc" ? "+1" : "Complete"}
            </button>
            {variant === "B" && <ConfettiBurst active={confetti} />}
          </div>
          {doneLabel && (
            <p className="muted f08-hint" role="status">
              {doneLabel}
            </p>
          )}
        </div>
      </div>
    </F08StreaksShell>
  );
}
