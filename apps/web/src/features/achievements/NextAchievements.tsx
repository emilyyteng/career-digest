import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAchievements, type AchievementRow } from "../../api";

function nextPerFamily(list: AchievementRow[]): AchievementRow[] {
  const families = new Set(list.map((a) => a.family));
  const out: AchievementRow[] = [];
  for (const family of families) {
    const next = list.find((a) => a.family === family && !a.unlocked);
    if (next) out.push(next);
  }
  return out;
}

/** Compact one-next-per-family list for Progress This week (R8.10). */
export default function NextAchievements() {
  const [rows, setRows] = useState<AchievementRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getAchievements()
      .then((data) => {
        if (!cancelled) setRows(data.achievements);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!rows) return <p className="muted">Loading achievements…</p>;

  const next = nextPerFamily(rows);
  if (next.length === 0) {
    return (
      <section className="card progress-next-achievements">
        <h3 className="progress-section-title">Next achievements</h3>
        <p className="muted" style={{ margin: 0 }}>
          All listed achievements unlocked.{" "}
          <Link to="/progress/lifetime">Full list on Lifetime →</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="card progress-next-achievements">
      <h3 className="progress-section-title">Next achievements</h3>
      <ul className="achievements-list progress-next-achievements-list">
        {next.map((a) => {
          const pct = Math.min(100, Math.round((a.current / a.threshold) * 100));
          return (
            <li key={a.id} className="achievements-item is-next is-locked">
              <div className="achievements-item-head">
                <span className="achievements-kind">{a.family}</span>
                <strong>{a.label}</strong>
              </div>
              <span className="achievements-pts">+{a.points}</span>
              <div className="achievements-progress">
                <div className="achievements-bar" aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <span>
                  {a.current}/{a.threshold}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="muted progress-next-achievements-foot">
        <Link to="/progress/lifetime">Full list on Lifetime →</Link>
      </p>
    </section>
  );
}
