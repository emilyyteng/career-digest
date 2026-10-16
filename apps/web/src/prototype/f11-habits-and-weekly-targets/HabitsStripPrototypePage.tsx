/**
 * F11 M0-01 · Habits strip prototype (Home + Progress This week).
 *
 * Design questions (variants differ only on these):
 *   Q11 — checkoff vs edit chrome: dedicated ✓/− button vs mark-as-hit-target
 *   Q12 — today-LC: (A) expand LC pill vs (B) strip “Log LC” affordance
 *   Q14 — archived look via ?arch= mute | ghost | list (Active/Archived chips)
 *
 * Ticket: docs/features/F11-habits-and-weekly-targets/tickets/M0/M0-01-prototype-habits-strip.md
 */
import { useEffect, useState } from "react";
import F11Shell, { ParamToggle, useParam, useVariant } from "./F11Shell";
import HabitsStrip, { type CheckChrome, type TodayLcMode } from "./HabitsStrip";
import {
  ARCH_LOOKS,
  CAP_SCENARIOS,
  MOCK_LC,
  MOCK_PULSE,
  seedCustoms,
  type ArchLook,
  type CapScenario,
  type CustomHabit,
  type DerivedStreak,
} from "./fixtures";

/** Default first = current lean (Q11 mark · Q12 Log LC). */
const VARIANTS = [
  {
    key: "D",
    name: "Lean · mark hit-target · Log LC",
  },
  {
    key: "C",
    name: "Q11 mark hit-target · Q12 expand LC",
  },
  {
    key: "B",
    name: "Q11 dedicated ✓/− · Q12 Log LC",
  },
  {
    key: "A",
    name: "Q11 dedicated ✓/− · Q12 expand LC",
  },
] as const;

function variantAxes(key: string): { checkChrome: CheckChrome; todayLcMode: TodayLcMode } {
  switch (key) {
    case "A":
      return { checkChrome: "dedicated", todayLcMode: "expand" };
    case "B":
      return { checkChrome: "dedicated", todayLcMode: "log" };
    case "C":
      return { checkChrome: "mark", todayLcMode: "expand" };
    default:
      return { checkChrome: "mark", todayLcMode: "log" };
  }
}

function PulseCards() {
  return (
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
  );
}

function SharedStripState({
  checkChrome,
  todayLcMode,
  archLook,
  customs,
  onCustomsChange,
  lcToday,
  onLcTodayChange,
  message,
  onMessage,
}: {
  checkChrome: CheckChrome;
  todayLcMode: TodayLcMode;
  archLook: ArchLook;
  customs: CustomHabit[];
  onCustomsChange: (next: CustomHabit[]) => void;
  lcToday: DerivedStreak;
  onLcTodayChange: (next: DerivedStreak) => void;
  message: string | null;
  onMessage: (msg: string | null) => void;
}) {
  const shared = {
    checkChrome,
    todayLcMode,
    archLook,
    customs,
    onCustomsChange,
    lcToday,
    onLcTodayChange,
    message,
    onMessage,
  };
  return (
    <div className="f11-surfaces">
      <div className="f11-surface-frame">
        <p className="f11-surface-label">Home · Habits strip</p>
        <header className="home-hero card f11-home-mock">
          <div className="home-progress-stack">
            <span className="progress-kicker">Today · mock</span>
            <HabitsStrip {...shared} surface="home" />
          </div>
        </header>
      </div>
      <div className="f11-surface-frame">
        <p className="f11-surface-label">Progress · This week</p>
        <div className="f11-progress-mock">
          <PulseCards />
          <HabitsStrip {...shared} surface="progress" />
          <p className="muted f11-progress-aside-note">
            Weekly goals column + incrementer omitted here (M0-02). No Next achievements · no Daily
            progress aside (R1.12).
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HabitsStripPrototypePage() {
  const variant = useVariant(VARIANTS);
  const { checkChrome, todayLcMode } = variantAxes(variant);
  const cap = useParam(
    "cap",
    CAP_SCENARIOS.map((s) => s.key),
  ) as CapScenario;
  const archLook = useParam(
    "arch",
    ARCH_LOOKS.map((a) => a.key),
  ) as ArchLook;

  const [customs, setCustoms] = useState(() => seedCustoms(cap));
  const [lcToday, setLcToday] = useState<DerivedStreak>({ ...MOCK_LC });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setCustoms(seedCustoms(cap));
    setMessage(null);
    setLcToday({ ...MOCK_LC });
  }, [cap]);

  const archMeta = ARCH_LOOKS.find((a) => a.key === archLook)!;

  return (
    <F11Shell
      title="Habits strip · Home + Progress"
      question="Q11 mark ✓/− top-right (Apps/LC-like) + pencil beside title. Q12 Log LC in the header row (left of Active/Archived). Q14 ghost stamp preferred."
      variants={VARIANTS}
      surfaceLabel="M0-01 strip"
      controls={
        <>
          <ParamToggle name="cap" label="Cap scenario" options={[...CAP_SCENARIOS]} />
          <ParamToggle
            name="arch"
            label="Q14 archived look"
            options={ARCH_LOOKS.map((a) => ({ key: a.key, label: a.label }))}
          />
        </>
      }
      notes={
        <>
          <p>
            <strong>Preferred · variant D:</strong> Q11 mark hit-target · Q12 Log LC disclosure ·
            Q14 ghost stamp. Customs use <code>{"{name} daily streak"}</code> like Apps/LC. Actions
            right-aligned on the habits band; Update progress below. Archive asks for confirm.
            Restoring the last archived habit returns to Active and disables Archived.
          </p>
          <p>
            <strong>Current axes:</strong> Q11 ={" "}
            {checkChrome === "dedicated" ? "dedicated ✓/− button" : "mark as hit-target"}; Q12 ={" "}
            {todayLcMode === "expand" ? "A · expand LC pill" : "B · Log LC disclosure"}; Q14 ={" "}
            {archMeta.label} — {archMeta.blurb}.
          </p>
          <p>
            Edit modal: Cancel · Archive (danger, with confirm) · Save name.
          </p>
        </>
      }
    >
      <SharedStripState
        checkChrome={checkChrome}
        todayLcMode={todayLcMode}
        archLook={archLook}
        customs={customs}
        onCustomsChange={setCustoms}
        lcToday={lcToday}
        onLcTodayChange={setLcToday}
        message={message}
        onMessage={setMessage}
      />
    </F11Shell>
  );
}
