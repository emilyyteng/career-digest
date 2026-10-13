/**
 * F08 M5-06 · design question 1: the LeetCode stepper.
 * How weekly/misc × easy/medium/hard works in the fewest clicks, how a
 * decrement picks its tier, and whether one control replaces today's two
 * (the daily stepper and the weekly-block stepper on Progress).
 * Must satisfy R5.14 (past target), R5.17 (weekly + misc, both ±), R5.20 (tiers).
 */
import { useState, type ReactNode } from "react";
import F08Shell, { btn, useVariant } from "./F08Shell";
import {
  LC_TARGET,
  TIER_LABEL,
  TIER_POINTS,
  TIERS,
  type DayCounts,
  type LcType,
  type Tier,
} from "./fixtures";
import { DayCountsLine, GoalBar, PaceText, TierStepper, useMockEarn } from "./parts";

const VARIANTS = [
  { key: "A", name: "One control · type switch + tier steppers" },
  { key: "B", name: "One control · add grid + remove picker" },
  { key: "C", name: "Two typed controls (misc card, weekly block)" },
] as const;

function useLcState() {
  const [day, setDay] = useState<DayCounts>({ easy: 1, medium: 2, hard: 0 });
  const [weekly, setWeekly] = useState(7);
  const { flash, node } = useMockEarn();

  function add(type: LcType, tier: Tier) {
    setDay((d) => ({ ...d, [tier]: d[tier] + 1 }));
    const nextWeekly = type === "weekly" ? weekly + 1 : weekly;
    if (type === "weekly") setWeekly(nextWeekly);
    const where = type === "weekly" ? `weekly ${nextWeekly}/${LC_TARGET}` : "misc";
    flash(TIER_POINTS[tier], `+${TIER_POINTS[tier]} · ${TIER_LABEL[tier]} LeetCode (${where})`);
  }

  function canRemove(type: LcType, tier: Tier): boolean {
    return day[tier] > 0 && (type === "misc" || weekly > 0);
  }

  function remove(type: LcType, tier: Tier) {
    if (!canRemove(type, tier)) return;
    setDay((d) => ({ ...d, [tier]: d[tier] - 1 }));
    const nextWeekly = type === "weekly" ? weekly - 1 : weekly;
    if (type === "weekly") setWeekly(nextWeekly);
    const where = type === "weekly" ? `weekly ${nextWeekly}/${LC_TARGET}` : "misc";
    flash(-TIER_POINTS[tier], `−${TIER_POINTS[tier]} · removed one ${TIER_LABEL[tier]} (${where})`);
  }

  return { day, weekly, add, remove, canRemove, flashNode: node };
}

function WeeklyLcRow({ weekly, children }: { weekly: number; children?: ReactNode }) {
  return (
    <div className="weekly-goal-row">
      <div className="weekly-goal-row-head">
        <strong className="weekly-goal-title">Weekly LC</strong>
        <span className="weekly-goal-fraction muted">
          {weekly}/{LC_TARGET}
        </span>
        <PaceText done={weekly} total={LC_TARGET} />
      </div>
      <GoalBar done={weekly} total={LC_TARGET} showOverflow />
      {children}
    </div>
  );
}

function TypeSwitch({ value, onChange }: { value: LcType; onChange: (t: LcType) => void }) {
  return (
    <div className="f08-segmented" role="radiogroup" aria-label="Solve type">
      {(["weekly", "misc"] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          className={btn("ghost", "sm", value === t ? "is-active" : "")}
          onClick={() => onChange(t)}
        >
          {t === "weekly" ? "Weekly" : "Misc"}
        </button>
      ))}
    </div>
  );
}

function VariantA() {
  const s = useLcState();
  const [type, setType] = useState<LcType>("weekly");
  return (
    <>
      {s.flashNode}
      <section className="card weekly-goals-card f08-card">
        <h3 className="weekly-goals-heading">Weekly goals</h3>
        <WeeklyLcRow weekly={s.weekly}>
          <p className="muted f08-hint">Logged from the LeetCode card below.</p>
        </WeeklyLcRow>
      </section>
      <div className="card progress-lc-card f08-card f08-lc-card">
        <h4 className="progress-section-title">LeetCode</h4>
        <TypeSwitch value={type} onChange={setType} />
        <div className="f08-tier-list">
          {TIERS.map((tier) => (
            <TierStepper
              key={tier}
              tier={tier}
              count={s.day[tier]}
              removeDisabled={!s.canRemove(type, tier)}
              onAdd={() => s.add(type, tier)}
              onRemove={() => s.remove(type, tier)}
            />
          ))}
        </div>
        <DayCountsLine day={s.day} />
      </div>
    </>
  );
}

