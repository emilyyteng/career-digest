/**
 * F08 M5-07 · design question 1: today strip with daily streaks (R5.27).
 * Replaces x/3 counts; deep-work badges gone. Optional reflection badges
 * for “wrote a reflection today” (user considering bringing badges back).
 */
import F08StreaksShell, { ParamToggle, useParam, useVariant } from "./F08StreaksShell";
import { TODAY_STRIP_SCENARIOS } from "./fixtures";

const VARIANTS = [
  { key: "A", name: "Text line · “Apps 5 ✓ · LC 12 _”" },
  { key: "B", name: "Chips · streak count + today / pending" },
  { key: "C", name: "Compact · short labels, optional reflection badges" },
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

function StripA({
  appsStreak,
  lcStreak,
  appsToday,
  lcToday,
  showRefl,
  lanes,
}: {
  appsStreak: number;
  lcStreak: number;
  appsToday: boolean;
  lcToday: boolean;
  showRefl: boolean;
  lanes: Array<"app" | "tech" | "other">;
}) {
  return (
    <p className="f08s-strip progress-today-strip">
      <span className={appsToday ? "f08s-strip-seg is-done" : "f08s-strip-seg is-pending"}>
        Apps {appsStreak}
        <span className="f08s-strip-mark" aria-hidden="true">
          {" "}
          {appsToday ? "✓" : "_"}
        </span>
      </span>
      <span className="f08s-strip-sep"> · </span>
      <span className={lcToday ? "f08s-strip-seg is-done" : "f08s-strip-seg is-pending"}>
        LC {lcStreak}
        <span className="f08s-strip-mark" aria-hidden="true">
          {" "}
          {lcToday ? "✓" : "_"}
        </span>
      </span>
      {showRefl && <ReflectionBadges lanes={lanes} />}
    </p>
  );
}

function StripB({
  appsStreak,
  lcStreak,
  appsToday,
  lcToday,
  showRefl,
  lanes,
}: {
  appsStreak: number;
  lcStreak: number;
  appsToday: boolean;
  lcToday: boolean;
  showRefl: boolean;
  lanes: Array<"app" | "tech" | "other">;
}) {
  return (
    <div className="f08s-strip-chips">
      <span className={appsToday ? "f08s-strip-chip is-done" : "f08s-strip-chip is-pending"}>
        <span className="f08s-strip-chip-label">Apps {appsStreak}</span>
        <span className="f08s-strip-chip-meta">{appsToday ? "today" : "pending"}</span>
      </span>
      <span className={lcToday ? "f08s-strip-chip is-done" : "f08s-strip-chip is-pending"}>
        <span className="f08s-strip-chip-label">LC {lcStreak}</span>
        <span className="f08s-strip-chip-meta">{lcToday ? "today" : "pending"}</span>
      </span>
      {showRefl && <ReflectionBadges lanes={lanes} />}
    </div>
  );
}

function StripC({
  appsStreak,
  lcStreak,
  appsToday,
  lcToday,
  showRefl,
  lanes,
}: {
  appsStreak: number;
  lcStreak: number;
  appsToday: boolean;
  lcToday: boolean;
  showRefl: boolean;
  lanes: Array<"app" | "tech" | "other">;
}) {
  return (
    <p className="f08s-strip progress-today-strip">
      <span className={appsToday ? "f08s-strip-seg is-done" : "f08s-strip-seg is-pending"}>
        {appsStreak} apps{appsToday ? "" : " · open"}
      </span>
      <span className="f08s-strip-sep"> · </span>
      <span className={lcToday ? "f08s-strip-seg is-done" : "f08s-strip-seg is-pending"}>
        {lcStreak} LC{lcToday ? "" : " · open"}
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

  const props = {
    appsStreak: scenario.appsStreak,
    lcStreak: scenario.lcStreak,
    appsToday: scenario.appsToday,
    lcToday: scenario.lcToday,
    showRefl,
    lanes: scenario.reflectionLanes,
  };

  const Strip = variant === "B" ? StripB : variant === "C" ? StripC : StripA;

  return (
    <F08StreaksShell
      title="Today strip · daily streaks"
      question="Q1: how apps and LC streaks read at a glance, including “today not done yet”, with deep-work badges gone. Decide whether reflection-written badges return."
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
          Today doesn’t break a streak until the day ends (R5.25), so “pending” still shows the current
          length. Deep-work badges are retired (R5.29). Reflection badges are optional — at least one
          variant with and without; verdict here.
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
