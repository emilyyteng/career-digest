/**
 * F09 M1-15 · Home chrome & urgency refinements.
 *
 * Design questions:
 * 1. Segmented active state (ink vs gray+black …)
 * 2. ChromeTab active on pink desk
 * 3. Urgency “yellow/soon” vs P1 — which token, align or rediscuss
 * 4. Countdown mono + pad; pie circle seam/gap
 * 5. GOAL badge: reward pink vs domain-tech purple
 * 6. Link hover on pink desk
 *
 * Orthogonal URL params (mix freely). PrototypeSwitcher cycles presets.
 *   ?variant= · seg= · tab= · urg= · cd= · pie= · goal= · link=
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PrototypeSwitcher from "../PrototypeSwitcher";
import "./refinements.css";

const PRESETS = [
  { key: "A", name: "Current (M1 lock)" },
  { key: "B", name: "Soft gray controls" },
  { key: "C", name: "Urgency rethink" },
  { key: "D", name: "Kind + links" },
] as const;

const PRESET_PARAMS: Record<
  string,
  Record<"seg" | "tab" | "urg" | "cd" | "pie" | "goal" | "link", string>
> = {
  A: { seg: "ink", tab: "gray-ink", urg: "current", cd: "current", pie: "conic", goal: "reward", link: "ink" },
  B: { seg: "gray-black", tab: "soft-fill", urg: "current", cd: "mono-pad", pie: "solid-full", goal: "reward", link: "ink" },
  C: { seg: "gray-black", tab: "underline", urg: "ahead-p1", cd: "mono-pad", pie: "svg", goal: "tech", link: "purple" },
  D: { seg: "gray-black", tab: "text-only", urg: "soon-soft", cd: "mono-pad", pie: "solid-full", goal: "tech", link: "brand" },
};

const SEG_OPTS = [
  { key: "ink", name: "Ink fill (current)" },
  { key: "gray-black", name: "Gray + black" },
  { key: "soft-ink", name: "Soft ink wash" },
] as const;

const TAB_OPTS = [
  { key: "gray-ink", name: "Gray + ink border (current)" },
  { key: "underline", name: "Underline ink" },
  { key: "soft-fill", name: "Soft fill, no hard border" },
  { key: "brand-tint", name: "Brand-tint wash" },
  { key: "text-only", name: "Ink text only" },
] as const;

const URG_OPTS = [
  { key: "current", name: "Current Severity-4" },
  { key: "ahead-p1", name: "Ahead = P1 gold" },
  { key: "soon-soft", name: "Soon softer rose" },
  { key: "ahead-soft", name: "Ahead softer amber" },
] as const;

const CD_OPTS = [
  { key: "current", name: "Current format" },
  { key: "mono-pad", name: "Mono + padded" },
] as const;

const PIE_OPTS = [
  { key: "conic", name: "Conic (current)" },
  { key: "solid-full", name: "Solid when full" },
  { key: "svg", name: "SVG ring" },
] as const;

const GOAL_OPTS = [
  { key: "reward", name: "Domain reward pink (current)" },
  { key: "tech", name: "Domain tech purple" },
  { key: "apps", name: "Domain apps blue" },
] as const;

const LINK_OPTS = [
  { key: "ink", name: "Muted → ink (current Home)" },
  { key: "purple", name: "Purple-deep (legacy a:hover)" },
  { key: "brand", name: "Brand-deep" },
  { key: "tech", name: "Domain-tech deep" },
] as const;

function useAxisParam<T extends string>(
  name: string,
  keys: readonly T[],
  fallback: T,
): T {
  const [params] = useSearchParams();
  const value = params.get(name) as T | null;
  return value && (keys as readonly string[]).includes(value) ? value : fallback;
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
    <div className="f09r-param" role="group" aria-label={label}>
      <span className="f09r-param-label">{label}</span>
      <div className="f09r-param-options">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            className={`f09r-chip${current === o.key ? " is-active" : ""}`}
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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatCountdown(ms: number, mode: string): string {
  if (ms <= 0) return mode === "mono-pad" ? "Overdue" : "Overdue";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (mode === "mono-pad") {
    if (days > 0) return `${days}d ${pad2(hours)}h ${pad2(mins)}m`;
    if (hours > 0) return `${pad2(hours)}h ${pad2(mins)}m ${pad2(secs)}s`;
    return `${pad2(mins)}m ${pad2(secs)}s`;
  }
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

function urgencyTone(
  ms: number,
): "overdue" | "soon" | "ahead" | "ok" {
  if (ms <= 0) return "overdue";
  if (ms < 24 * 3600_000) return "soon";
  if (ms < 5 * 24 * 3600_000) return "ahead";
  return "ok";
}

function buildCircles(ms: number): Array<{ key: number; fill: number }> {
  if (ms <= 0) return [];
  const HALF = 12 * 3600_000;
  const MAX = 14;
  const capped = Math.min(ms, MAX * HALF);
  const full = Math.floor(capped / HALF);
  const frac = (capped % HALF) / HALF;
  const circles: Array<{ key: number; fill: number }> = [];
  for (let i = 0; i < full && i < MAX; i++) circles.push({ key: i, fill: 1 });
  if (full < MAX && frac > 0.001) circles.push({ key: full, fill: frac });
  if (circles.length === 0 && ms > 0) {
    circles.push({ key: 0, fill: Math.max(0.04, frac) });
  }
  return circles;
}

function PieConic({ fill, tone }: { fill: number; tone: string }) {
  const pct = Math.max(0, Math.min(1, fill)) * 100;
  return (
    <span
      className={`f09r-pie f09r-pie-${tone}`}
      style={{
        background: `conic-gradient(var(--f09r-pie-fill) ${pct}%, var(--f09r-pie-empty) 0)`,
      }}
      aria-hidden
    />
  );
}

function PieSolidFull({ fill, tone }: { fill: number; tone: string }) {
  if (fill >= 0.999) {
    return (
      <span
        className={`f09r-pie f09r-pie-${tone} f09r-pie-solid`}
        style={{ background: "var(--f09r-pie-fill)" }}
        aria-hidden
      />
    );
  }
  return <PieConic fill={fill} tone={tone} />;
}

function pieSlicePath(cx: number, cy: number, r: number, fill: number): string {
  const clamped = Math.max(0, Math.min(1, fill));
  if (clamped >= 0.999) {
    return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
  }
  const angle = clamped * 2 * Math.PI;
  const x = cx + r * Math.sin(angle);
  const y = cy - r * Math.cos(angle);
  const large = clamped > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x} ${y} Z`;
}

function PieSvg({ fill, tone }: { fill: number; tone: string }) {
  const cx = 7;
  const cy = 7;
  const r = 5.5;
  return (
    <svg
      className={`f09r-pie-svg f09r-pie-${tone}`}
      width="12"
      height="12"
      viewBox="0 0 14 14"
      aria-hidden
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="var(--f09r-pie-empty)"
        stroke="color-mix(in srgb, var(--f09r-pie-fill) 35%, var(--border))"
        strokeWidth="1"
      />
      <path d={pieSlicePath(cx, cy, r, fill)} fill="var(--f09r-pie-fill)" />
    </svg>
  );
}

function Pie({
  fill,
  tone,
  mode,
}: {
  fill: number;
  tone: string;
  mode: string;
}) {
  if (mode === "svg") return <PieSvg fill={fill} tone={tone} />;
  if (mode === "solid-full") return <PieSolidFull fill={fill} tone={tone} />;
  return <PieConic fill={fill} tone={tone} />;
}

function DemoCountdown({
  label,
  ms,
  cdMode,
  pieMode,
}: {
  label?: string;
  ms: number;
  cdMode: string;
  pieMode: string;
}) {
  const tone = urgencyTone(ms);
  const circles = buildCircles(ms);
  return (
    <div className="f09r-countdown-row">
      {label ? <span className="f09r-countdown-label">{label}</span> : null}
      <span className={`f09r-urgency f09r-tone-${tone}`}>
        {circles.length > 0 && (
          <span className="f09r-pies" aria-hidden>
            {circles.map((c) => (
              <Pie key={c.key} fill={c.fill} tone={tone} mode={pieMode} />
            ))}
          </span>
        )}
        <span
          className={`f09r-cd${cdMode === "mono-pad" ? " is-mono" : ""}`}
        >
          {formatCountdown(ms, cdMode)}
        </span>
      </span>
    </div>
  );
}

export default function RefinementsPage() {
  const [params, setParams] = useSearchParams();
  const variant = params.get("variant") ?? "A";

  const seg = useAxisParam("seg", SEG_OPTS.map((o) => o.key), "ink");
  const tab = useAxisParam("tab", TAB_OPTS.map((o) => o.key), "gray-ink");
  const urg = useAxisParam("urg", URG_OPTS.map((o) => o.key), "current");
  const cd = useAxisParam("cd", CD_OPTS.map((o) => o.key), "current");
  const pie = useAxisParam("pie", PIE_OPTS.map((o) => o.key), "conic");
  const goal = useAxisParam("goal", GOAL_OPTS.map((o) => o.key), "reward");
  const link = useAxisParam("link", LINK_OPTS.map((o) => o.key), "ink");

  const prevVariant = useRef<string | null>(null);
  useEffect(() => {
    const preset = PRESET_PARAMS[variant];
    if (!preset) return;
    const next = new URLSearchParams(params);
    let changed = false;
    if (prevVariant.current === null) {
      // First load: fill missing axes only so shared URLs keep custom mixes.
      for (const [k, v] of Object.entries(preset)) {
        if (!next.has(k)) {
          next.set(k, v);
          changed = true;
        }
      }
    } else if (prevVariant.current !== variant) {
      for (const [k, v] of Object.entries(preset)) {
        next.set(k, v);
        changed = true;
      }
    }
    prevVariant.current = variant;
    if (changed) setParams(next, { replace: true });
    // Axes edits must not re-apply the preset; only variant changes do.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [variant]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const anchors = useMemo(() => {
    const h = 3600_000;
    const d = 24 * h;
    const t = Date.now();
    return [
      { label: "Soon (~8h)", end: t + 8 * h },
      { label: "Ahead (~2d)", end: t + 2 * d + 3 * h + 7 * 60_000 },
      { label: "Partial pie (~18h)", end: t + 18 * h },
      { label: "Full circles (~36h)", end: t + 36 * h },
      { label: "Ok (~6d)", end: t + 6 * d },
    ];
  }, []);

  const samples = anchors.map((s) => ({
    label: s.label,
    ms: s.end - now,
  }));

  return (
    <div
      className="f09r-page"
      data-seg={seg}
      data-tab={tab}
      data-urg={urg}
      data-goal={goal}
      data-link={link}
    >
      <div className="f09r-banner" role="status">
        <strong>Experimental prototype</strong>
        {" · "}
        F09 M1-15 · Home chrome & urgency refinements. Mix axes below; ← / →
        cycles presets.{" "}
        <Link to="/prototype/f09/lab">M0 lab</Link>
        {" · "}
        <Link to="/">Home</Link>
      </div>

      <div className="f09r-layout">
        <aside className="f09r-controls card">
          <h2 className="f09r-controls-title">Axes</h2>
          <p className="muted f09r-note">
            Soon is pink (<code>--urgency-soon</code>); ahead is amber (
            <code>--urgency-ahead</code> / warn). P1 is{" "}
            <code>--severity-p1</code> gold — compare swatches in the preview.
          </p>
          <ParamRow name="seg" label="1 · Segmented active" options={SEG_OPTS} />
          <ParamRow name="tab" label="2 · ChromeTab active" options={TAB_OPTS} />
          <ParamRow name="urg" label="3 · Urgency map" options={URG_OPTS} />
          <ParamRow name="cd" label="4a · Countdown text" options={CD_OPTS} />
          <ParamRow name="pie" label="4b · Pie circles" options={PIE_OPTS} />
          <ParamRow name="goal" label="5 · GOAL badge" options={GOAL_OPTS} />
          <ParamRow name="link" label="6 · Link hover" options={LINK_OPTS} />
        </aside>

        <div className="f09r-preview">
          <section className="f09r-shell card">
            <header className="f09r-top">
              <span className="f09r-brand">flora.exe</span>
              <nav className="f09r-tabs" aria-label="App (mock)">
                {["Home", "Jobs", "Tasks", "Progress", "Rewards"].map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    className={`f09r-tab${i === 0 ? " is-active" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </header>

            <div className="f09r-hero">
              <div>
                <h2 className="f09r-greeting">Good afternoon</h2>
                <p className="muted">Mock Home strip for chrome judgment.</p>
              </div>
              <div className="f09r-last-digest">
                <span className="f09r-last-digest-label">Last digest</span>
                <span className="f09r-last-digest-value">2h ago</span>
                <a href="#status" className="f09r-link">
                  Pipeline status →
                </a>
              </div>
            </div>

            <div className="f09r-section-head">
              <h3 className="f09r-section-title">Upcoming · 1 week</h3>
              <div className="f09r-segmented" role="group" aria-label="Upcoming range">
                <button type="button" className="f09r-seg is-active">
                  1 week
                </button>
                <button type="button" className="f09r-seg">
                  2 weeks
                </button>
              </div>
            </div>

            <ul className="f09r-list">
              <li className="f09r-row">
                <div className="f09r-row-main">
                  <div className="f09r-title-line">
                    <span className="f09r-badge f09r-badge-p0">P0</span>
                    <span className="f09r-badge f09r-badge-interview">INTERVIEW</span>
                    <a href="#task" className="f09r-link f09r-title-link">
                      Prep system design
                    </a>
                  </div>
                  <span className="muted">Acme · tomorrow</span>
                </div>
                <DemoCountdown ms={samples[0]!.ms} cdMode={cd} pieMode={pie} />
              </li>
              <li className="f09r-row">
                <div className="f09r-row-main">
                  <div className="f09r-title-line">
                    <span className="f09r-badge f09r-badge-p1">P1</span>
                    <span className="f09r-badge f09r-badge-goal">GOAL</span>
                    <a href="#goal" className="f09r-link f09r-title-link">
                      Weekly LC target
                    </a>
                  </div>
                  <span className="muted">Sunday · Targets</span>
                </div>
                <DemoCountdown ms={samples[1]!.ms} cdMode={cd} pieMode={pie} />
              </li>
              <li className="f09r-row">
                <div className="f09r-row-main">
                  <div className="f09r-title-line">
                    <span className="f09r-badge f09r-badge-p2">P2</span>
                    <a href="#job" className="f09r-link f09r-title-link">
                      Ranked posting follow-up
                    </a>
                  </div>
                  <span className="muted">Jobs · ranked</span>
                </div>
                <DemoCountdown ms={samples[4]!.ms} cdMode={cd} pieMode={pie} />
              </li>
            </ul>

            <div className="f09r-subnav-block">
              <span className="f09r-kicker">Feature subnav (Progress)</span>
              <div className="f09r-tabs f09r-tabs-sub" aria-label="Progress (mock)">
                {["This week", "Past work", "Lifetime"].map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    className={`f09r-tab f09r-tab-sub${i === 1 ? " is-active" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="f09r-swatches card">
            <h3 className="f09r-section-title">Color truth</h3>
            <div className="f09r-swatch-grid">
              <div className="f09r-swatch">
                <span className="f09r-swatch-chip" style={{ background: "var(--urgency-soon)" }} />
                <code>soon</code>
                <span className="muted">#c97b8b pink</span>
              </div>
              <div className="f09r-swatch">
                <span
                  className="f09r-swatch-chip"
                  style={{ background: "var(--f09r-ahead-swatch, var(--urgency-ahead))" }}
                />
                <code>ahead</code>
                <span className="muted">amber (warn / override)</span>
              </div>
              <div className="f09r-swatch">
                <span className="f09r-swatch-chip" style={{ background: "var(--severity-p1)" }} />
                <code>P1</code>
                <span className="muted">#d4a017 gold</span>
              </div>
              <div className="f09r-swatch">
                <span className="f09r-swatch-chip" style={{ background: "var(--severity-p0)" }} />
                <code>P0</code>
                <span className="muted">vs GOAL pink risk</span>
              </div>
              <div className="f09r-swatch">
                <span className="f09r-swatch-chip" style={{ background: "var(--domain-reward)" }} />
                <code>reward</code>
                <span className="muted">GOAL current</span>
              </div>
              <div className="f09r-swatch">
                <span className="f09r-swatch-chip" style={{ background: "var(--domain-tech)" }} />
                <code>tech</code>
                <span className="muted">GOAL proposed</span>
              </div>
            </div>

            <h3 className="f09r-section-title">Countdown / pie stress</h3>
            <div className="f09r-countdown-stack">
              {samples.map((s) => (
                <DemoCountdown
                  key={s.label}
                  label={s.label}
                  ms={s.ms}
                  cdMode={cd}
                  pieMode={pie}
                />
              ))}
            </div>
            <p className="muted f09r-note">
              Zoom the page (browser zoom out) and watch full circles for a top
              hairline gap — that is the conic seam question.
            </p>
          </section>
        </div>
      </div>

      <PrototypeSwitcher variants={[...PRESETS]} surfaceLabel="M1-15 refinements" />
    </div>
  );
}
