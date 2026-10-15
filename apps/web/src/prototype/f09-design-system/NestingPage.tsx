/**
 * F09 M1-06 · Nesting / information-depth rule (proposed).
 *
 * Design questions:
 * 1. Does underline ChromeTab at subnav scale read quieter than app nav?
 * 2. Is one L2 Segmented row enough under Past work (vs nested type tabs)?
 * 3. Does the chrome budget feel right: app nav → one of {shell, page tabs} → ≤1 L2 → content?
 * 4. Where should L2 filters sit relative to tabs so the stack stays cohesive?
 * 5. Confirm title → tabs → (filter) → content all inside one card (full containment).
 *
 * Surfaces via ?variant= · filter placement via ?filter=
 */
import { useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, ChromeTab, Segmented } from "../../ui";
import PrototypeSwitcher from "../PrototypeSwitcher";
import "./nesting.css";

const SURFACES = [
  { key: "A", name: "Progress · This week (conforms)" },
  { key: "B", name: "Progress · Past work (proposed)" },
  { key: "C", name: "Jobs list (page tabs + filter)" },
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

type FilterPlace = (typeof FILTER_OPTS)[number]["key"];

function useFilterPlace(): FilterPlace {
  const [params] = useSearchParams();
  const value = params.get("filter") as FilterPlace | null;
  return value && FILTER_OPTS.some((o) => o.key === value) ? value : "below";
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

function RuleCard() {
  return (
    <aside className="f09n-rule card">
      <h2 className="f09n-rule-title">Proposed rule</h2>
      <ol className="f09n-rule-list">
        <li>
          <strong>Containerized page chrome</strong> — title, tabs/subnav, filter, and
          body live <em>inside</em> one card (nothing sitting on the pink desk).
        </li>
        <li>
          <strong>Feature shell + subnav</strong> — peer destinations (Progress;
          Rewards). Nested routes + <code>ChromeTab</code>{" "}
          <code>size=&quot;subnav&quot;</code>.
        </li>
        <li>
          <strong>Page tabs</strong> — same resource partitions (Jobs, Tasks).{" "}
          <code>ChromeTab</code> <code>size=&quot;page&quot;</code>.
        </li>
        <li>
          <strong>Filters / modes</strong> — <code>Segmented</code> / quiet chips;
          never ChromeTab clothes. Placement is the open axis below.
        </li>
      </ol>
      <p className="f09n-budget">
        Budget: app nav → <em>one of</em> {"{"}shell subnav, page-tab row{"}"} → at
        most one L2 filter → content. Never two ChromeTab rows stacked.
      </p>
      <ParamRow name="filter" label="4 · Filter placement" options={FILTER_OPTS} />
      <p className="muted f09n-note">
        Placement applies on A–C (and the bad L2 on E). D has no filter.{" "}
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

/** Tabs + optional L2 filter composed per placement axis. */
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
    // Filter rendered by caller in the header; only tabs here.
    return <div className="f09n-tabs-only">{tabs}</div>;
  }

  // below (default)
  return (
    <>
      <div className="f09n-tabs-only">{tabs}</div>
      <div className="f09n-l2">{filter}</div>
    </>
  );
}

function SurfaceA({ place }: { place: FilterPlace }) {
  const [lane, setLane] = useState("all");
  const filter = (
    <Segmented
      label="Lane filter"
      value={lane}
      onChange={setLane}
      options={[
        { value: "all", label: "All" },
        { value: "lc", label: "LC" },
        { value: "apps", label: "Apps" },
      ]}
    />
  );
  return (
    <section className="f09n-surface card" data-filter={place}>
      <header className="f09n-surface-head">
        <div>
          <p className="f09n-kicker">Conforms · route feature shell</p>
          <h3 className="f09n-surface-title">Progress · This week</h3>
        </div>
        {place === "header" ? filter : <Badge tone="ok">L0 + shell + L2</Badge>}
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
          Title and chrome stay inside the card. Flip <strong>Filter placement</strong>{" "}
          in the sidebar to compare L2 treatments.
        </p>
      </div>
    </section>
  );
}

function SurfaceB({ place }: { place: FilterPlace }) {
  const [ledger, setLedger] = useState("completions");
  const filter = (
    <Segmented
      label="Ledger type"
      value={ledger}
      onChange={setLedger}
      options={[
        { value: "completions", label: "Completions" },
        { value: "points", label: "Points" },
        { value: "reflections", label: "Reflections" },
      ]}
    />
  );
  return (
    <section className="f09n-surface card" data-filter={place}>
      <header className="f09n-surface-head">
        <div>
          <p className="f09n-kicker">Proposed · Past work depth fix</p>
          <h3 className="f09n-surface-title">Progress · Past work</h3>
        </div>
        {place === "header" ? filter : <Badge tone="ok">ledger → Segmented</Badge>}
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
          <p className="muted f09n-caption">
            Day/calendar is content, not a nav level.
          </p>
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
          <p className="muted f09n-caption">
            Nested Completions/Points/Reflections ChromeTabs demoted to Segmented.
          </p>
        </div>
      </div>
    </section>
  );
}

function SurfaceC({ place }: { place: FilterPlace }) {
  const [view, setView] = useState<"ranked" | "unranked">("ranked");
  const [loc, setLoc] = useState("all");
  const filter = (
    <Segmented
      label="Location"
      value={loc}
      onChange={setLoc}
      options={[
        { value: "all", label: "All" },
        { value: "sf", label: "SF Bay" },
        { value: "remote", label: "Remote" },
      ]}
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
    <section className="f09n-surface card" data-filter={place}>
      <header className="f09n-surface-head">
        <div>
          <p className="f09n-kicker">Conforms · page tabs + filter</p>
          <h3 className="f09n-surface-title">Jobs</h3>
        </div>
        {place === "header" && view === "ranked" ? (
          filter
        ) : (
          <Badge tone="ok">no shell</Badge>
        )}
      </header>
      <ChromeStack
        place={place}
        tabs={tabs}
        filter={filter}
        showFilter={view === "ranked" && place !== "header"}
      />
      {place === "header" && view !== "ranked" && null}
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
          Location is a filter under the Ranked partition — switch Unranked to see
          the filter disappear (partition-scoped L2).
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
        <p className="f09n-caption">
          Active mock page: <strong>{items.find((i) => i.id === tab)?.label}</strong>
        </p>
        <p className="muted f09n-caption">
          No L2 on this surface. Ranges on Earnings/History would use the same
          filter-placement rule once locked.
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
      <div className="f09n-l2">
        <Segmented
          label="Extra mode"
          value="7"
          onChange={() => {}}
          options={[
            { value: "7", label: "7 days" },
            { value: "30", label: "30 days" },
          ]}
        />
      </div>
      <div className="f09n-body">
        <p className="muted f09n-caption">
          Two ChromeTab rows plus an L2 — the budget failure. Filter placement
          axis does not apply here; use A–C to judge placement.
        </p>
      </div>
    </section>
  );
}

export default function NestingPage() {
  const [params] = useSearchParams();
  const variant = params.get("variant") ?? "A";
  const place = useFilterPlace();

  return (
    <div className="f09n-page">
      <div className="f09n-banner" role="status">
        <strong>Experimental prototype</strong>
        {" · "}
        F09 M1-06 · nesting. ← / → flips surfaces; sidebar picks filter placement.
        Prefer judging A–C for placement; E is the anti-pattern.
      </div>
      <div className="f09n-layout">
        <RuleCard />
        <div className="f09n-preview">
          {variant === "A" && <SurfaceA place={place} />}
          {variant === "B" && <SurfaceB place={place} />}
          {variant === "C" && <SurfaceC place={place} />}
          {variant === "D" && <SurfaceD />}
          {variant === "E" && <SurfaceE />}
        </div>
      </div>
      <PrototypeSwitcher variants={[...SURFACES]} surfaceLabel="M1-06 nesting" />
    </div>
  );
}
