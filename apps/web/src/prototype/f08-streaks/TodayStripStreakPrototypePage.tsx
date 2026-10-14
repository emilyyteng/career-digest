/**
 * F08 M5-07 · design question 1: today strip with daily streaks (R5.27).
 * Round 2: make “streak” unmistakable vs today’s unit count; keep A’s ✓ for
 * “done today”; try the achievements-style streak pills on Home.
 */
import F08StreaksShell, { ParamToggle, useParam, useVariant } from "./F08StreaksShell";
import { dailyStreakPoints, TODAY_STRIP_SCENARIOS } from "./fixtures";

const VARIANTS = [
  {
    key: "D",
    name: "Streak pills · count + “day streak” + pts; ✓ / pending (from achievements)",
  },
  { key: "E", name: "Text · “Apps streak 5 ✓ · LC streak 12 _”" },
  {
    key: "F",
    name: "Both · today’s units + day streak (compare clarity)",
  },
] as const;

const LANE_SHORT: Record<"app" | "tech" | "other", string> = {
  app: "A",
  tech: "T",
  other: "O",
};

function ReflectionBadges({ lanes }: { lanes: Array<"app" | "tech" | "other"> }) {
  if (lanes.length === 0) return null;
  return (
    <span className="f08s-refl-badges" aria-label="Reflections written today">
      {lanes.map((lane) => (
        <span key={lane} className="f08s-refl-badge" title={`${lane} reflection`}>
          {LANE_SHORT[lane]}
        </span>
      ))}
    </span>
  );
}

type StripProps = {
  appsStreak: number;
  lcStreak: number;
  appsToday: boolean;
  lcToday: boolean;
  appsTodayCount: number;
  lcTodayCount: number;
  showRefl: boolean;
  lanes: Array<"app" | "tech" | "other">;
};

function StreakPill({
  label,
  streak,
  doneToday,
}: {
  label: string;
  streak: number;
  doneToday: boolean;
}) {
  const earnedOrNext = doneToday
    ? dailyStreakPoints(streak)
    : dailyStreakPoints(streak + 1);
  return (
    <div
      className={doneToday ? "f08s-strip-streak-pill is-done" : "f08s-strip-streak-pill is-pending"}
      aria-label={`${label} ${streak}-day streak${doneToday ? ", done today" : ", not yet today"}`}
    >
      <div className="f08s-strip-streak-pill-top">
        <strong className="f08s-strip-streak-n">{streak}</strong>
        <span className="f08s-strip-mark" aria-hidden="true">
          {doneToday ? "✓" : "_"}
        </span>
      </div>
      <span className="f08s-strip-streak-label">{label} day streak</span>
      <span className="f08s-strip-streak-pts">
        {doneToday
          ? `+${earnedOrNext} today`
          : streak > 0
            ? `+${earnedOrNext} if you continue`
            : `+${earnedOrNext} to start`}
      </span>
    </div>
  );
}

/** Compact Home/Progress strip using the achievements daily-streak pill language. */
function StripD({ appsStreak, lcStreak, appsToday, lcToday, showRefl, lanes }: StripProps) {
  return (
    <div className="f08s-strip-streak-row">
      <StreakPill label="Apps" streak={appsStreak} doneToday={appsToday} />
      <StreakPill label="LC" streak={lcStreak} doneToday={lcToday} />
      {showRefl && <ReflectionBadges lanes={lanes} />}
    </div>
  );
}

function StripE({ appsStreak, lcStreak, appsToday, lcToday, showRefl, lanes }: StripProps) {
  return (
    <p className="f08s-strip progress-today-strip">
      <span className={appsToday ? "f08s-strip-seg is-done" : "f08s-strip-seg is-pending"}>
        Apps streak {appsStreak}
        <span className="f08s-strip-mark" aria-hidden="true">
          {" "}
          {appsToday ? "✓" : "_"}
        </span>
      </span>
      <span className="f08s-strip-sep"> · </span>
      <span className={lcToday ? "f08s-strip-seg is-done" : "f08s-strip-seg is-pending"}>
        LC streak {lcStreak}
        <span className="f08s-strip-mark" aria-hidden="true">
          {" "}
          {lcToday ? "✓" : "_"}
        </span>
      </span>
      {showRefl && <ReflectionBadges lanes={lanes} />}
    </p>
  );
}