function VariantB() {
  const s = useLcState();
  const [removing, setRemoving] = useState(false);
  return (
    <>
      {s.flashNode}
      <section className="card weekly-goals-card f08-card">
        <h3 className="weekly-goals-heading">Weekly goals</h3>
        <WeeklyLcRow weekly={s.weekly}>
          <p className="muted f08-hint">Logged from the LeetCode card below.</p>
        </WeeklyLcRow>
      </section>
      <div className="card progress-lc-card f08-card f08-lc-card">
        <h4 className="progress-section-title">LeetCode</h4>
        <div className="f08-add-grid" role="group" aria-label={removing ? "Remove a solve" : "Add a solve"}>
          <span />
          {TIERS.map((tier) => (
            <span key={tier} className="f08-add-grid-col">
              {TIER_LABEL[tier]}
            </span>
          ))}
          {(["weekly", "misc"] as const).map((type) => (
            <div key={type} style={{ display: "contents" }}>
              <span className="f08-add-grid-row">{type === "weekly" ? "Weekly" : "Misc"}</span>
              {TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  className={btn(removing ? "secondary" : "primary", "sm")}
                  disabled={removing && !s.canRemove(type, tier)}
                  onClick={() => {
                    if (removing) {
                      s.remove(type, tier);
                      setRemoving(false);
                    } else {
                      s.add(type, tier);
                    }
                  }}
                >
                  {removing ? "−1" : "+1"}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="f08-row-between">
          <DayCountsLine day={s.day} />
          <button
            type="button"
            className={btn("ghost", "sm", removing ? "is-active" : "")}
            aria-pressed={removing}
            onClick={() => setRemoving((r) => !r)}
          >
            {removing ? "Cancel remove" : "Remove a solve…"}
          </button>
        </div>
      </div>
    </>
  );
}

function VariantC() {
  const s = useLcState();
  return (
    <>
      {s.flashNode}
      <section className="card weekly-goals-card f08-card">
        <h3 className="weekly-goals-heading">Weekly goals</h3>
        <WeeklyLcRow weekly={s.weekly}>
          <div className="f08-tier-inline" aria-label="Weekly solves">
            {TIERS.map((tier) => (
              <TierStepper
                key={tier}
                tier={tier}
                compact
                hideCount
                count={s.day[tier]}
                removeDisabled={!s.canRemove("weekly", tier)}
                onAdd={() => s.add("weekly", tier)}
                onRemove={() => s.remove("weekly", tier)}
              />
            ))}
          </div>
        </WeeklyLcRow>
      </section>
      <div className="card progress-lc-card f08-card f08-lc-card">
        <h4 className="progress-section-title">LeetCode · misc</h4>
        <div className="f08-tier-list">
          {TIERS.map((tier) => (
            <TierStepper
              key={tier}
              tier={tier}
              count={s.day[tier]}
              removeDisabled={!s.canRemove("misc", tier)}
              onAdd={() => s.add("misc", tier)}
              onRemove={() => s.remove("misc", tier)}
            />
          ))}
        </div>
        <DayCountsLine day={s.day} />
      </div>
    </>
  );
}

export default function LcStepperPrototypePage() {
  const variant = useVariant(VARIANTS);
  return (
    <F08Shell
      title="Progress · LeetCode stepper"
      question="Q1: log weekly or misc × easy/medium/hard in the fewest clicks; how a decrement picks its tier; one control or two."
      variants={VARIANTS}
      surfaceLabel="Q1 LC stepper"
      notes={
        <>
          <p>
            <strong>Click counts.</strong> A: 1 click while the type matches, 2 to switch type; remove is 1
            click on the tier row (type follows the switch). B: add is always 1 click; remove is 2 (open,
            then pick type × tier). C: 1 click for anything; the type is where you click.
          </p>
          <p>
            Counts per tier are today&apos;s day counts (types aren&apos;t stored per day, R5.17). A weekly
            remove needs weekly progress above 0; a misc remove only lowers the day. Weekly can go past
            10 (R5.14); the bar shows the extra as a +N tail. Tier points: easy 20, medium 30,
            hard 50 (Q32). Weekly +20s are paid at week close, so the banner only shows
            tier points.
          </p>
        </>
      }
    >
      <div className="f08-stack f08-narrow" key={variant}>
        {variant === "A" && <VariantA />}
        {variant === "B" && <VariantB />}
        {variant === "C" && <VariantC />}
      </div>
    </F08Shell>
  );
}
