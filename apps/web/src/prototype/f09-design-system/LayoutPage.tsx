/**
 * F09 M1-07 + M1-08 · Paired panel height + chrome/width budget.
 *
 * User lean (2026-10-15, continued):
 * - Asymmetric: calendar natural + ledger 28rem clamp (not viewport track)
 * - Chips wrap when shell width is fixed (M1-08)
 * - Tasks: section chips → one body (not multi-open accordion); counts across open/completed
 * - This week: side-by-side clamp fails when LC is short and weekly apps is tall;
 *   unequal-height / mini-container guidance on surface E; stacked +/- may be M2
 *
 * Axes: ?height= · ?stack= · ?pair= · ?width= · ?frame=
 * Surfaces: A Past work · B Jobs · C Problem · D Tasks strategies · E Unequal pairs
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, ChromeTab } from "../../ui";
import PrototypeSwitcher from "../PrototypeSwitcher";
import "./layout.css";

const SURFACES = [
  { key: "A", name: "Past work · calendar + ledger" },
  { key: "B", name: "Jobs · chip wrap (width)" },
  { key: "C", name: "Problem · stack + unequal columns" },
  { key: "D", name: "Tasks · section chips (lean)" },
  { key: "E", name: "This week · unequal / mini" },
] as const;

const HEIGHT_OPTS = [
  { key: "asymmetric", name: "Lean · cal natural / ledger 28rem" },
  { key: "clamp", name: "Both fixed 28rem (contrast)" },
  { key: "current", name: "Current · independent grow" },
  { key: "viewport", name: "Viewport track (clips calendar)" },
] as const;

const STACK_OPTS = [
  { key: "switcher", name: "Section chips · one body (lean)" },
  { key: "accordion", name: "Accordion · one open" },
  { key: "shorter", name: "Shorter clamps (16rem)" },
  { key: "all-open", name: "All clamps open (problem)" },
] as const;

const PAIR_OPTS = [
  { key: "side", name: "Side-by-side natural (today)" },
  { key: "equal-clamp", name: "Equal 28rem clamps (waste)" },
  { key: "asym", name: "Tall clamps / short natural" },
  { key: "stack-mini", name: "Mini LC strip + tall well" },
  { key: "dual-plus", name: "M2 lean · dual +/- stacked" },
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
type PairKey = (typeof PAIR_OPTS)[number]["key"];
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
      <h2 className="f09l-rule-title">M1-07 · Height</h2>
      <p className="f09l-prose">
        <strong>A · asymmetric (lean):</strong> calendar at natural height so the
        whole grid stays visible; ledger gets a <strong>28rem</strong> in-panel
        clamp. <strong>Both fixed 28rem</strong> forces the calendar into a tall
        scroll well — contrast only. Viewport track still clips.
      </p>

      <h2 className="f09l-rule-title">Tasks stack</h2>
      <p className="f09l-prose">
        <strong>D lean:</strong> category <em>section chips</em> → one scroll body
        (not multi-open accordion). Chip counts can span Open + Completed tabs.
        <strong> C</strong> is a static problem mock — no strategy toggles.
      </p>

      <h2 className="f09l-rule-title">Unequal columns / mini</h2>
      <p className="f09l-prose">
        Side-by-side peer cards fail when one well is a short control (LeetCode)
        and the other is a long list (weekly apps). Clamp-both leaves dead space;
        stretch-equal looks worse. Prefer: treat the short side as a{" "}
        <strong>mini-container</strong> (instrument strip), stack it with the tall
        well, or clamp only the tall list. Dual weekly/misc +/- stacked is an M2
        content redesign — see <strong>E</strong>.
      </p>

      <h2 className="f09l-rule-title">M1-08 · Width</h2>
      <p className="f09l-prose">
        Fixed shell → <strong>chips wrap</strong>. Agreed.
      </p>

      {surface === "A" && (
        <ParamRow name="height" label="Height (Past work)" options={HEIGHT_OPTS} />
      )}
      {(surface === "A" || surface === "B") && (
        <ParamRow name="width" label="Chip rows" options={WIDTH_OPTS} />
      )}
      {surface === "D" && (
        <ParamRow name="stack" label="Tasks strategy" options={STACK_OPTS} />
      )}
      {surface === "E" && (
        <ParamRow name="pair" label="Unequal pair" options={PAIR_OPTS} />
      )}
      <ParamRow name="frame" label="Frame width" options={FRAME_OPTS} />
      <p className="muted f09l-note">
        <Link to="/prototype/f09/nesting">M1-06 nesting</Link>
        {" · "}
        M1-09 paginates inside a well · M2 may redesign This week LC.
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
  className,
}: {
  title: string;
  kicker: string;
  children: ReactNode;
  bodyClass?: string;
  className?: string;
}) {
  return (
    <section className={`f09l-panel card${className ? ` ${className}` : ""}`}>
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

  // clamp = both panels fixed 28rem (calendar scrolls / shows empty) — contrast
  // asymmetric = calendar natural, ledger max 28rem
  const calBody =
    height === "clamp"
      ? "is-clamp-fixed"
      : height === "viewport"
        ? "is-viewport-scroll"
        : height === "asymmetric"
          ? "is-natural"
          : "";
  const ledgerBody =
    height === "clamp"
      ? "is-clamp-fixed"
      : height === "asymmetric"
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
          kicker={
            height === "asymmetric"
              ? "Natural · full grid visible"
              : height === "clamp"
                ? "Fixed 28rem · scrolls / empty"
                : "Left column"
          }
          bodyClass={calBody}
        >
          <div className="f09l-cal" aria-hidden>
            {days.map((d) => (
              <span key={d} className={`f09l-cal-cell${d === 9 ? " is-on" : ""}`} />
            ))}
          </div>
          <div className="f09l-day-block">
            <p className="f09l-day-label">Tue · selected</p>
            <p className="muted f09l-small">
              {height === "asymmetric" &&
                "Lean: calendar stays natural. Only the ledger clamps."}
              {height === "clamp" &&
                "Both panels forced to 28rem — calendar wastes space or scrolls."}
              {height === "viewport" &&
                "Shared viewport track clips the calendar."}
              {height === "current" &&
                "Independent grow — ledger makes the page very tall."}
            </p>
            <div className={`f09l-compose f09l-chips-${width}`}>
              {["application", "technical", "other", "Add reflection"].map((label) => (
                <button key={label} type="button" className="f09l-chip">
                  {label}
                </button>
              ))}
            </div>
            {height === "clamp" && (
              <div className="f09l-day-extra">
                {Array.from({ length: 6 }, (_, i) => (
                  <p key={i} className="muted f09l-small">
                    Extra day chrome line {i + 1} — forces scroll in fixed clamp.
                  </p>
                ))}
              </div>
            )}
          </div>
        </Panel>
        <Panel title="Ledger" kicker="Right · long list" bodyClass={ledgerBody}>
          {rows.map((r) => (
            <div key={r.id} className="f09l-row">
              <span>{r.title}</span>
              <span className="muted">{r.meta}</span>
            </div>
          ))}
        </Panel>
      </div>
      <p className="muted f09l-caption">
        Asymmetric ≠ both-clamped: left height follows content; right scrolls at
        28rem. Toggle Height to compare.
      </p>
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
  { id: "apps", name: "Applications", open: 8, done: 4 },
  { id: "tech", name: "Technical", open: 5, done: 4 },
  { id: "other", name: "Other", open: 3, done: 4 },
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

function LcMini({ dualPlus }: { dualPlus?: boolean }) {
  if (dualPlus) {
    return (
      <div className="f09l-lc-dual">
        {(["Weekly", "Misc"] as const).map((kind) => (
          <div key={kind} className="f09l-lc-set">
            <span className="f09l-lc-kind">{kind}</span>
            {(["E", "M", "H"] as const).map((t) => (
              <span key={t} className="f09l-lc-tier">
                <button type="button" className="f09l-chip">
                  −
                </button>
                <span className="f09l-lc-label">
                  {t} {kind === "Weekly" ? 1 : 0}
                </span>
                <button type="button" className="f09l-chip">
                  +
                </button>
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="f09l-lc-compact">
      <div className="f09l-chips f09l-chips-wrap">
        <button type="button" className="f09l-chip is-active">
          Weekly
        </button>
        <button type="button" className="f09l-chip">
          Misc
        </button>
      </div>
      <div className="f09l-lc-tiers">
        {(["Easy 2", "Med 1", "Hard 0"] as const).map((t) => (
          <span key={t} className="f09l-lc-tier">
            <button type="button" className="f09l-chip">
              −
            </button>
            <span className="f09l-lc-label">{t}</span>
            <button type="button" className="f09l-chip">
              +
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

/** C — static problem: stacked task clamps + unequal This week columns */
function StackedProblemSurface() {
  return (
    <div className="f09l-stack-page">
      <section className="f09l-surface card">
        <header className="f09l-surface-head">
          <div>
            <p className="f09l-kicker">Problem 1 · Tasks today</p>
            <h3 className="f09l-surface-title">Tasks</h3>
          </div>
          <Badge tone="danger">3 × 28rem stacked</Badge>
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
            kicker={`${s.open} open · clamped`}
            bodyClass="is-clamp"
          >
            <TaskRows n={s.open} />
          </Panel>
        ))}
        <p className="muted f09l-caption">
          Strategies live on <strong>D</strong> (this surface is the problem only).
        </p>
      </section>

      <section className="f09l-surface card">
        <header className="f09l-surface-head">
          <div>
            <p className="f09l-kicker">Problem 2 · This week unequal columns</p>
            <h3 className="f09l-surface-title">This week</h3>
          </div>
          <Badge tone="danger">tall + short peers</Badge>
        </header>
        <div className="f09l-tabs ui-chrome-tabs">
          <ChromeTab size="subnav" active>
            This week
          </ChromeTab>
          <ChromeTab size="subnav">Past work</ChromeTab>
          <ChromeTab size="subnav">Lifetime</ChromeTab>
        </div>
        <div className="f09l-week-grid">
          <Panel
            title="Weekly apps"
            kicker="Tall list · many rows"
            bodyClass="is-natural"
          >
            <TaskRows n={12} />
          </Panel>
          <Panel
            title="LeetCode"
            kicker="Short control · peer card"
            bodyClass="is-natural"
            className="f09l-panel-short"
          >
            <LcMini />
            <p className="muted f09l-small">
              Equal-height / shared clamp cannot fix this: the short card is mostly
              empty, the tall one still needs page scroll. See <strong>E</strong>.
            </p>
          </Panel>
        </div>
      </section>
    </div>
  );
}