function StripF({
  appsStreak,
  lcStreak,
  appsToday,
  lcToday,
  appsTodayCount,
  lcTodayCount,
  showRefl,
  lanes,
}: StripProps) {
  return (
    <p className="f08s-strip progress-today-strip">
      <span className={appsToday ? "f08s-strip-seg is-done" : "f08s-strip-seg is-pending"}>
        Apps {appsTodayCount} today · {appsStreak}-day streak
        <span className="f08s-strip-mark" aria-hidden="true">
          {" "}
          {appsToday ? "✓" : "_"}
        </span>
      </span>
      <span className="f08s-strip-sep"> · </span>
      <span className={lcToday ? "f08s-strip-seg is-done" : "f08s-strip-seg is-pending"}>
        LC {lcTodayCount} today · {lcStreak}-day streak
        <span className="f08s-strip-mark" aria-hidden="true">
          {" "}
          {lcToday ? "✓" : "_"}
        </span>
      </span>
      {showRefl && <ReflectionBadges lanes={lanes} />}
    </p>
  );
}

export default function TodayStripStreakPrototypePage() {
  const variant = useVariant(VARIANTS);
  const scenarioKey = useParam(
    "s",
    TODAY_STRIP_SCENARIOS.map((s) => s.key),
  );
  const badges = useParam("badges", ["off", "on"] as const);
  const scenario = TODAY_STRIP_SCENARIOS.find((s) => s.key === scenarioKey)!;
  const showRefl = badges === "on";

  const props: StripProps = {
    appsStreak: scenario.appsStreak,
    lcStreak: scenario.lcStreak,
    appsToday: scenario.appsToday,
    lcToday: scenario.lcToday,
    appsTodayCount: scenario.appsTodayCount,
    lcTodayCount: scenario.lcTodayCount,
    showRefl,
    lanes: scenario.reflectionLanes,
  };

  const Strip = variant === "E" ? StripE : variant === "F" ? StripF : StripD;

  return (
    <F08StreaksShell
      title="Today strip · daily streaks"
      question="Q1: make the day-streak count obvious (not today’s unit tally). ✓ = checked off for today. Compare streak-only vs streak + today’s counts."
      variants={VARIANTS}
      surfaceLabel="Q1 Today strip"
      controls={
        <>
          <ParamToggle
            name="s"
            label="Scenario"
            options={TODAY_STRIP_SCENARIOS.map((s) => ({ key: s.key, label: s.label }))}
          />
          <ParamToggle
            name="badges"
            label="Reflection badges"
            options={[
              { key: "off", label: "Off" },
              { key: "on", label: "On" },
            ]}
          />
        </>
      }
      notes={
        <p>
          R5.27 replaces the old <code>x/3</code> daily caps with streaks. Round 1 copy read like a per-day
          count; D/E/F say “streak” / “day streak” explicitly. D borrows the Progress achievements pills (length,
          +pts, pending vs done). F shows both today’s units and the streak so you can pick streak-only vs both.
          Deep-work badges stay gone (R5.29).
        </p>
      }
    >
      <div className="f08s-surfaces">
        <div className="f08s-strip-frame">
          <p className="f08s-surface-label">Home hero</p>
          <header className="home-hero card f08-card">
            <div className="home-progress-stack">
              <div className="home-progress-row">
                <div className="home-progress-strip">
                  <Strip {...props} />
                </div>
              </div>
            </div>
          </header>
        </div>
        <div className="f08s-strip-frame">
          <p className="f08s-surface-label">Progress · Today</p>
          <section className="card f08-card">
            <div className="progress-today-head">
              <p className="progress-kicker">Today</p>
              <Strip {...props} />
            </div>
            <p className="muted f08-hint" style={{ marginBottom: 0 }}>
              Rest of the Today panel omitted.
            </p>
          </section>
        </div>
      </div>
    </F08StreaksShell>
  );
}
