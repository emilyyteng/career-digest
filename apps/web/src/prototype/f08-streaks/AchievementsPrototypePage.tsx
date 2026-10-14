/**
 * F08 M5-07 · design questions 2 + 3: streaks/achievements surface before M8,
 * and the unlock moment (EarnFlash vs modal vs one-time notice).
 */
import { useCallback, useState } from "react";
import EarnFlash from "../../features/completion/EarnFlash";
import type { PointsEarnInfo } from "../../api";
import F08StreaksShell, { btn, ParamToggle, useParam, useVariant } from "./F08StreaksShell";
import {
  ACHIEVEMENTS,
  DAILY_STREAKS_MOCK,
  UNLOCK_SAMPLES,
  dailyStreakPoints,
  type Achievement,
  type AchievementKind,
} from "./fixtures";

const VARIANTS = [
  { key: "A", name: "Progress card · daily streaks + next achievements" },
  { key: "B", name: "Full list · locked / next / unlocked states" },
  { key: "C", name: "Filtered catalog · kind chips" },
] as const;

function nextForKind(kind: AchievementKind, list: Achievement[]): Achievement | null {
  return list.find((a) => a.kind === kind && !a.unlocked) ?? null;
}

function AchProgress({ a }: { a: Achievement }) {
  const pct = Math.min(100, Math.round((a.current / a.threshold) * 100));
  return (
    <div className="f08s-ach-progress">
      <div className="f08s-ach-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <span>
        {a.current}/{a.threshold}
      </span>
    </div>
  );
}

function AchItem({ a, emphasizeNext }: { a: Achievement; emphasizeNext?: boolean }) {
  const isNext = emphasizeNext && !a.unlocked;
  const className = [
    "f08s-ach-item",
    a.unlocked ? "is-unlocked" : "is-locked",
    isNext ? "is-next" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <li className={className}>
      <div className="f08s-ach-item-head">
        <span className="f08s-ach-kind">{a.kind}</span>
        <strong>{a.label}</strong>
        {a.launchUnlock && <span className="muted">at launch · no points</span>}
      </div>
      <span className={a.unlocked && !a.launchUnlock ? "f08s-ach-pts" : "f08s-ach-pts is-muted"}>
        {a.unlocked && !a.launchUnlock ? `+${a.points}` : `+${a.points}`}
      </span>
      {!a.unlocked && <AchProgress a={a} />}
    </li>
  );
}

function DailyStreaks() {
  const { apps, lc } = DAILY_STREAKS_MOCK;
  return (
    <div className="f08s-daily-row">
      <div className="f08s-daily-pill">
        <strong>{apps.length}</strong>
        <span>Apps streak</span>
        <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>
          +{dailyStreakPoints(apps.length)} today
        </span>
      </div>
      <div className="f08s-daily-pill">
        <strong>{lc.length}</strong>
        <span>LC streak</span>
        <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>
          +{dailyStreakPoints(lc.length)} today
        </span>
      </div>
    </div>
  );
}