/** D — Tasks stack strategies; section chips is lean */
function StackedStrategySurface({ stack }: { stack: StackKey }) {
  const [open, setOpen] = useState<string>("apps");
  const [tab, setTab] = useState<"open" | "done">("open");
  const clampClass = stack === "shorter" ? "is-clamp-sm" : "is-clamp";

  if (stack === "switcher") {
    const active = TASK_SECTIONS.find((s) => s.id === open) ?? TASK_SECTIONS[0]!;
    const n = tab === "open" ? active.open : active.done;
    return (
      <section className="f09l-surface card">
        <header className="f09l-surface-head">
          <div>
            <p className="f09l-kicker">Lean · one primary well</p>
            <h3 className="f09l-surface-title">Tasks</h3>
          </div>
          <Badge tone="ok">section chips</Badge>
        </header>
        <div className="f09l-tabs ui-chrome-tabs">
          <ChromeTab
            size="page"
            active={tab === "open"}
            onClick={() => setTab("open")}
          >
            Open
          </ChromeTab>
          <ChromeTab
            size="page"
            active={tab === "done"}
            onClick={() => setTab("done")}
          >
            Completed
          </ChromeTab>
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
              <span className="f09l-opt-count">
                {s.open}
                <span className="f09l-opt-sep">/</span>
                {s.done}
              </span>
            </button>
          ))}
        </div>
        <Panel
          title={active.name}
          kicker={`${tab === "open" ? "Open" : "Completed"} · single 28rem well`}
          bodyClass="is-clamp"
        >
          <TaskRows n={n} />
        </Panel>
        <p className="muted f09l-caption">
          Counts on chips = open/done for that category (visible on both tabs).
          Cleaner than multi-select accordion. Paginate inside the well (M1-09).
        </p>
      </section>
    );
  }

  return (
    <section className="f09l-surface card">
      <header className="f09l-surface-head">
        <div>
          <p className="f09l-kicker">Contrast · not the lean</p>
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
                  <span className="muted">
                    {s.open}/{s.done}
                  </span>
                </span>
                <span className="muted">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className={`f09l-panel-body ${clampClass}`}>
                  <TaskRows n={s.open} />
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
            <TaskRows n={s.open} />
          </Panel>
        );
      })}
      <p className="muted f09l-caption">
        {stack === "accordion" &&
          "Single-open accordion is workable; section chips still win for counts + L2 chrome."}
        {stack === "shorter" &&
          "Still three wells — shorter does not fix column stacking on This week."}
        {stack === "all-open" && "Same as C problem 1."}
      </p>
    </section>
  );
}

