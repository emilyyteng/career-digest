/**
 * F09 M1-06 · Nesting / information-depth (LOCKED 2026-10-15).
 *
 * Verdict: containerized title → ChromeTab → squared filter chips (below,
 * left-aligned) → content. Kept as reference; axes still switchable for history.
 * See docs/design-system.md → Page chrome / nesting.
 *
 * Surfaces via ?variant= · filter placement via ?filter= · control via ?control=
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, ChromeTab, Segmented, SelectField } from "../../ui";
import PrototypeSwitcher from "../PrototypeSwitcher";
import "./nesting.css";

const SURFACES = [
  { key: "C", name: "Jobs · many locations (stress)" },
  { key: "A", name: "Progress · This week (conforms)" },
  { key: "B", name: "Progress · Past work (proposed)" },
  { key: "D", name: "Rewards shell (conforms)" },
  { key: "E", name: "Anti-pattern · stacked ChromeTabs" },
] as const;

const FILTER_OPTS = [
  { key: "below", name: "Below tabs (full width)" },
  { key: "below-end", name: "Below tabs · right-aligned" },
  { key: "row-end", name: "Same row · tabs left / filter right" },
  { key: "toolbar", name: "Shared toolbar track" },
  { key: "recessed", name: "Recessed strip under tabs" },
  { key: "header", name: "In header beside title" },
] as const;

const CONTROL_OPTS = [
  { key: "chips", name: "Squared chip row" },
  { key: "select", name: "Single select" },
  { key: "segmented", name: "Rounded Segmented (current)" },
] as const;

type FilterPlace = (typeof FILTER_OPTS)[number]["key"];
type FilterControl = (typeof CONTROL_OPTS)[number]["key"];

type Opt = { value: string; label: string; count?: number };

/** Jobs-like location list (stress case for many options). */
const LOC_OPTS: Opt[] = [
  { value: "all", label: "All", count: 48 },
  { value: "bay", label: "Bay", count: 14 },
  { value: "la", label: "LA", count: 6 },
  { value: "nyc", label: "NYC", count: 9 },
  { value: "hub", label: "Hub", count: 5 },
  { value: "remote", label: "Remote", count: 11 },
  { value: "weak", label: "Weak", count: 2 },
  { value: "unknown", label: "?", count: 1 },
];

const LANE_OPTS: Opt[] = [
  { value: "all", label: "All" },
  { value: "lc", label: "LC" },
  { value: "apps", label: "Apps" },
];

const LEDGER_OPTS: Opt[] = [
  { value: "completions", label: "Completions" },
  { value: "points", label: "Points" },
  { value: "reflections", label: "Reflections" },
];

function useAxisParam<T extends string>(
  name: string,
  opts: ReadonlyArray<{ key: T }>,
  fallback: T,
): T {
  const [params] = useSearchParams();
  const value = params.get(name) as T | null;
  return value && opts.some((o) => o.key === value) ? value : fallback;
}

