/**
 * F09 M1-07 + M1-08 · Paired panel height + chrome/width budget.
 *
 * User lean (2026-10-15):
 * - Prefer fixed 28rem clamp for scrollable lists (ledger); calendar should stay fully visible
 * - Dislike viewport-track horizontal/page scroll that clips calendar
 * - Chips wrap when shell width is fixed (M1-08)
 * - Need mock for stacked clamps (Tasks + This week) and designs that avoid endless page scroll
 *
 * Axes: ?height= · ?stack= · ?width= · ?frame=
 * Surfaces: A Past work · B Jobs width · C Stacked clamps (problem) · D Stacked strategies
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, ChromeTab } from "../../ui";
import PrototypeSwitcher from "../PrototypeSwitcher";
import "./layout.css";

const SURFACES = [
  { key: "A", name: "Past work · calendar + ledger" },
  { key: "B", name: "Jobs · chip wrap (width)" },
  { key: "C", name: "Problem · stacked 28rem clamps" },
  { key: "D", name: "Proposed · stacked strategies" },
] as const;

const HEIGHT_OPTS = [
  { key: "clamp", name: "Preferred · 28rem list clamp" },
  { key: "current", name: "Current · independent grow" },
  { key: "viewport", name: "Viewport track (clips calendar)" },
  { key: "asymmetric", name: "Asymmetric · cal natural / ledger clamp" },
] as const;

const STACK_OPTS = [
  { key: "all-open", name: "All clamps open (problem)" },
  { key: "accordion", name: "Accordion · one section open" },
  { key: "switcher", name: "Section chips · one body" },
  { key: "shorter", name: "Shorter clamps when many (16rem)" },
] as const;

const WIDTH_OPTS = [
  { key: "wrap", name: "Chips wrap (agreed)" },
  { key: "current", name: "Current · nowrap scroll" },
] as const;

const FRAME_OPTS = [
  { key: "1100", name: "1100 (shell)" },
  { key: "900", name: "900" },
  { key: "720", name: "720" },
  { key: "560", name: "560" },
] as const;

type HeightKey = (typeof HEIGHT_OPTS)[number]["key"];
type StackKey = (typeof STACK_OPTS)[number]["key"];
type WidthKey = (typeof WIDTH_OPTS)[number]["key"];

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

function RuleCard({ surface }: { surface: string }) {
  return (
    <aside className="f09l-rule card">
      <h2 className="f09l-rule-title">M1-07 · Height (lean)</h2>
      <p className="f09l-prose">
        <strong>28rem clamp</strong> on scrollable list panels (ledger, task
        sections). Self-contained widgets (calendar) stay at{" "}
        <strong>natural height</strong> so the whole grid stays visible — no
        viewport track that forces page/column scroll over the calendar.
        Dual-column: prefer <em>asymmetric</em> (cal natural / ledger clamp) or
        clamp only where the list is long.
      </p>

      <h2 className="f09l-rule-title">Stacked clamps (open)</h2>
      <p className="f09l-prose">
        Several 28rem wells stacked (Tasks categories + Progress This week cards)
        recreate a long page scroll even with internal scrolling. Surfaces{" "}
        <strong>C</strong> (problem) and <strong>D</strong> (strategies). Overlaps
        M1-09 (paginate inside a well) but the stack itself is M1-07/11.
      </p>
      <p className="f09l-prose muted">
        Strategies: accordion (one open) · section chips (one body) · shorter
        clamps when many · (later) paginate lists inside the primary well.
      </p>

      <h2 className="f09l-rule-title">M1-08 · Width</h2>
      <p className="f09l-prose">
        With a fixed shell (1100), <strong>chips wrap</strong>. Agreed.
      </p>

      {(surface === "A" || surface === "B") && (
        <>
          <ParamRow name="height" label="Height (Past work)" options={HEIGHT_OPTS} />
          <ParamRow name="width" label="Chip rows" options={WIDTH_OPTS} />
        </>
      )}
      {(surface === "C" || surface === "D") && (
        <ParamRow name="stack" label="Stacked strategy" options={STACK_OPTS} />
      )}
      <ParamRow name="frame" label="Frame width" options={FRAME_OPTS} />
      <p className="muted f09l-note">
        <Link to="/prototype/f09/nesting">M1-06 nesting</Link>
        {" · "}
        M1-09 owns list page size inside a well.
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
    <div className={`f09l-chips f09l-chips-${width}`} role="group" aria-label="Filter">
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
  bodyClass,
}: {
  title: string;
  kicker: string;
  children: ReactNode;
  bodyClass?: string;
}) {
  return (
    <section className="f09l-panel card">
      <header className="f09l-panel-head">
        <p className="f09l-kicker">{kicker}</p>
        <h4 className="f09l-panel-title">{title}</h4>
      </header>
      <div className={`f09l-panel-body${bodyClass ? ` ${bodyClass}` : ""}`}>
        {children}
      </div>
    </section>
  );
}

function ledgerRows(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    title: i % 3 === 0 ? "LC medium · two-sum variant" : "Ranked follow-up note",
    meta: i % 2 === 0 ? "+8" : "+12",
  }));
}

function PastWorkSurface({
  height,
  width,
}: {
  height: HeightKey;
  width: WidthKey;
}) {
  const days = Array.from({ length: 14 }, (_, i) => i);
  const rows = ledgerRows(18);
  const ledgerBody =
    height === "clamp" || height === "asymmetric"
      ? "is-clamp"
      : height === "viewport"
        ? "is-viewport-scroll"
        : "";

  return (
    <section className="f09l-surface card" data-height={height} data-width={width}>
      <header className="f09l-surface-head">
        <div>
          <p className="f09l-kicker">Progress · Past work</p>
          <h3 className="f09l-surface-title">Past work</h3>
        </div>
        <Badge tone="ok">height · {height}</Badge>
      </header>
      <div className="f09l-tabs ui-chrome-tabs">
        <ChromeTab size="subnav">This week</ChromeTab>
        <ChromeTab size="subnav" active>
          Past work
        </ChromeTab>
        <ChromeTab size="subnav">Lifetime</ChromeTab>
      </div>
      <FilterChips width={width} labels={["Completions", "Points", "Reflections"]} />
      <div className={`f09l-columns f09l-h-${height} f09l-w-${width}`}>
        <Panel
          title="Calendar · day"
          kicker="Left · should stay fully visible"
          bodyClass={height === "viewport" ? "is-viewport-scroll" : "is-natural"}
        >
          <div className="f09l-cal" aria-hidden>
            {days.map((d) => (
              <span key={d} className={`f09l-cal-cell${d === 9 ? " is-on" : ""}`} />
            ))}
          </div>
          <div className="f09l-day-block">
            <p className="f09l-day-label">Tue · selected</p>
            <p className="muted f09l-small">
              Calendar + day chrome stay natural height under preferred /
              asymmetric. Viewport track is what clips this.
            </p>
            <div className={`f09l-compose f09l-chips-${width}`}>
              {["application", "technical", "other", "Add reflection"].map((label) => (
                <button key={label} type="button" className="f09l-chip">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Panel>
        <Panel title="Ledger" kicker="Right · long list · in-panel scroll" bodyClass={ledgerBody}>
          {rows.map((r) => (
            <div key={r.id} className="f09l-row">
              <span>{r.title}</span>
              <span className="muted">{r.meta}</span>
            </div>
          ))}
        </Panel>
      </div>
    </section>
  );
}

function JobsSurface({ width }: { width: WidthKey }) {
  const locs = ["All", "Bay", "LA", "NYC", "Hub", "Remote", "Weak", "?", "Unset"];
  return (
    <section className="f09l-surface card" data-width={width}>
      <header className="f09l-surface-head">
        <div>
          <p className="f09l-kicker">Jobs · width</p>
          <h3 className="f09l-surface-title">Jobs</h3>
        </div>
        <Badge tone="ok">chips · {width}</Badge>
      </header>
      <div className="f09l-tabs ui-chrome-tabs">
        <ChromeTab size="page" active>
          Ranked
        </ChromeTab>
        <ChromeTab size="page">Unranked</ChromeTab>
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
      </div>
    </section>
  );
}

const TASK_SECTIONS = [
  { id: "apps", name: "Applications", n: 12 },
  { id: "tech", name: "Technical", n: 9 },
  { id: "other", name: "Other", n: 7 },
] as const;

function TaskRows({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="f09l-row">
          <span>
            {i % 2 === 0 ? "Follow up · " : "Prep · "}
            item {i + 1}
          </span>
          <span className="muted">P{i % 3}</span>
        </div>
      ))}
    </>
  );
}

/** C — problem: Tasks sections + This week cards all open at 28rem */
function StackedProblemSurface() {
  return (
    <div className="f09l-stack-page">
      <section className="f09l-surface card">
        <header className="f09l-surface-head">
          <div>
            <p className="f09l-kicker">Problem mock</p>
            <h3 className="f09l-surface-title">Tasks</h3>
          </div>
          <Badge tone="danger">3 × 28rem open</Badge>
        </header>
        <div className="f09l-tabs ui-chrome-tabs">
          <ChromeTab size="page" active>
            Open
          </ChromeTab>
          <ChromeTab size="page">Completed</ChromeTab>
        </div>
        {TASK_SECTIONS.map((s) => (
          <Panel
            key={s.id}
            title={s.name}
            kicker={`${s.n} tasks · clamped`}
            bodyClass="is-clamp"
          >
            <TaskRows n={s.n} />
          </Panel>
        ))}
      </section>

      <section className="f09l-surface card">
        <header className="f09l-surface-head">
          <div>
            <p className="f09l-kicker">Same session · Progress</p>
            <h3 className="f09l-surface-title">This week</h3>
          </div>
          <Badge tone="danger">more cards</Badge>
        </header>
        <div className="f09l-tabs ui-chrome-tabs">
          <ChromeTab size="subnav" active>
            This week
          </ChromeTab>
          <ChromeTab size="subnav">Past work</ChromeTab>
          <ChromeTab size="subnav">Lifetime</ChromeTab>
        </div>
        <div className="f09l-week-grid">
          <Panel title="Weekly goals" kicker="Card" bodyClass="is-clamp-sm">
            <TaskRows n={6} />
          </Panel>
          <Panel title="LeetCode + daily" kicker="Card" bodyClass="is-clamp-sm">
            <TaskRows n={8} />
          </Panel>
        </div>
        <p className="muted f09l-caption">
          Page scroll distance ≈ sum of clamps + chrome. Internal scroll does not
          fix “too many wells stacked.”
        </p>
      </section>
    </div>
  );
}

