/**
 * F09 M1-06 · Nesting / information-depth rule (proposed).
 *
 * Design questions:
 * 1. Does underline ChromeTab at subnav scale read quieter than app nav?
 * 2. Is one L2 Segmented row enough under Past work (vs nested type tabs)?
 * 3. Does the chrome budget feel right: app nav → one of {shell, page tabs} → ≤1 L2 → content?
 *
 * PrototypeSwitcher cycles mock surfaces that apply (or break) the proposed rule.
 * Real app shell nav is already around this page — count it as L0.
 */
import { useState } from "react";
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

function RuleCard() {
  return (
    <aside className="f09n-rule card">
      <h2 className="f09n-rule-title">Proposed rule</h2>
      <ol className="f09n-rule-list">
        <li>
          <strong>Feature shell + subnav</strong> — peer destinations with different
          jobs (Progress week/past/lifetime; Rewards pages). Nested routes +{" "}
          <code>ChromeTab</code> <code>size=&quot;subnav&quot;</code>.
        </li>
        <li>
          <strong>Page tabs</strong> — same resource, peer partitions (Jobs
          ranked/unranked; Tasks open/completed).{" "}
          <code>ChromeTab</code> <code>size=&quot;page&quot;</code>.
        </li>
        <li>
          <strong>Filters / modes</strong> — narrow within a partition (location,
          ledger type, date range). <code>Segmented</code> or quiet chips — never
          ChromeTab clothes.
        </li>
      </ol>
      <p className="f09n-budget">
        Budget: app nav → <em>one of</em> {"{"}shell subnav, page-tab row{"}"} → at
        most one L2 control row → content. Never two ChromeTab rows stacked.
      </p>
      <p className="muted f09n-note">
        Real flora.exe nav above is L0. Flip variants with ← / →.{" "}
        <Link to="/prototype/f09/refinements">M1-15 refinements</Link>
      </p>
    </aside>
  );
}

function ProgressSubnav({ active }: { active: "week" | "past" | "lifetime" }) {
  return (
    <div className="f09n-subnav ui-chrome-tabs" role="navigation" aria-label="Progress (mock)">
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

function SurfaceA() {
  const [lane, setLane] = useState("all");
  return (
    <section className="f09n-surface card">
      <header className="f09n-surface-head">
        <div>
          <p className="f09n-kicker">Conforms · route feature shell</p>
          <h3 className="f09n-surface-title">Progress · This week</h3>
        </div>
        <Badge tone="ok">L0 + shell + L2</Badge>
      </header>
      <ProgressSubnav active="week" />
      <div className="f09n-l2">
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
      </div>
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
          Shell picks the destination; Segmented narrows the week view. No second
          tab row.
        </p>
      </div>
    </section>
  );
}

function SurfaceB() {
  const [ledger, setLedger] = useState("completions");
  return (
    <section className="f09n-surface card">
      <header className="f09n-surface-head">
        <div>
          <p className="f09n-kicker">Proposed · Past work depth fix</p>
          <h3 className="f09n-surface-title">Progress · Past work</h3>
        </div>
        <Badge tone="ok">ledger → Segmented</Badge>
      </header>
      <ProgressSubnav active="past" />
      <div className="f09n-l2">
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
      </div>
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
            Completions / Points / Reflections were a nested ChromeTab row —
            demoted to Segmented so we never stack two tab languages.
          </p>
        </div>
      </div>
    </section>
  );
}

function SurfaceC() {
  const [view, setView] = useState<"ranked" | "unranked">("ranked");
  const [loc, setLoc] = useState("all");
  return (
    <section className="f09n-surface card">
      <header className="f09n-surface-head">
        <div>
          <p className="f09n-kicker">Conforms · page tabs + filter</p>
          <h3 className="f09n-surface-title">Jobs</h3>
        </div>
        <Badge tone="ok">no shell</Badge>
      </header>
      <div className="f09n-page-tabs ui-chrome-tabs" role="tablist" aria-label="Jobs (mock)">
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
      {view === "ranked" && (
        <div className="f09n-l2">
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
        </div>
      )}
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
          Location chips that looked like a second tab row become Segmented
          (filter), under the page-tab partition.
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
      <div className="f09n-subnav ui-chrome-tabs" role="navigation" aria-label="Rewards (mock)">
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
      <div className="f09n-body">
        <p className="f09n-caption">
          Active mock page: <strong>{items.find((i) => i.id === tab)?.label}</strong>
        </p>
        <p className="muted f09n-caption">
          Five peer destinations → shell. Earnings/history ranges (when needed)
          would be L2 Segmented inside the page, not more ChromeTabs.
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
      <ProgressSubnav active="past" />
      <div className="f09n-subnav ui-chrome-tabs" role="tablist" aria-label="Nested tabs (bad)">
        <ChromeTab size="page" active>
          Completions
        </ChromeTab>
        <ChromeTab size="page">Points</ChromeTab>
        <ChromeTab size="page">Reflections</ChromeTab>
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
          L0 app nav + Progress subnav + ledger page tabs + range Segmented =
          three chrome bands before content. Variant B is the same IA without the
          middle ChromeTab row.
        </p>
      </div>
    </section>
  );
}

export default function NestingPage() {
  const [params] = useSearchParams();
  const variant = params.get("variant") ?? "A";

  return (
    <div className="f09n-page">
      <div className="f09n-banner" role="status">
        <strong>Experimental prototype</strong>
        {" · "}
        F09 M1-06 · nesting / information depth. Proposed rule in the sidebar;
        surfaces show conforming stacks vs one anti-pattern.
      </div>
      <div className="f09n-layout">
        <RuleCard />
        <div className="f09n-preview">
          {variant === "A" && <SurfaceA />}
          {variant === "B" && <SurfaceB />}
          {variant === "C" && <SurfaceC />}
          {variant === "D" && <SurfaceD />}
          {variant === "E" && <SurfaceE />}
        </div>
      </div>
      <PrototypeSwitcher variants={[...SURFACES]} surfaceLabel="M1-06 nesting" />
    </div>
  );
}
