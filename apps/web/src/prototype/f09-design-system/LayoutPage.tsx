/**
 * F09 M1-07 + M1-08 · Paired panel height + chrome/width budget.
 *
 * Design questions (M1-07 height):
 * 1. Height source: viewport track vs content-max stretch vs fixed clamp?
 * 2. Both columns scroll independently inside the shared track?
 * 3. Stacked breakpoint: equal-height off?
 *
 * Design questions (M1-08 width):
 * 1. Chip/tab rows: wrap vs nowrap+scroll vs shorten?
 * 2. Dual-column mins / stack breakpoint alignment with compose wrap?
 * 3. Gap + breakpoint scale (few steps)?
 *
 * Axes: ?height= · ?width= · ?frame= (fake viewport width)
 * Surfaces via PrototypeSwitcher ?variant=
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, ChromeTab } from "../../ui";
import PrototypeSwitcher from "../PrototypeSwitcher";
import "./layout.css";

const SURFACES = [
  { key: "A", name: "Past work dual-column (stress)" },
  { key: "B", name: "Jobs tabs + chips (width)" },
] as const;

const HEIGHT_OPTS = [
  { key: "current", name: "Current · independent grow" },
  { key: "viewport", name: "Proposed · viewport track + scroll" },
  { key: "stretch", name: "Alt · stretch to taller sibling" },
  { key: "clamp", name: "Alt · fixed 28rem clamp (Tasks-like)" },
] as const;

const WIDTH_OPTS = [
  { key: "current", name: "Current · nowrap scroll / 900 stack" },
  { key: "wrap", name: "Proposed · chips wrap · stack 640" },
  { key: "scroll", name: "Alt · nowrap + overflow-x" },
] as const;

const FRAME_OPTS = [
  { key: "1100", name: "1100 (shell)" },
  { key: "900", name: "900" },
  { key: "720", name: "720" },
  { key: "560", name: "560" },
] as const;

type HeightKey = (typeof HEIGHT_OPTS)[number]["key"];
type WidthKey = (typeof WIDTH_OPTS)[number]["key"];
type FrameKey = (typeof FRAME_OPTS)[number]["key"];

function useAxis<T extends string>(
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
    <div className="f09l-param" role="group" aria-label={label}>
      <span className="f09l-param-label">{label}</span>
      <div className="f09l-param-options">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            className={`f09l-chip${current === o.key ? " is-active" : ""}`}
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
    <aside className="f09l-rule card">
      <h2 className="f09l-rule-title">M1-07 · Height (proposed)</h2>
      <p className="f09l-prose">
        Dual-column rows use a <strong>shared track height</strong> from the
        viewport (<code>calc(100dvh − chrome)</code> with a floor). Panels are
        flex columns; bodies <code>overflow: auto</code> so both columns end on
        one baseline. Either side may scroll. When columns{" "}
        <strong>stack</strong>, the equal-height rule turns off (natural flow).
        Single-column pages do <em>not</em> get a forced page min-height; Tasks’{" "}
        <code>28rem</code> section clamp is a separate compaction tactic (M1-11),
        not the dual-column standard.
      </p>
      <p className="f09l-prose muted">
        <strong>Alts:</strong> stretch-to-taller (no viewport fill when short) ·
        fixed 28rem clamp per panel (Tasks-like, wastes space when short).
      </p>

      <h2 className="f09l-rule-title">M1-08 · Width (proposed)</h2>
      <p className="f09l-prose">
        Shell stays <strong>1100px</strong>. L2 filter chips <strong>wrap</strong>{" "}
        (no nowrap + horizontal scroll). Dual columns{" "}
        <code>minmax(16rem, 1fr) minmax(0, 1.2fr)</code>;{" "}
        <strong>stack at 640px</strong> — same breakpoint for compose/action wrap
        (kill the 860/900 squeeze window). Gaps: page 1rem · dual 0.85rem.
        Breakpoint scale collapses to <strong>640 / 860 / 1100</strong>.
      </p>
      <p className="f09l-prose muted">
        <strong>Alt:</strong> allow nowrap + <code>overflow-x</code> only for
        dense icon toolbars (not filter chips). Shortened labels only when a
        control cannot wrap.
      </p>

      <ParamRow name="height" label="M1-07 · Height strategy" options={HEIGHT_OPTS} />
      <ParamRow name="width" label="M1-08 · Width strategy" options={WIDTH_OPTS} />
      <ParamRow name="frame" label="Frame width (fake viewport)" options={FRAME_OPTS} />
      <p className="muted f09l-note">
        Resize the frame to stress stack/wrap without shrinking the whole app.{" "}
        <Link to="/prototype/f09/nesting">M1-06 nesting</Link>
      </p>
    </aside>
  );
}

function FilterChips({
  width,
  labels,
}: {
  width: WidthKey;
  labels: string[];
}) {
  return (
    <div
      className={`f09l-chips f09l-chips-${width}`}
      role="group"
      aria-label="Filter"
    >
      {labels.map((label, i) => (
        <button
          key={label}
          type="button"
          className={`f09l-chip${i === 0 ? " is-active" : ""}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Panel({
  title,
  kicker,
  children,
  tall,
}: {
  title: string;
  kicker: string;
  children: ReactNode;
  tall?: boolean;
}) {
  return (
    <section className={`f09l-panel card${tall ? " is-tall-demo" : ""}`}>
      <header className="f09l-panel-head">
        <p className="f09l-kicker">{kicker}</p>
        <h4 className="f09l-panel-title">{title}</h4>
      </header>
      <div className="f09l-panel-body">{children}</div>
    </section>
  );
}

function PastWorkSurface({
  height,
  width,
}: {
  height: HeightKey;
  width: WidthKey;
}) {
  const days = Array.from({ length: 14 }, (_, i) => i);
  const rows = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    title: i % 3 === 0 ? "LC medium · two-sum variant" : "Ranked follow-up note",
    meta: i % 2 === 0 ? "+8" : "+12",
  }));

  return (
    <section
      className="f09l-surface card"
      data-height={height}
      data-width={width}
    >
      <header className="f09l-surface-head">
        <div>
          <p className="f09l-kicker">Progress · Past work</p>
          <h3 className="f09l-surface-title">Past work</h3>
        </div>
        <Badge tone={height === "viewport" ? "ok" : "neutral"}>
          height · {height}
        </Badge>
      </header>
      <div className="f09l-tabs ui-chrome-tabs">
        <ChromeTab size="subnav">This week</ChromeTab>
        <ChromeTab size="subnav" active>
          Past work
        </ChromeTab>
        <ChromeTab size="subnav">Lifetime</ChromeTab>
      </div>
      <FilterChips
        width={width}
        labels={["Completions", "Points", "Reflections"]}
      />
      <div className={`f09l-columns f09l-h-${height} f09l-w-${width}`}>
        <Panel title="Calendar · day" kicker="Left column">
          <div className="f09l-cal" aria-hidden>
            {days.map((d) => (
              <span key={d} className={`f09l-cal-cell${d === 9 ? " is-on" : ""}`} />
            ))}
          </div>
          <div className="f09l-day-block">
            <p className="f09l-day-label">Tue · selected</p>
            <p className="muted f09l-small">
              Lane chips + Add reflection (compose row). Under current width this
              row is nowrap until 860 while columns stack at 900 — the squeeze.
            </p>
            <div className={`f09l-compose f09l-chips-${width}`}>
              {["application", "technical", "other", "Add reflection"].map(
                (label) => (
                  <button key={label} type="button" className="f09l-chip">
                    {label}
                  </button>
                ),
              )}
            </div>
          </div>
        </Panel>
        <Panel title="Ledger" kicker="Right column · long list" tall>
          {rows.map((r) => (
            <div key={r.id} className="f09l-row">
              <span>{r.title}</span>
              <span className="muted">{r.meta}</span>
            </div>
          ))}
        </Panel>
      </div>
      <p className="muted f09l-caption">
        Watch column bottoms: current leaves a short calendar beside a tall
        ledger. Proposed fills a shared track; each body scrolls.
      </p>
    </section>
  );
}

function JobsSurface({ width }: { width: WidthKey }) {
  const locs = [
    "All",
    "Bay",
    "LA",
    "NYC",
    "Hub",
    "Remote",
    "Weak",
    "?",
    "Unset",
  ];
  return (
    <section className="f09l-surface card" data-width={width}>
      <header className="f09l-surface-head">
        <div>
          <p className="f09l-kicker">Jobs · width stress</p>
          <h3 className="f09l-surface-title">Jobs</h3>
        </div>
        <Badge tone="ok">width · {width}</Badge>
      </header>
      <div className="f09l-tabs ui-chrome-tabs">
        <ChromeTab size="page" active>
          Ranked
        </ChromeTab>
        <ChromeTab size="page">Unranked</ChromeTab>
        <ChromeTab size="page">Needs description</ChromeTab>
      </div>
      <FilterChips width={width} labels={locs} />
      <div className="f09l-body">
        <div className="f09l-row">
          <span>Acme · SWE intern</span>
          <Badge tone="score">92</Badge>
        </div>
        <div className="f09l-row">
          <span>Globex · Platform</span>
          <Badge tone="score">88</Badge>
        </div>
        <p className="muted f09l-caption">
          Many location chips: proposed wraps to a second line; current/alt may
          force horizontal scroll.
        </p>
      </div>
    </section>
  );
}

export default function LayoutPage() {
  const [params, setParams] = useSearchParams();
  const variant = params.get("variant") ?? "A";
  const height = useAxis("height", HEIGHT_OPTS, "viewport");
  const width = useAxis("width", WIDTH_OPTS, "wrap");
  const frame = useAxis("frame", FRAME_OPTS, "900");

  useEffect(() => {
    const next = new URLSearchParams(params);
    let changed = false;
    if (!next.has("variant")) {
      next.set("variant", "A");
      changed = true;
    }
    if (!next.has("height")) {
      next.set("height", "viewport");
      changed = true;
    }
    if (!next.has("width")) {
      next.set("width", "wrap");
      changed = true;
    }
    if (!next.has("frame")) {
      next.set("frame", "900");
      changed = true;
    }
    if (changed) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first-load seed
  }, []);

  return (
    <div className="f09l-page">
      <div className="f09l-banner" role="status">
        <strong>Experimental prototype</strong>
        {" · "}
        F09 M1-07 / M1-08 · paired height + width budget. Sidebar states the
        proposal; axes show concrete alternatives. Frame width fakes a narrower
        viewport.
      </div>
      <div className="f09l-layout">
        <RuleCard />
        <div className="f09l-preview">
          <div
            className="f09l-frame"
            style={{ maxWidth: `${frame}px` }}
            data-frame={frame}
          >
            <p className="f09l-frame-label muted">
              Frame {frame}px · (app shell outside stays full width)
            </p>
            {variant === "A" && (
              <PastWorkSurface height={height} width={width} />
            )}
            {variant === "B" && <JobsSurface width={width} />}
          </div>
        </div>
      </div>
      <PrototypeSwitcher variants={[...SURFACES]} surfaceLabel="M1-07/08 layout" />
    </div>
  );
}
