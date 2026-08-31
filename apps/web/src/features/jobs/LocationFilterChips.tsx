/** Matches rankPrompt LOCATION_FITS + display labels from RankMark. */
export const LOCATION_FILTER_OPTIONS: {
  id: string;
  short: string;
  label: string;
}[] = [
  { id: "bay", short: "Bay", label: "Bay Area" },
  { id: "la", short: "LA", label: "Los Angeles" },
  { id: "nyc", short: "NYC", label: "New York" },
  { id: "other_hub", short: "Hub", label: "US tech hub" },
  { id: "remote", short: "Remote", label: "Remote" },
  { id: "weak", short: "Weak", label: "Weaker fit" },
  { id: "unknown", short: "?", label: "Location unclear" },
];

export type LocationCounts = Record<string, number>;

function countFor(counts: LocationCounts, id: string): number {
  return counts[id] ?? 0;
}

export default function LocationFilterChips({
  active,
  counts,
  total,
  onSelect,
}: {
  active: string | null;
  counts: LocationCounts;
  total: number;
  onSelect: (locationId: string | null) => void;
}) {
  return (
    <div className="jobs-loc-filter">
      <span className="jobs-loc-filter-label muted">Location</span>
      <div className="jobs-loc-chips" role="group" aria-label="Filter by location fit">
        <button
          type="button"
          className={!active || active === "all" ? "jobs-loc-chip on" : "jobs-loc-chip"}
          onClick={() => onSelect(null)}
        >
          All <span className="jobs-loc-chip-count">{total}</span>
        </button>
        {LOCATION_FILTER_OPTIONS.map((opt) => {
          const n = countFor(counts, opt.id);
          if (n === 0) return null;
          return (
            <button
              key={opt.id}
              type="button"
              className={active === opt.id ? "jobs-loc-chip on" : "jobs-loc-chip"}
              aria-label={`${opt.label}, ${n}`}
              onClick={() => onSelect(opt.id)}
            >
              {opt.short} <span className="jobs-loc-chip-count">{n}</span>
            </button>
          );
        })}
        {countFor(counts, "unset") > 0 && (
          <button
            type="button"
            className={active === "unset" ? "jobs-loc-chip on" : "jobs-loc-chip"}
            onClick={() => onSelect("unset")}
          >
            unset <span className="jobs-loc-chip-count">{countFor(counts, "unset")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