function ParamRow({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: ReadonlyArray<{ key: string; name: string }>;
}) {
  const [params, setParams] = useSearchParams();
  const current = params.get(name) ?? options[0]!.key;
  return (
    <div className="f09n-param" role="group" aria-label={label}>
      <span className="f09n-param-label">{label}</span>
      <div className="f09n-param-options">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            className={`f09n-chip${current === o.key ? " is-active" : ""}`}
            aria-pressed={current === o.key}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set(name, o.key);
              setParams(next, { replace: true });
            }}
          >
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterControlView({
  control,
  label,
  value,
  options,
  onChange,
}: {
  control: FilterControl;
  label: string;
  value: string;
  options: ReadonlyArray<Opt>;
  onChange: (value: string) => void;
}) {
  if (control === "select") {
    return (
      <label className="f09n-filter-select">
        <span className="f09n-filter-select-label">{label}</span>
        <SelectField
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.count != null ? `${o.label} (${o.count})` : o.label}
            </option>
          ))}
        </SelectField>
      </label>
    );
  }

  if (control === "segmented") {
    return (
      <Segmented
        label={label}
        value={value}
        onChange={onChange}
        options={options.map((o) => ({
          value: o.value,
          label:
            o.count != null ? (
              <>
                {o.label} <span className="f09n-opt-count">{o.count}</span>
              </>
            ) : (
              o.label
            ),
        }))}
      />
    );
  }

  // chips — squared horizontal row (same language as sidebar param chips)
  return (
    <div className="f09n-filter-chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`f09n-chip f09n-filter-chip${value === o.value ? " is-active" : ""}`}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count != null && (
            <span className="f09n-opt-count">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function RuleCard() {
  return (
    <aside className="f09n-rule card">
      <h2 className="f09n-rule-title">Proposed rule</h2>
      <ol className="f09n-rule-list">
        <li>
          <strong>Containerized page chrome</strong> — title, tabs/subnav, filter, and
          body inside one card.
        </li>
        <li>
          <strong>Shell / page tabs / filters</strong> — peer destinations → subnav;
          list partitions → page tabs; narrow-within → L2 (never ChromeTab clothes).
        </li>
      </ol>
      <p className="f09n-budget">
        Budget: app nav → one of {"{"}shell, page tabs{"}"} → ≤1 L2 → content.
      </p>
      <ParamRow name="control" label="4 · Filter control" options={CONTROL_OPTS} />
      <ParamRow name="filter" label="5 · Filter placement" options={FILTER_OPTS} />
      <p className="muted f09n-note">
        Prefer surface <strong>C</strong> for many locations. Axes apply on A–C.{" "}
        <Link to="/prototype/f09/refinements">M1-15</Link>
      </p>
    </aside>
  );
}

function ProgressSubnav({ active }: { active: "week" | "past" | "lifetime" }) {
  return (
    <div className="ui-chrome-tabs" role="navigation" aria-label="Progress (mock)">
      <ChromeTab size="subnav" active={active === "week"}>
        This week
      </ChromeTab>
      <ChromeTab size="subnav" active={active === "past"}>
        Past work
      </ChromeTab>
      <ChromeTab size="subnav" active={active === "lifetime"}>
        Lifetime
      </ChromeTab>
    </div>
  );
}

function ChromeStack({
  place,
  tabs,
  filter,
  showFilter,
}: {
  place: FilterPlace;
  tabs: ReactNode;
  filter: ReactNode;
  showFilter: boolean;
}) {
  if (!showFilter) {
    return <div className="f09n-tabs-only">{tabs}</div>;
  }

  if (place === "row-end" || place === "toolbar") {
    return (
      <div
        className={`f09n-chrome-band${place === "toolbar" ? " is-toolbar" : ""}`}
      >
        <div className="f09n-chrome-tabs">{tabs}</div>
        <div className="f09n-chrome-filter">{filter}</div>
      </div>
    );
  }

  if (place === "below-end") {
    return (
      <>
        <div className="f09n-tabs-only">{tabs}</div>
        <div className="f09n-l2 is-end">{filter}</div>
      </>
    );
  }

  if (place === "recessed") {
    return (
      <>
        <div className="f09n-tabs-only">{tabs}</div>
        <div className="f09n-l2 is-recessed">{filter}</div>
      </>
    );
  }

  if (place === "header") {
    return <div className="f09n-tabs-only">{tabs}</div>;
  }

  return (
    <>
      <div className="f09n-tabs-only">{tabs}</div>
      <div className="f09n-l2">{filter}</div>
    </>
  );
}

function SurfaceA({
  place,
  control,
}: {
  place: FilterPlace;
  control: FilterControl;
}) {
  const [lane, setLane] = useState("all");
  const filter = (
    <FilterControlView
      control={control}
      label="Lane"
      value={lane}
      options={LANE_OPTS}
      onChange={setLane}
    />
  );
  return (
    <section className="f09n-surface card" data-filter={place} data-control={control}>
      <header className="f09n-surface-head">
        <div>
          <p className="f09n-kicker">Conforms · route feature shell</p>
          <h3 className="f09n-surface-title">Progress · This week</h3>
        </div>
        {place === "header" ? filter : <Badge tone="ok">few options</Badge>}
      </header>
      <ChromeStack
        place={place}
        tabs={<ProgressSubnav active="week" />}
        filter={filter}
        showFilter
      />
      <div className="f09n-body">
        <div className="f09n-fake-row">
          <span>Weekly LC</span>
          <span className="muted">3 / 5</span>
        </div>
        <div className="f09n-fake-row">
          <span>Applications</span>
          <span className="muted">1 / 3</span>
        </div>
        <p className="muted f09n-caption">
          Few options — chips and Segmented both fit; select stays compact.
        </p>
      </div>
    </section>
  );
}

function SurfaceB({
  place,
  control,
}: {
  place: FilterPlace;
  control: FilterControl;
}) {
  const [ledger, setLedger] = useState("completions");
  const filter = (
    <FilterControlView
      control={control}
      label="Ledger"
      value={ledger}
      options={LEDGER_OPTS}
      onChange={setLedger}
    />
  );
  return (
    <section className="f09n-surface card" data-filter={place} data-control={control}>
      <header className="f09n-surface-head">
        <div>
          <p className="f09n-kicker">Proposed · Past work depth fix</p>
          <h3 className="f09n-surface-title">Progress · Past work</h3>
        </div>
        {place === "header" ? filter : <Badge tone="ok">ledger → L2</Badge>}
      </header>
      <ChromeStack
        place={place}
        tabs={<ProgressSubnav active="past" />}
        filter={filter}
        showFilter
      />
      <div className="f09n-past-grid">
        <div className="f09n-cal card">
          <p className="f09n-kicker">Content chrome · calendar</p>
          <div className="f09n-cal-grid" aria-hidden>
            {Array.from({ length: 14 }, (_, i) => (
              <span
                key={i}
                className={`f09n-cal-cell${i === 9 ? " is-on" : ""}`}
              />
            ))}
          </div>
        </div>
        <div className="f09n-ledger card">
          <p className="f09n-kicker">Ledger · {ledger}</p>
          <div className="f09n-fake-row">
            <span>Tue · ranked follow-up</span>
            <span className="muted">+12</span>
          </div>
          <div className="f09n-fake-row">
            <span>Mon · LC medium</span>
            <span className="muted">+8</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function SurfaceC({
  place,
  control,
}: {
  place: FilterPlace;
  control: FilterControl;
}) {
  const [view, setView] = useState<"ranked" | "unranked">("ranked");
  const [loc, setLoc] = useState("all");
  const filter = (
    <FilterControlView
      control={control}
      label="Location"
      value={loc}
      options={LOC_OPTS}
      onChange={setLoc}
    />
  );
  const tabs = (
    <div className="ui-chrome-tabs" role="tablist" aria-label="Jobs (mock)">
      <ChromeTab size="page" active={view === "ranked"} onClick={() => setView("ranked")}>
        Ranked
      </ChromeTab>
      <ChromeTab
        size="page"
        active={view === "unranked"}
        onClick={() => setView("unranked")}
      >
        Unranked
      </ChromeTab>
    </div>
  );
  return (
    <section className="f09n-surface card" data-filter={place} data-control={control}>
      <header className="f09n-surface-head">
        <div>
          <p className="f09n-kicker">Stress · many location options</p>
          <h3 className="f09n-surface-title">Jobs</h3>
        </div>
        {place === "header" && view === "ranked" ? (
          filter
        ) : (
          <Badge tone="ok">8 locs</Badge>
        )}
      </header>
      <ChromeStack
        place={place}
        tabs={tabs}
        filter={filter}
        showFilter={view === "ranked" && place !== "header"}
      />
      <div className="f09n-body">
        <div className="f09n-fake-row">
          <span>Acme · SWE intern</span>
          <Badge tone="score">92</Badge>
        </div>
        <div className="f09n-fake-row">
          <span>Globex · Platform</span>
          <Badge tone="score">88</Badge>
        </div>
        <p className="muted f09n-caption">
          Active: <strong>{LOC_OPTS.find((o) => o.value === loc)?.label}</strong>.
          Chip rows wrap; select stays one control; rounded Segmented gets wide.
        </p>
      </div>
    </section>
  );
}

function SurfaceD() {
  const [tab, setTab] = useState("banner");
  const items = [
    { id: "banner", label: "Banner" },
    { id: "collection", label: "Collection" },
    { id: "earnings", label: "Earnings" },
    { id: "history", label: "Pull history" },
    { id: "rules", label: "Rules" },
  ] as const;
  return (
    <section className="f09n-surface card">
      <header className="f09n-surface-head">
        <div>
          <p className="f09n-kicker">Conforms · Rewards shell</p>
          <h3 className="f09n-surface-title">Rewards</h3>
        </div>
        <div className="f09n-balance">
          <span className="f09n-balance-value">420</span>
          <span className="muted">seeds</span>
        </div>
      </header>
      <div className="f09n-tabs-only">
        <div className="ui-chrome-tabs" role="navigation" aria-label="Rewards (mock)">
          {items.map((item) => (
            <ChromeTab
              key={item.id}
              size="subnav"
              active={tab === item.id}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </ChromeTab>
          ))}
        </div>
      </div>
      <div className="f09n-body">
        <p className="muted f09n-caption">
          No L2 here — filter control axis does not apply.
        </p>
      </div>
    </section>
  );
}

function SurfaceE() {
  return (
    <section className="f09n-surface card f09n-anti">
      <header className="f09n-surface-head">
        <div>
          <p className="f09n-kicker">Breaks budget · do not ship</p>
          <h3 className="f09n-surface-title">Stacked ChromeTab rows</h3>
        </div>
        <Badge tone="danger">anti-pattern</Badge>
      </header>
      <div className="f09n-tabs-only">
        <ProgressSubnav active="past" />
      </div>
      <div className="f09n-tabs-only">
        <div className="ui-chrome-tabs" role="tablist" aria-label="Nested tabs (bad)">
          <ChromeTab size="page" active>
            Completions
          </ChromeTab>
          <ChromeTab size="page">Points</ChromeTab>
          <ChromeTab size="page">Reflections</ChromeTab>
        </div>
      </div>
      <div className="f09n-body">
        <p className="muted f09n-caption">
          Two ChromeTab rows — use A–C to judge filter control + placement.
        </p>
      </div>
    </section>
  );
}

export default function NestingPage() {
  const [params, setParams] = useSearchParams();
  const variant = params.get("variant") ?? "C";
  const place = useAxisParam("filter", FILTER_OPTS, "below");
  const control = useAxisParam("control", CONTROL_OPTS, "chips");

  // Seed shareable defaults so PrototypeSwitcher and axes agree on first load.
  useEffect(() => {
    const next = new URLSearchParams(params);
    let changed = false;
    if (!next.has("variant")) {
      next.set("variant", "C");
      changed = true;
    }
    if (!next.has("control")) {
      next.set("control", "chips");
      changed = true;
    }
    if (!next.has("filter")) {
      next.set("filter", "below");
      changed = true;
    }
    if (changed) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first-load seed only
  }, []);

  return (
    <div className="f09n-page">
      <div className="f09n-banner" role="status">
        <strong>Experimental prototype</strong>
        {" · "}
        F09 M1-06 · <em>verdicts locked</em> (chips below tabs, left-aligned).
        Axes remain for reference. Defaults to Jobs (C) + squared chips.
      </div>
      <div className="f09n-layout">
        <RuleCard />
        <div className="f09n-preview">
          {variant === "A" && <SurfaceA place={place} control={control} />}
          {variant === "B" && <SurfaceB place={place} control={control} />}
          {variant === "C" && <SurfaceC place={place} control={control} />}
          {variant === "D" && <SurfaceD />}
          {variant === "E" && <SurfaceE />}
        </div>
      </div>
      <PrototypeSwitcher variants={[...SURFACES]} surfaceLabel="M1-06 nesting" />
    </div>
  );
}