/** E — unequal height / mini-container strategies for This week */
function UnequalPairSurface({ pair }: { pair: PairKey }) {
  const tall = <TaskRows n={12} />;
  const shortNote = (
    <p className="muted f09l-small">
      Guidance: peer cards assume similar content density. When one side is a
      control strip (mini) and the other is a list, stop pretending they are
      equal columns — demote the short side or stack.
    </p>
  );

  return (
    <section className="f09l-surface card">
      <header className="f09l-surface-head">
        <div>
          <p className="f09l-kicker">Progress · unequal pair</p>
          <h3 className="f09l-surface-title">This week</h3>
        </div>
        <Badge tone="ok">{pair}</Badge>
      </header>
      <div className="f09l-tabs ui-chrome-tabs">
        <ChromeTab size="subnav" active>
          This week
        </ChromeTab>
        <ChromeTab size="subnav">Past work</ChromeTab>
        <ChromeTab size="subnav">Lifetime</ChromeTab>
      </div>

      {pair === "side" && (
        <>
          <div className="f09l-week-grid">
            <Panel title="Weekly apps" kicker="Tall · natural" bodyClass="is-natural">
              {tall}
            </Panel>
            <Panel title="LeetCode" kicker="Short · peer card" className="f09l-panel-short">
              <LcMini />
            </Panel>
          </div>
          <p className="muted f09l-caption">
            Today-ish: ragged bottoms. Clamping both does not help — try other
            pair modes.
          </p>
        </>
      )}

      {pair === "equal-clamp" && (
        <>
          <div className="f09l-week-grid">
            <Panel title="Weekly apps" kicker="28rem fixed" bodyClass="is-clamp-fixed">
              {tall}
            </Panel>
            <Panel title="LeetCode" kicker="28rem fixed · mostly empty" bodyClass="is-clamp-fixed">
              <LcMini />
            </Panel>
          </div>
          <p className="muted f09l-caption">
            Equal clamp = dead air under LeetCode. Reject for unequal density.
          </p>
        </>
      )}

      {pair === "asym" && (
        <>
          <div className="f09l-week-grid">
            <Panel title="Weekly apps" kicker="Tall · 28rem clamp" bodyClass="is-clamp">
              {tall}
            </Panel>
            <Panel title="LeetCode" kicker="Short · natural" className="f09l-panel-short">
              <LcMini />
            </Panel>
          </div>
          <p className="muted f09l-caption">
            Better than equal clamp, but still two peer cards with mismatched
            visual weight. Prefer mini strip (next).
          </p>
        </>
      )}

      {pair === "stack-mini" && (
        <>
          <div className="f09l-mini" role="region" aria-label="LeetCode">
            <span className="f09l-mini-label">LeetCode</span>
            <LcMini />
          </div>
          <Panel title="Weekly apps" kicker="Full-width list · 28rem clamp" bodyClass="is-clamp">
            {tall}
          </Panel>
          {shortNote}
          <p className="muted f09l-caption">
            Mini-container: compact instrument, not a card sibling. Tall list owns
            the region.
          </p>
        </>
      )}

      {pair === "dual-plus" && (
        <>
          <div className="f09l-mini f09l-mini-dual" role="region" aria-label="LeetCode">
            <span className="f09l-mini-label">LeetCode · weekly + misc</span>
            <LcMini dualPlus />
          </div>
          <Panel title="Weekly apps" kicker="Full-width · 28rem clamp" bodyClass="is-clamp">
            {tall}
          </Panel>
          <p className="muted f09l-caption">
            M2-lean sketch: drop the weekly/misc selector; two +/- rows always
            visible. Content redesign (not just height CSS) — ticket in M2 if
            locked. Still pairs with a mini strip + one tall well.
          </p>
        </>
      )}
    </section>
  );
}

