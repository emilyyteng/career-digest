import { useEffect, useState } from "react";
import { getAchievements, type AchievementRow } from "../../api";

const FAMILY_ORDER = [
  "apps",
  "lc",
  "assessment",
  "phone",
  "technical",
  "onsite",
  "offer",
] as const;

const FAMILY_TITLE: Record<(typeof FAMILY_ORDER)[number], string> = {
  apps: "Applications",
  lc: "LeetCode",
  assessment: "Assessments",
  phone: "Phone screens",
  technical: "Technicals",
  onsite: "Onsites",
  offer: "Offers",
};

function nextIds(list: AchievementRow[]): Set<string> {
  const families = new Set(list.map((a) => a.family));
  const ids = new Set<string>();
  for (const family of families) {
    const next = list.find((a) => a.family === family && !a.unlocked);
    if (next) ids.add(next.id);
  }
  return ids;
}

function groupByFamily(list: AchievementRow[]): Array<{
  family: (typeof FAMILY_ORDER)[number];
  title: string;
  items: AchievementRow[];
}> {
  return FAMILY_ORDER.map((family) => ({
    family,
    title: FAMILY_TITLE[family],
    items: list.filter((a) => a.family === family),
  })).filter((g) => g.items.length > 0);
}

function AchievementItem({
  a,
  isNext,
}: {
  a: AchievementRow;
  isNext: boolean;
}) {
  const className = [
    "achievements-item",
    a.unlocked ? "is-unlocked" : "is-locked",
    isNext ? "is-next" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const pct = Math.min(100, Math.round((a.current / a.threshold) * 100));
  return (
    <li className={className}>
      <div className="achievements-item-head">
        <strong>{a.label}</strong>
        {a.launchUnlock && <span className="muted">at launch · no points</span>}
      </div>
      <span
        className={
          a.unlocked && !a.launchUnlock ? "achievements-pts" : "achievements-pts is-muted"
        }
      >
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

  const groups = groupByFamily(rows);
  const next = nextIds(rows);

  return (
    <section className="card achievements-panel">
      <h3 className="achievements-heading">Achievements</h3>
      <p className="muted achievements-hint">
        Locked, next, and unlocked. Daily streaks live on the today strip.
      </p>
      <div className="achievements-groups">
        {groups.map((g) => (
          <section key={g.family} className="achievements-group">
            <h4 className="achievements-group-title">{g.title}</h4>
            <ul className="achievements-list">
              {g.items.map((a) => (
                <AchievementItem key={a.id} a={a} isNext={next.has(a.id)} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
