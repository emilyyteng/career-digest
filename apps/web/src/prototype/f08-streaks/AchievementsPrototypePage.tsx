/**
 * F08 M5-07 · design questions 2 + 3: achievements surface and unlock moment.
 * Verdict (2026-10-13): Progress tab “achievements” (next to ledger) for M5-11;
 * M8 may still redesign Progress overall. Unlock = modal (“Great work!”, Balance: N).
 */
import { useCallback, useState, type ReactNode } from "react";
import F08StreaksShell, { btn, ParamToggle, useParam, useVariant } from "./F08StreaksShell";
import {
  ACHIEVEMENTS,
  UNLOCK_SAMPLES,
  type Achievement,
  type AchievementKind,
} from "./fixtures";

const VARIANTS = [
  { key: "Tab", name: "Chosen · Progress tab “achievements” (list + modal unlock)" },
  { key: "B", name: "Earlier · full list card only" },
  { key: "C", name: "Earlier · filtered catalog" },
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
        +{a.points}
      </span>
      {!a.unlocked && <AchProgress a={a} />}
    </li>
  );
}

function AchievementsList({ list, filter }: { list: Achievement[]; filter?: string }) {
  const filtered = !filter || filter === "all" ? list : list.filter((a) => a.kind === filter);
  const nextIds = new Set(
    (["apps", "lc", "interview"] as AchievementKind[])
      .map((k) => nextForKind(k, list)?.id)
      .filter(Boolean),
  );
  return (
    <ul className="f08s-ach-list">
      {filtered.map((a) => (
        <AchItem key={a.id} a={a} emphasizeNext={nextIds.has(a.id)} />
      ))}
    </ul>
  );
}

function ProgressTabsChrome({
  active,
  children,
}: {
  active: "today" | "history" | "ledger" | "achievements";
  children: ReactNode;
}) {
  const tabs = [
    { key: "today", label: "today" },
    { key: "history", label: "history" },
    { key: "ledger", label: "ledger" },
    { key: "achievements", label: "achievements" },
  ] as const;
  return (
    <div className="f08s-progress-chrome">
      <div className="tabs" role="tablist" aria-label="Progress (mock)">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={active === t.key ? "tab on" : "tab"}
            aria-selected={active === t.key}
          >
            {t.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}

export default function AchievementsPrototypePage() {
  const variant = useVariant(VARIANTS);
  const unlockStyle = useParam("unlock", ["modal", "flash", "notice"] as const);
  const unlockKind = useParam("kind", ["achievement", "streak-milestone"] as const);
  const filter = useParam("filter", ["all", "apps", "lc", "interview"] as const);
  const sample = UNLOCK_SAMPLES[unlockKind];
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState(false);
  const [balance, setBalance] = useState(1420);
  const [flashLine, setFlashLine] = useState<string | null>(null);

  const trigger = useCallback(() => {
    const nextBalance = balance + sample.points;
    setBalance(nextBalance);
    setModalOpen(false);
    setNotice(false);
    setFlashLine(null);
    if (unlockStyle === "modal") {
      setModalOpen(true);
    } else if (unlockStyle === "notice") {
      setNotice(true);
    } else {
      setFlashLine(`${sample.title}: ${sample.detail} · +${sample.points} · balance ${nextBalance}`);
    }
  }, [balance, sample, unlockStyle]);

  const listBlock = (
    <section className="card f08-card">
      <h3 style={{ marginTop: 0 }}>Achievements</h3>
      <p className="muted f08-hint">
        Locked, next (accent), and unlocked. Daily streaks live on the today strip (Q1), not here.
      </p>
      {(variant === "C" || variant === "Tab") && (
        <div className="f08s-ach-filters" role="group" aria-label="Filter">
          {(["all", "apps", "lc", "interview"] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={btn("ghost", "sm", (variant === "C" ? filter : "all") === k ? "is-active" : "")}
              disabled={variant !== "C" && k !== "all"}
            >
              {k}
            </button>
          ))}
        </div>
      )}
      <AchievementsList list={ACHIEVEMENTS} filter={variant === "C" ? filter : "all"} />
    </section>
  );

  return (
    <F08StreaksShell
      title="Achievements surface & unlock"
      question="Q2: Progress tab “achievements” next to ledger for M5-11 (M8 may still redesign Progress). Q3: unlock modal."
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
          Verdict (2026-10-13): surface = Progress <strong>achievements</strong> tab beside ledger (M5-11);
          M8 owns the broader Progress IA (R8.5). Unlock = modal with “Great work!” and{" "}
          <code>Balance: N</code>. List shows locked / next / unlocked (and launch unlocks with no points).
        </p>
      }
    >
      <div className="f08s-unlock-stage">
        {flashLine && (
          <p className="earn-flash" role="status">
            <span className="earn-flash-msg">{flashLine}</span>
            <button
              type="button"
              className="earn-flash-dismiss"
              aria-label="Dismiss"
              onClick={() => setFlashLine(null)}
            >
              ×
            </button>
          </p>
        )}
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
        {variant === "Tab" ? (
          <ProgressTabsChrome active="achievements">{listBlock}</ProgressTabsChrome>
        ) : (
          listBlock
        )}
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