export default function LayoutPage() {
  const [params, setParams] = useSearchParams();
  const variant = params.get("variant") ?? "A";
  const height = useAxis("height", HEIGHT_OPTS, "asymmetric");
  const stack = useAxis("stack", STACK_OPTS, "switcher");
  const pair = useAxis("pair", PAIR_OPTS, "stack-mini");
  const width = useAxis("width", WIDTH_OPTS, "wrap");
  const frame = useAxis("frame", FRAME_OPTS, "900");

  useEffect(() => {
    const next = new URLSearchParams(params);
    let changed = false;
    const seeds: Array<[string, string]> = [
      ["variant", "A"],
      ["height", "asymmetric"],
      ["stack", "switcher"],
      ["pair", "stack-mini"],
      ["width", "wrap"],
      ["frame", "900"],
    ];
    for (const [k, v] of seeds) {
      if (!next.has(k)) {
        next.set(k, v);
        changed = true;
      }
    }
    if (changed) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first-load seed
  }, []);

  return (
    <div className="f09l-page">
      <div className="f09l-banner" role="status">
        <strong>Experimental prototype</strong>
        {" · "}
        F09 M1-07 / M1-08. A asymmetric lean · C problem (static) · D Tasks
        section chips · E unequal / mini-container for This week.
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
            {variant === "E" && <UnequalPairSurface pair={pair} />}
          </div>
        </div>
      </div>
      <PrototypeSwitcher variants={[...SURFACES]} surfaceLabel="M1-07/08 layout" />
    </div>
  );
}