function SurfaceA({ list }: { list: Achievement[] }) {
  const nextApps = nextForKind("apps", list);
  const nextLc = nextForKind("lc", list);
  const nextIv = nextForKind("interview", list);
  const nexts = [nextApps, nextLc, nextIv].filter(Boolean) as Achievement[];
  const unlocked = list.filter((a) => a.unlocked);
  return (
    <section className="card f08-card f08s-ach-grid">
      <h3 style={{ margin: 0 }}>Streaks &amp; achievements</h3>
      <p className="muted f08-hint" style={{ margin: 0 }}>
        Provisional Progress block (M8 may move this).
      </p>
      <DailyStreaks />
      <p className="f08s-surface-label">Next</p>
      <ul className="f08s-ach-list">
        {nexts.map((a) => (
          <AchItem key={a.id} a={a} emphasizeNext />
        ))}
      </ul>
      {unlocked.length > 0 && (
        <>
          <p className="f08s-surface-label">Unlocked</p>
          <ul className="f08s-ach-list">
            {unlocked.map((a) => (
              <AchItem key={a.id} a={a} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function SurfaceB({ list }: { list: Achievement[] }) {
  const nextIds = new Set(
    (["apps", "lc", "interview"] as AchievementKind[])
      .map((k) => nextForKind(k, list)?.id)
      .filter(Boolean),
  );
  return (
    <section className="card f08-card">
      <h3 style={{ marginTop: 0 }}>Achievements</h3>
      <DailyStreaks />
      <ul className="f08s-ach-list">
        {list.map((a) => (
          <AchItem key={a.id} a={a} emphasizeNext={nextIds.has(a.id)} />
        ))}
      </ul>
    </section>
  );
}

function SurfaceC({ list, filter }: { list: Achievement[]; filter: string }) {
  const filtered = filter === "all" ? list : list.filter((a) => a.kind === filter);
  return (
    <section className="card f08-card">
      <h3 style={{ marginTop: 0 }}>Achievements</h3>
      <p className="muted f08-hint">Filter by kind. Daily streaks stay above.</p>
      <DailyStreaks />
      <ul className="f08s-ach-list">
        {filtered.map((a) => (
          <AchItem key={a.id} a={a} emphasizeNext={!a.unlocked && a.current / a.threshold >= 0.5} />
        ))}
      </ul>
    </section>
  );
}

export default function AchievementsPrototypePage() {
  const variant = useVariant(VARIANTS);
  const unlockStyle = useParam("unlock", ["modal", "flash", "notice"] as const);
  const unlockKind = useParam("kind", ["achievement", "streak-milestone"] as const);
  const filter = useParam("filter", ["all", "apps", "lc", "interview"] as const);
  const sample = UNLOCK_SAMPLES[unlockKind];
  const [earn, setEarn] = useState<PointsEarnInfo | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState(false);
  const [balance, setBalance] = useState(1420);

  const trigger = useCallback(() => {
    const nextBalance = balance + sample.points;
    setBalance(nextBalance);
    setEarn(null);
    setModalOpen(false);
    setNotice(false);
    if (unlockStyle === "flash") {
      setEarn({
        amount: sample.points,
        message: `${sample.title}: ${sample.detail}`,
        balanceAfter: nextBalance,
      });
    } else if (unlockStyle === "modal") {
      setModalOpen(true);
    } else {
      setNotice(true);
    }
  }, [balance, sample, unlockStyle]);

  return (
    <F08StreaksShell
      title="Streaks & achievements surface"
      question="Q2: where streaks and achievements are seen before M8, and how locked / unlocked / next look. Q3: how a milestone or achievement unlock is announced."
      variants={VARIANTS}
      surfaceLabel="Q2+Q3 Achievements"
      controls={
        <>
          <ParamToggle
            name="unlock"
            label="Unlock moment"
            options={[
              { key: "modal", label: "Modal ✓" },
              { key: "flash", label: "EarnFlash" },
              { key: "notice", label: "Notice" },
            ]}
          />
          <ParamToggle
            name="kind"
            label="Unlock kind"
            options={[
              { key: "achievement", label: "Achievement" },
              { key: "streak-milestone", label: "Streak milestone" },
            ]}
          />
          {variant === "C" && (
            <ParamToggle
              name="filter"
              label="Filter"
              options={[
                { key: "all", label: "All" },
                { key: "apps", label: "Apps" },
                { key: "lc", label: "LC" },
                { key: "interview", label: "Interview" },
              ]}
            />
          )}
          <button type="button" className={btn("primary", "sm")} onClick={trigger}>
            Trigger unlock
          </button>
        </>
      }
      notes={
        <p>
          Mock counts from R5.26. Surface placement is provisional on Progress until M8 (R8.5). Unlock
          verdict (2026-10-13): modal. Launch unlocks show with no points. The daily streak pills here also
          inform the Home today-strip redesign (Q1).
        </p>
      }
    >
      <div className="f08s-unlock-stage">
        {earn && <EarnFlash earn={earn} onDismiss={() => setEarn(null)} />}
        {notice && (
          <p className="f08s-unlock-notice" role="status">
            <span>
              <strong>{sample.title}</strong> · {sample.detail}{" "}
              <span className="f08s-ach-pts">+{sample.points}</span>
            </span>
            <button
              type="button"
              className="earn-flash-dismiss f08-dismiss"
              aria-label="Dismiss"
              onClick={() => setNotice(false)}
            >
              ×
            </button>
          </p>
        )}
        {variant === "A" && <SurfaceA list={ACHIEVEMENTS} />}
        {variant === "B" && <SurfaceB list={ACHIEVEMENTS} />}
        {variant === "C" && <SurfaceC list={ACHIEVEMENTS} filter={filter} />}
        {modalOpen && (
          <div className="f08s-unlock-modal" role="dialog" aria-modal="true" aria-label={sample.title}>
            <div className="f08s-unlock-card">
              <h3>{sample.title}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {sample.detail}
              </p>
              <p className="f08s-unlock-pts">+{sample.points}</p>
              <p className="f08s-unlock-balance">Balance: {balance}</p>
              <button
                type="button"
                className={`${btn("primary", "sm")} f08s-unlock-cta`}
                onClick={() => setModalOpen(false)}
              >
                Great work!
              </button>
            </div>
          </div>
        )}
      </div>
    </F08StreaksShell>
  );
}
