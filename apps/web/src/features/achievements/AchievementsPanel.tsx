import { useEffect, useState } from "react";
import { getAchievements, type AchievementRow } from "../../api";

function nextIds(list: AchievementRow[]): Set<string> {
  const families = new Set(list.map((a) => a.family));
  const ids = new Set<string>();
  for (const family of families) {
    const next = list.find((a) => a.family === family && !a.unlocked);
    if (next) ids.add(next.id);
  }
  return ids;
}

export default function AchievementsPanel() {
  const [rows, setRows] = useState<AchievementRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getAchievements()
      .then((data) => {
        if (!cancelled) setRows(data.achievements);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!rows) return <p className="muted">Loading achievements…</p>;

  const next = nextIds(rows);

  return (
    <section className="card achievements-panel">
      <h3 className="achievements-heading">Achievements</h3>
      <p className="muted achievements-hint">
        Locked, next, and unlocked. Daily streaks live on the today strip.
      </p>
      <ul className="achievements-list">
        {rows.map((a) => {
          const isNext = next.has(a.id);
          const className = [
            "achievements-item",
            a.unlocked ? "is-unlocked" : "is-locked",
            isNext ? "is-next" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const pct = Math.min(100, Math.round((a.current / a.threshold) * 100));
          return (
            <li key={a.id} className={className}>
              <div className="achievements-item-head">
                <span className="achievements-kind">{a.family}</span>
                <strong>{a.label}</strong>
                {a.launchUnlock && <span className="muted">at launch · no points</span>}
              </div>
              <span className={a.unlocked && !a.launchUnlock ? "achievements-pts" : "achievements-pts is-muted"}>
                +{a.points}
              </span>
              {!a.unlocked && (
                <div className="achievements-progress">
                  <div className="achievements-bar" aria-hidden="true">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <span>
                    {a.current}/{a.threshold}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