/** D — strategies for stacked wells */
function StackedStrategySurface({ stack }: { stack: StackKey }) {
  const [open, setOpen] = useState<string>("apps");
  const clampClass =
    stack === "shorter" ? "is-clamp-sm" : stack === "all-open" ? "is-clamp" : "is-clamp";

  if (stack === "switcher") {
    const active = TASK_SECTIONS.find((s) => s.id === open) ?? TASK_SECTIONS[0];
    return (
      <section className="f09l-surface card">
        <header className="f09l-surface-head">
          <div>
            <p className="f09l-kicker">Proposed · one primary well</p>
            <h3 className="f09l-surface-title">Tasks</h3>
          </div>
          <Badge tone="ok">section chips</Badge>
        </header>
        <div className="f09l-tabs ui-chrome-tabs">
          <ChromeTab size="page" active>
            Open
          </ChromeTab>
          <ChromeTab size="page">Completed</ChromeTab>
        </div>
        <div className="f09l-chips f09l-chips-wrap" role="group" aria-label="Category">
          {TASK_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`f09l-chip${open === s.id ? " is-active" : ""}`}
              onClick={() => setOpen(s.id)}
            >
              {s.name}
              <span className="f09l-opt-count">{s.n}</span>
            </button>
          ))}
        </div>
        <Panel
          title={active!.name}
          kicker="Single 28rem well · paginate later (M1-09)"
          bodyClass="is-clamp"
        >
          <TaskRows n={active!.n} />
        </Panel>
        <p className="muted f09l-caption">
          Categories become L2 chips (M1-06), not three stacked clamps. One
          scroll well per page region.
        </p>
      </section>
    );
  }

  return (
    <section className="f09l-surface card">
      <header className="f09l-surface-head">
        <div>
          <p className="f09l-kicker">Proposed · stacked strategy</p>
          <h3 className="f09l-surface-title">Tasks</h3>
        </div>
        <Badge tone="ok">{stack}</Badge>
      </header>
      <div className="f09l-tabs ui-chrome-tabs">
        <ChromeTab size="page" active>
          Open
        </ChromeTab>
        <ChromeTab size="page">Completed</ChromeTab>
      </div>
      {TASK_SECTIONS.map((s) => {
        const isOpen = stack === "all-open" || stack === "shorter" || open === s.id;
        if (stack === "accordion") {
          return (
            <div key={s.id} className="f09l-acc">
              <button
                type="button"
                className="f09l-acc-head"
                aria-expanded={isOpen}
                onClick={() => setOpen(s.id)}
              >
                <span>
                  {s.name}{" "}
                  <span className="muted">{s.n}</span>
                </span>
                <span className="muted">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className={`f09l-panel-body ${clampClass}`}>
                  <TaskRows n={s.n} />
                </div>
              )}
            </div>
          );
        }
        return (
          <Panel
            key={s.id}
            title={s.name}
            kicker={stack === "shorter" ? "16rem when many" : "28rem"}
            bodyClass={clampClass}
          >
            <TaskRows n={s.n} />
          </Panel>
        );
      })}
      <p className="muted f09l-caption">
        {stack === "accordion" &&
          "Only one section expanded — page scroll stays short; switch headers to change well."}
        {stack === "shorter" &&
          "Still three wells, but each shorter — less page travel, denser chrome."}
        {stack === "all-open" &&
          "Same problem as C (control). Flip to accordion or section chips."}
      </p>
    </section>
  );
}

