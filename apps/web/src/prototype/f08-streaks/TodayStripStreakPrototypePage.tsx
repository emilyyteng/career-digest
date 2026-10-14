/**
 * F08 M5-07 · design question 1: today strip with daily streaks (R5.27).
 * Verdict (2026-10-13): D · streak pills; ✓ done / − pending; +N or +0 today;
 * no reflection badges; streak starts at 1.
 */
import F08StreaksShell, { ParamToggle, useParam, useVariant } from "./F08StreaksShell";
import { dailyStreakPoints, TODAY_STRIP_SCENARIOS } from "./fixtures";

const VARIANTS = [
  {
    key: "D",
    name: "Chosen · streak pills; ✓ / −; +pts or +0 today",
  },
  { key: "E", name: "Rejected · text “Apps streak N”" },
  { key: "F", name: "Rejected · today units + day streak" },
] as const;

type StripProps = {
  appsStreak: number;
  lcStreak: number;
  appsToday: boolean;
  lcToday: boolean;
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
  const ptsToday = doneToday ? dailyStreakPoints(streak) : 0;
  return (
    <div
      className={doneToday ? "f08s-strip-streak-pill is-done" : "f08s-strip-streak-pill is-pending"}
      aria-label={`${label} ${streak}-day streak${doneToday ? ", done today" : ", not yet today"}, +${ptsToday} today`}
    >
      <div className="f08s-strip-streak-pill-top">
        <strong className="f08s-strip-streak-n">{streak}</strong>
        <span className="f08s-strip-mark" aria-hidden="true">
          {doneToday ? "✓" : "−"}
        </span>
      </div>
      <span className="f08s-strip-streak-label">{label} day streak</span>
      <span className="f08s-strip-streak-pts">+{ptsToday} today</span>
    </div>
  );
}

function StripD({ appsStreak, lcStreak, appsToday, lcToday }: StripProps) {
  return (
    <div className="f08s-strip-streak-row">
      <StreakPill label="Apps" streak={appsStreak} doneToday={appsToday} />
      <StreakPill label="LC" streak={lcStreak} doneToday={lcToday} />
    </div>
  );
}

function StripE({ appsStreak, lcStreak, appsToday, lcToday }: StripProps) {
  return (
    <p className="f08s-strip progress-today-strip">
      <span className={appsToday ? "f08s-strip-seg is-done" : "f08s-strip-seg is-pending"}>
        Apps streak {appsStreak}
        <span className="f08s-strip-mark" aria-hidden="true">
          {" "}
          {appsToday ? "✓" : "−"}
        </span>
      </span>
      <span className="f08s-strip-sep"> · </span>
      <span className={lcToday ? "f08s-strip-seg is-done" : "f08s-strip-seg is-pending"}>
        LC streak {lcStreak}
        <span className="f08s-strip-mark" aria-hidden="true">
          {" "}
          {lcToday ? "✓" : "−"}
        </span>
      </span>
    </p>
  );
}

function StripF({
  appsStreak,
  lcStreak,
  appsToday,
  lcToday,
}: StripProps & { appsTodayCount: number; lcTodayCount: number }) {
  return (
    <p className="f08s-strip progress-today-strip">
      <span className={appsToday ? "f08s-strip-seg is-done" : "f08s-strip-seg is-pending"}>
        Apps streak {appsStreak}
        <span className="f08s-strip-mark" aria-hidden="true">
          {" "}
          {appsToday ? "✓" : "−"}
        </span>
      </span>
      <span className="f08s-strip-sep"> · </span>
      <span className={lcToday ? "f08s-strip-seg is-done" : "f08s-strip-seg is-pending"}>
        LC streak {lcStreak}
        <span className="f08s-strip-mark" aria-hidden="true">
          {" "}
          {lcToday ? "✓" : "−"}
        </span>
      </span>
    </p>
  );
}

export default function TodayStripStreakPrototypePage() {
  const variant = useVariant(VARIANTS);
  const scenarioKey = useParam(
    "s",
    TODAY_STRIP_SCENARIOS.map((s) => s.key),
  );
  const scenario = TODAY_STRIP_SCENARIOS.find((s) => s.key === scenarioKey)!;

  const props: StripProps = {
    appsStreak: scenario.appsStreak,
    lcStreak: scenario.lcStreak,
    appsToday: scenario.appsToday,
    lcToday: scenario.lcToday,
  };

  return (
    <F08StreaksShell
      title="Today strip · daily streaks"
      question="Q1: day-streak pills on Home and Progress. ✓ = done today; − = not yet; +pts only when today counts, else +0."
      variants={VARIANTS}
      surfaceLabel="Q1 Today strip"
      controls={
        <ParamToggle
          name="s"
          label="Scenario"
          options={TODAY_STRIP_SCENARIOS.map((s) => ({ key: s.key, label: s.label }))}
        />
      }
      notes={
        <p>
          Verdict (2026-10-13): <strong>D</strong>. Streak length is the day count (starts at 1 on the first
          qualifying action — no separate minimum). Points line is <code>+N today</code> when today counts,
          otherwise <code>+0 today</code>. No reflection badges. Deep-work badges stay gone (R5.29).
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
                  {variant === "E" ? (
                    <StripE {...props} />
                  ) : variant === "F" ? (
                    <StripF
                      {...props}
                      appsTodayCount={scenario.appsTodayCount}
                      lcTodayCount={scenario.lcTodayCount}
                    />
                  ) : (
                    <StripD {...props} />
                  )}
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
              {variant === "E" ? (
                <StripE {...props} />
              ) : variant === "F" ? (
                <StripF
                  {...props}
                  appsTodayCount={scenario.appsTodayCount}
                  lcTodayCount={scenario.lcTodayCount}
                />
              ) : (
                <StripD {...props} />
              )}
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
