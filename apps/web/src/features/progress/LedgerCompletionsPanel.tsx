import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getProgressCompletions,
  patchProgressReflection,
  type CompletionDiaryItem,
  type CompletionKind,
  type CompletionsDiary,
} from "../../api";

const TYPE_TABS: Array<{ key: CompletionKind | "all"; label: string }> = [
  { key: "all", label: "all" },
  { key: "task", label: "tasks" },
  { key: "application", label: "apps" },
  { key: "interview", label: "interviews" },
  { key: "reflection", label: "reflections" },
];

function allTimeCount(
  stats: CompletionsDiary["stats"]["allTime"],
  key: CompletionKind | "all",
): number {
  if (key === "all") {
    return stats.tasks + stats.apps + stats.interview + stats.reflections;
  }
  if (key === "task") return stats.tasks;
  if (key === "application") return stats.apps;
  if (key === "interview") return stats.interview;
  return stats.reflections;
}

function disparity(est: number | null, actual: number | null) {
  if (est == null || actual == null) return null;
  const delta = actual - est;
  if (delta === 0) return { text: "on estimate", tone: "" };
  if (delta > 0) return { text: `+${delta}m over`, tone: "over" };
  return { text: `${delta}m under`, tone: "under" };
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayHeading(localDate: string, todayYmd: string): string {
  if (localDate === todayYmd) return "Today";
  const y = new Date(`${todayYmd}T12:00:00`);
  const x = new Date(`${localDate}T12:00:00`);
  const diff = Math.round((y.getTime() - x.getTime()) / 86400000);
  if (diff === 1) return "Yesterday";
  return x.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function plural(count: number, singular: string, pluralForm?: string): string {
  return count === 1 ? singular : (pluralForm ?? `${singular}s`);
}

function formatCompletionStatLine(counts: {
  tasks: number;
  apps: number;
  interview: number;
  reflections: number;
}): string {
  return [
    `${counts.tasks} ${plural(counts.tasks, "task")}`,
    `${counts.apps} ${plural(counts.apps, "app")}`,
    `${counts.interview} ${plural(counts.interview, "interview")}`,
    `${counts.reflections} ${plural(counts.reflections, "reflection")}`,
  ].join(" · ");
}

function CompletionRow({
  row,
  onReflectionSaved,
}: {
  row: CompletionDiaryItem;
  onReflectionSaved: () => void;
}) {
  const disp = disparity(row.estimateMinutes, row.actualMinutes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveReflection(id: string) {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      await patchProgressReflection(id, { body });
      setEditingId(null);
      onReflectionSaved();
    } finally {
      setBusy(false);
    }
  }

  const titleNode = row.href ? (
    <Link to={row.href} className="ledger-row-title-link">
      {row.title}
    </Link>
  ) : (
    row.title
  );

  return (
    <article className="ledger-row">
      <div>
        <div className="ledger-row-title">
          <span className="ledger-kind">{row.kind}</span>
          {titleNode}
        </div>
        <div className="ledger-row-meta">
          {row.subtitle}
          {(row.estimateMinutes != null || row.actualMinutes != null) && (
            <>
              {row.subtitle ? " · " : ""}
              {row.estimateMinutes != null ? `est ${row.estimateMinutes}` : "est —"}
              {" / "}
              {row.actualMinutes != null ? `actual ${row.actualMinutes}` : "actual 0"}
              {disp && (
                <span className={`ledger-disparity ${disp.tone}`}> · {disp.text}</span>
              )}
            </>
          )}
        </div>
        {row.reflections.length > 0 && (
          <div className="ledger-nested">
            {row.reflections.map((r) =>
              editingId === r.id ? (
                <div key={r.id} className="ledger-nested-edit">
                  <textarea
                    rows={3}
                    value={draft}
                    disabled={busy}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <div className="form-actions">
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busy || !draft.trim()}
                      onClick={() => void saveReflection(r.id)}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  key={r.id}
                  type="button"
                  className="ledger-nested-item"
                  onClick={() => {
                    setEditingId(r.id);
                    setDraft(r.body);
                  }}
                >
                  ✎ {r.preview}
                </button>
              ),
            )}
          </div>
        )}
      </div>
      <div className="ledger-row-aside">
        <span>{formatWhen(row.at)}</span>
        {row.points != null && row.points > 0 && (
          <span className="ledger-pts">+{row.points} pts</span>
        )}
      </div>
    </article>
  );
}

export default function LedgerCompletionsPanel({
  tz,
  todayYmd,
}: {
  tz: string;
  todayYmd: string;
}) {
  const [kind, setKind] = useState<CompletionKind | "all">("all");
  const [data, setData] = useState<CompletionsDiary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(nextKind = kind) {
    setLoading(true);
    setError(null);
    try {
      const diary = await getProgressCompletions(tz, { kind: nextKind });
      setData(diary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load completions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on kind/tz
  }, [tz, kind]);

  const byDay = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, CompletionDiaryItem[]>();
    for (const row of data.items) {
      const list = map.get(row.localDate) ?? [];
      list.push(row);
      map.set(row.localDate, list);
    }
    return [...map.entries()];
  }, [data]);

  if (error && !data) return <p className="error">{error}</p>;
  if (loading && !data) return <p className="muted">Loading completions…</p>;
  if (!data) return null;

  const { week, month, allTime } = data.stats;

  return (
    <div className="ledger-completions">
      {error && <p className="error">{error}</p>}
      <div className="ledger-stats">
        <div className="ledger-stat-card">
          <span className="progress-kicker">This week</span>
          <strong>{formatCompletionStatLine(week)}</strong>
          <span className="ledger-stat-mins">{week.minutes} minutes worked</span>
        </div>
        <div className="ledger-stat-card">
          <span className="progress-kicker">This month</span>
          <strong>{formatCompletionStatLine(month)}</strong>
          <span className="ledger-stat-mins">{month.minutes} minutes worked</span>
        </div>
      </div>

      <div className="ledger-subtabs" role="tablist" aria-label="Completion type">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={kind === tab.key ? "ledger-subtab on" : "ledger-subtab"}
            onClick={() => setKind(tab.key)}
          >
            {tab.label}
            <span className="count">{allTimeCount(allTime, tab.key)}</span>
          </button>
        ))}
      </div>

      {byDay.length === 0 ? (
        <p className="muted">No completions yet.</p>
      ) : (
        byDay.map(([day, rows]) => (
          <div key={day} className="ledger-day">
            <h5 className="ledger-day-label">{dayHeading(day, todayYmd)}</h5>
            {rows.map((row) => (
              <CompletionRow
                key={row.id}
                row={row}
                onReflectionSaved={() => void load(kind)}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