export default function LayoutPage() {
  const [params, setParams] = useSearchParams();
  const variant = params.get("variant") ?? "A";
  const height = useAxis("height", HEIGHT_OPTS, "asymmetric");
  const stack = useAxis("stack", STACK_OPTS, "switcher");
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
      next.set("height", "asymmetric");
      changed = true;
    }
    if (!next.has("stack")) {
      next.set("stack", "switcher");
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
        F09 M1-07 / M1-08. Prefer 28rem list clamps + full calendar; C/D explore
        stacked wells (Tasks / This week). Width: chips wrap.
      </div>
      <div className="f09l-layout">
        <RuleCard surface={variant} />
        <div className="f09l-preview">
          <div
            className="f09l-frame"
            style={{ maxWidth: `${frame}px` }}
            data-frame={frame}
          >
            <p className="f09l-frame-label muted">Frame {frame}px</p>
            {variant === "A" && (
              <PastWorkSurface height={height} width={width} />
            )}
            {variant === "B" && <JobsSurface width={width} />}
            {variant === "C" && <StackedProblemSurface />}
            {variant === "D" && <StackedStrategySurface stack={stack} />}
          </div>
        </div>
      </div>
      <PrototypeSwitcher variants={[...SURFACES]} surfaceLabel="M1-07/08 layout" />
    </div>
  );
}
