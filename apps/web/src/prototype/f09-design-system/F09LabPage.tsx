/**
 * F09 M0-02 · Exploratory design lab.
 *
 * Design questions: Q17 brand (flora.exe), Q12 vibe cohesion, Q14 fonts,
 * Q18/Q4/Q1/Q13 color-meaning + palette, Q2 containment/elevation,
 * Q3/Q5 control looks, Q16 shell-width stress samples.
 * Heatmap peak + deadline urgency are orthogonal axes (not locked).
 *
 * Full-viewport sandbox with sidebar controls (not production shell).
 * Orthogonal URL params:
 *   ?variant= · brand= · font= · color= · heat= · urgency= · elev= · contain= · shell=
 */
import { useEffect, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PrototypeSwitcher from "../PrototypeSwitcher";
import {
  BRANDS,
  COLORS,
  CONTAINS,
  ELEVS,
  FONTS,
  HEATS,
  HUB_PATH,
  SHELLS,
  URGENCIES,
  VIBES,
  type BrandKey,
  type ColorKey,
  type ContainKey,
  type ElevKey,
  type FontKey,
  type HeatKey,
  type ShellKey,
  type UrgencyKey,
  type VibeKey,
} from "./labConfig";
import "./lab.css";

function useLabParam<T extends string>(name: string, keys: readonly T[]): T {
  const [params] = useSearchParams();
  const value = params.get(name) as T | null;
  return value && keys.includes(value) ? value : keys[0]!;
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
    <div className="f09-param" role="group" aria-label={label}>
      <span className="f09-param-label">{label}</span>
      <div className="f09-param-options">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            className={`f09-chip${current === o.key ? " is-active" : ""}`}
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

function usePrototypeFont(fontKey: FontKey) {
  const font = FONTS.find((f) => f.key === fontKey) ?? FONTS[0];
  useEffect(() => {
    if (!font.href) return;
    const id = `f09-lab-font-${font.key}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = font.href;
    document.head.appendChild(link);
  }, [font]);
  return font;
}

/** Hide the production app chrome while the lab covers the viewport. */
function useHideAppChrome() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("f09-lab-open");
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.classList.remove("f09-lab-open");
    };
  }, []);
}

const URGENCY_STEPS_3 = [
  { key: "overdue", label: "overdue" },
  { key: "soon", label: "soon" },
  { key: "ok", label: "ok" },
] as const;

const URGENCY_STEPS_5 = [
  { key: "overdue", label: "overdue" },
  { key: "urgent", label: "urgent" },
  { key: "soon", label: "soon" },
  { key: "ahead", label: "ahead" },
  { key: "ok", label: "ok" },
] as const;

export default function F09LabPage() {
  useHideAppChrome();

  const vibeKeys = VIBES.map((v) => v.key);
  const vibe = useLabParam("variant", vibeKeys) as VibeKey;
  const brand = useLabParam(
    "brand",
    BRANDS.map((b) => b.key),
  ) as BrandKey;
  const fontKey = useLabParam(
    "font",
    FONTS.map((f) => f.key),
  ) as FontKey;
  const color = useLabParam(
    "color",
    COLORS.map((c) => c.key),
  ) as ColorKey;
  const heat = useLabParam(
    "heat",
    HEATS.map((h) => h.key),
  ) as HeatKey;
  const urgency = useLabParam(
    "urgency",
    URGENCIES.map((u) => u.key),
  ) as UrgencyKey;
  const elev = useLabParam(
    "elev",
    ELEVS.map((e) => e.key),
  ) as ElevKey;
  const contain = useLabParam(
    "contain",
    CONTAINS.map((c) => c.key),
  ) as ContainKey;
  const shell = useLabParam(
    "shell",
    SHELLS.map((s) => s.key),
  ) as ShellKey;

  const font = usePrototypeFont(fontKey);
  const vibeMeta = VIBES.find((v) => v.key === vibe) ?? VIBES[0];
  const brandMeta = BRANDS.find((b) => b.key === brand) ?? BRANDS[0];
  const colorMeta = COLORS.find((c) => c.key === color) ?? COLORS[0];
  const heatMeta = HEATS.find((h) => h.key === heat) ?? HEATS[0];
  const urgencyMeta = URGENCIES.find((u) => u.key === urgency) ?? URGENCIES[0];
  const elevMeta = ELEVS.find((e) => e.key === elev) ?? ELEVS[0];
  const containMeta = CONTAINS.find((c) => c.key === contain) ?? CONTAINS[0];

  const [seg, setSeg] = useState<"weekly" | "misc">("weekly");
  const [tab, setTab] = useState("ranked");
  const [loc, setLoc] = useState("all");

  const urgencySteps =
    urgency === "u-warm3" || urgency === "u-mono"
      ? URGENCY_STEPS_3
      : URGENCY_STEPS_5;

  return (
    <div
      className="f09-lab"
      data-vibe={vibe}
      data-font={fontKey}
      data-color={color}
      data-heat={heat}
      data-urgency={urgency}
      data-elev={elev}
      data-contain={contain}
      data-shell={shell}
      style={
        {
          "--f09-display": font.display,
          "--f09-body": font.body,
        } as CSSProperties
      }
    >
      <aside className="f09-sidebar">
        <p className="f09-banner">
          <strong>Experimental prototype</strong> · F09 M0-02 ·{" "}
          <Link to="/">exit to app</Link>
          {" · "}
          <Link to={HUB_PATH}>reset params</Link>
          {" · "}←/→ vibe
        </p>

        <div className="f09-controls">
          <h2>Lab controls</h2>
          <ParamRow name="brand" label="Brand" options={BRANDS} />
          <p className="f09-brand-promise">
            <strong>{brandMeta.name}:</strong> {brandMeta.promise}
          </p>
          <ParamRow name="font" label="Font" options={FONTS} />
          <p className="f09-vibe-blurb">
            {font.name} — {font.axis}
          </p>
          <ParamRow name="color" label="Color map" options={COLORS} />
          <p className="f09-vibe-blurb">{colorMeta.blurb}</p>
          <ParamRow name="heat" label="Heatmap peak" options={HEATS} />
          <p className="f09-vibe-blurb">{heatMeta.blurb}</p>
          <ParamRow name="urgency" label="Deadline urgency" options={URGENCIES} />
          <p className="f09-vibe-blurb">{urgencyMeta.blurb}</p>
          <ParamRow name="elev" label="Button elevation" options={ELEVS} />
          <p className="f09-vibe-blurb">{elevMeta.blurb}</p>
          <ParamRow name="contain" label="Contain" options={CONTAINS} />
          <p className="f09-vibe-blurb">{containMeta.blurb}</p>
          <ParamRow name="shell" label="Shell" options={SHELLS} />
        </div>

        <p className="f09-live">
          Live: <strong>{vibeMeta.name}</strong> · {vibeMeta.blurb}
        </p>
      </aside>

      <div className="f09-stage">
        <div className="f09-stage-inner">
          <header className="f09-top">
            <h1 className="f09-brand-mark">{brandMeta.mark}</h1>
            <nav className="f09-nav" aria-label="Sample app nav">
              {["Home", "Jobs", "Tasks", "Progress", "Rewards"].map((label, i) => (
                <span
                  key={label}
                  className={`f09-chrome-tab${i === 3 ? " is-on" : ""}`}
                >
                  {label}
                </span>
              ))}
            </nav>
          </header>

          <div className="f09-subnav" aria-label="Sample feature subnav">
            {["This week", "Past work", "Lifetime"].map((label, i) => (
              <span
                key={label}
                className={`f09-chrome-tab${i === 0 ? " is-on" : ""}`}
              >
                {label}
              </span>
            ))}
          </div>

          <p className="f09-section-label">Composition sample</p>
          <div className="f09-grid-2">
            <section className="f09-panel">
              <h2 className="f09-panel-title">This week</h2>
              <p className="f09-body">
                Log a LeetCode solve and keep weekly goals in view. Weekly/Misc
                should match ink action buttons; hover uses vibe --f09-hover (not
                production purple/blue).
              </p>
              <div className="f09-actions">
                <div className="f09-segmented" role="group" aria-label="LC type">
                  <button
                    type="button"
                    className={`f09-seg${seg === "weekly" ? " is-active" : ""}`}
                    onClick={() => setSeg("weekly")}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    className={`f09-seg${seg === "misc" ? " is-active" : ""}`}
                    onClick={() => setSeg("misc")}
                  >
                    Misc
                  </button>
                </div>
                <button type="button" className="f09-btn f09-btn-primary">
                  Save
                </button>
                <button type="button" className="f09-btn">
                  Secondary
                </button>
                <button type="button" className="f09-btn f09-btn-ghost">
                  Ghost
                </button>
                <button type="button" className="f09-btn f09-btn-primary f09-btn-sm">
                  Sm primary
                </button>
              </div>
            </section>

            <section className="f09-panel">
              <h2 className="f09-panel-title">Type specimen</h2>
              <div className="f09-type-grid">
                <div className="f09-type-row">
                  <span className="f09-type-role">Brand</span>
                  <span className="f09-type-brand">{brandMeta.mark}</span>
                </div>
                <div className="f09-type-row">
                  <span className="f09-type-role">Nav</span>
                  <span className="f09-type-nav">Jobs · Tasks · Progress</span>
                </div>
                <div className="f09-type-row">
                  <span className="f09-type-role">Title</span>
                  <span className="f09-type-title">Weekly goals</span>
                </div>
                <div className="f09-type-row">
                  <span className="f09-type-role">Body</span>
                  <span className="f09-type-body">
                    Read this paragraph for comfort and density.
                  </span>
                </div>
                <div className="f09-type-row">
                  <span className="f09-type-role">Badge</span>
                  <span className="f09-type-badge">P0 · INTERVIEW</span>
                </div>
                <div className="f09-type-row">
                  <span className="f09-type-role">Number</span>
                  <span className="f09-type-num">Balance 128 · 3/5</span>
                </div>
              </div>
            </section>
          </div>

          <p className="f09-section-label">
            Color meaning (priority · kind · urgency · heat · success)
          </p>
          <section className="f09-panel">
            <div className="f09-meaning">
              <div>
                <p className="f09-muted" style={{ marginBottom: "0.35rem" }}>
                  Priority (traffic RYG on C1)
                </p>
                <div className="f09-meaning-row">
                  <span className="f09-pill f09-pill-p0">P0</span>
                  <span className="f09-pill f09-pill-p1">P1</span>
                  <span className="f09-pill f09-pill-p2">P2</span>
                </div>
              </div>
              <div>
                <p className="f09-muted" style={{ marginBottom: "0.35rem" }}>
                  Kind badges (palette-cohesive, not severity)
                </p>
                <div className="f09-meaning-row">
                  <span className="f09-kind f09-kind-interview">interview</span>
                  <span className="f09-kind f09-kind-goal">goal</span>
                </div>
              </div>
              <div>
                <p className="f09-muted" style={{ marginBottom: "0.35rem" }}>
                  Deadline urgency · {urgencyMeta.name}
                </p>
                <div className="f09-meaning-row">
                  {urgencySteps.map((step) => (
                    <span key={step.key} style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center" }}>
                      <span
                        className={`f09-urgency f09-urgency-${step.key}`}
                        title={step.label}
                      />
                      <span className="f09-muted">{step.label}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="f09-muted" style={{ marginBottom: "0.35rem" }}>
                  Heatmap intensity (empty → peak) · {heatMeta.name}
                </p>
                <div className="f09-heat" aria-hidden>
                  <span className="f09-heat-0" />
                  <span className="f09-heat-1" />
                  <span className="f09-heat-2" />
                  <span className="f09-heat-3" />
                  <span className="f09-heat-4" />
                </div>
              </div>
              <div className="f09-flash">
                <span>+12 Seeds for finishing a task</span>
                <span className="f09-type-num">Balance 128</span>
              </div>
              <p className="f09-legend">
                <span>
                  <i style={{ background: "var(--f09-p0)" }} /> severity / P0
                </span>
                <span>
                  <i style={{ background: "var(--f09-danger)" }} /> danger
                </span>
                <span>
                  <i style={{ background: "var(--f09-ok)" }} /> ok / success
                </span>
                <span>
                  <i style={{ background: "var(--f09-brand)" }} /> brand blush
                </span>
                <span>
                  <i style={{ background: "var(--f09-action)" }} /> action
                </span>
                <span>
                  <i style={{ background: "var(--f09-select)" }} /> selection
                </span>
                <span>
                  <i style={{ background: "var(--f09-chrome)" }} /> chrome
                </span>
              </p>
              <p className="f09-muted">
                Scheme <strong>{colorMeta.name}</strong>: {colorMeta.blurb}
              </p>
            </div>
          </section>

          <p className="f09-section-label">Modal chrome</p>
          <section className="f09-panel f09-modal-host">
            <div className="f09-modal-demo">
              <div className="f09-modal-card">
                <h3>Complete task?</h3>
                <p className="f09-muted">
                  Secondary (“Keep editing”) stays flat even when Button elevation
                  = raised. Toggle elev in the sidebar to compare primary lift.
                </p>
                <div className="f09-modal-foot">
                  <button type="button" className="f09-btn">
                    Keep editing
                  </button>
                  <button type="button" className="f09-btn f09-btn-primary">
                    Complete
                  </button>
                </div>
              </div>
            </div>
          </section>

          <p className="f09-section-label">Fields &amp; selectors</p>
          <section className="f09-panel">
            <div className="f09-field-grid">
              <div className="f09-field">
                <label htmlFor="f09-title">Text field</label>
                <input
                  id="f09-title"
                  className="f09-input"
                  defaultValue="Weekly reflection"
                />
              </div>
              <div className="f09-field">
                <label htmlFor="f09-lane">Select</label>
                <select id="f09-lane" className="f09-select" defaultValue="tech">
                  <option value="apps">application</option>
                  <option value="tech">technical</option>
                  <option value="other">other</option>
                </select>
              </div>
              <div className="f09-field">
                <label htmlFor="f09-date">Date</label>
                <input id="f09-date" className="f09-input" type="date" />
              </div>
            </div>
          </section>

          <p className="f09-section-label">
            Purple = domain tech · containers stay warm surface-2
          </p>
          <section className="f09-panel">
            <p className="f09-muted" style={{ marginBottom: "0.45rem" }}>
              Identity chips (score, streak, tech) may use purple. Panels and
              search/description washes use warm surface-2 — not purple. Urgency
              must not reuse purple (see Severity 5).
            </p>
            <div className="f09-purple-row" style={{ marginBottom: "0.55rem" }}>
              <span className="f09-purple-chip">rank A</span>
              <span className="f09-purple-chip">daily streak 4</span>
              <span className="f09-purple-chip">score 82</span>
              <span className="f09-job-badge f09-job-badge-interviewing">
                interviewing
              </span>
            </div>
            <div className="f09-purple-panel" style={{ marginBottom: "0.45rem" }}>
              Container / streak panel — warm surface-2 (not purple wash)
            </div>
            <div className="f09-desc-block">
              Description / link-posting result — warm surface-2
            </div>
          </section>

          <p className="f09-section-label">
            Job / application badges (map onto domain + severity)
          </p>
          <section className="f09-panel">
            <div className="f09-job-badges">
              <span className="f09-job-badge f09-job-badge-applied">applied</span>
              <span className="f09-job-badge f09-job-badge-interviewing">
                interviewing
              </span>
              <span className="f09-job-badge f09-job-badge-accepted">accepted</span>
              <span className="f09-job-badge f09-job-badge-declined">declined</span>
              <span className="f09-job-badge f09-job-badge-score">score 82</span>
              <span className="f09-job-badge f09-job-badge-liked">liked</span>
              <span className="f09-kind f09-kind-interview">interview</span>
              <span className="f09-kind f09-kind-goal">goal</span>
            </div>
            <p className="f09-muted" style={{ marginTop: "0.55rem" }}>
              Status → domain/severity hues. Prefer few named tokens over page-local
              hex.
            </p>
          </section>

          <p className="f09-section-label">Radius · type · hue map</p>
          <section className="f09-panel">
            <div className="f09-scale-row">
              {(
                [
                  ["panel", "var(--f09-radius-panel)", "2.4rem"],
                  ["control", "var(--f09-radius-control)", "2rem"],
                  ["seg", "var(--f09-radius-seg)", "1.75rem"],
                  ["pill", "var(--f09-radius-pill)", "1.5rem"],
                ] as const
              ).map(([name, radius, size]) => (
                <div key={name} className="f09-scale-swatch">
                  <i style={{ width: size, height: "1.35rem", borderRadius: radius }} />
                  {name}
                </div>
              ))}
            </div>
            <div className="f09-type-scale" style={{ marginBottom: "0.65rem" }}>
              <span className="f09-type-brand" style={{ fontSize: "1.15rem" }}>
                Brand / display · 1.15rem
              </span>
              <span className="f09-type-title" style={{ fontSize: "0.95rem" }}>
                Title · 0.95rem
              </span>
              <span className="f09-type-body">Body · 0.9rem</span>
              <span className="f09-muted" style={{ fontSize: "0.82rem" }}>
                Muted · 0.82rem
              </span>
              <span className="f09-type-badge">Badge / mono · 0.7rem</span>
            </div>
            <div className="f09-hue-map">
              {(
                [
                  ["ink", "var(--f09-ink, var(--f09-chrome))"],
                  ["brand", "var(--f09-brand)"],
                  ["apps", "var(--f09-domain-apps)"],
                  ["tech", "var(--f09-domain-tech)"],
                  ["reward", "var(--f09-domain-reward)"],
                  ["P0", "var(--f09-p0)"],
                  ["P1", "var(--f09-p1)"],
                  ["P2", "var(--f09-p2)"],
                  ["ok", "var(--f09-ok)"],
                ] as const
              ).map(([name, color]) => (
                <span key={name}>
                  <i style={{ background: color }} />
                  {name}
                </span>
              ))}
            </div>
          </section>

          <p className="f09-section-label">
            Width stress · tabs + chips + dual column (shell {shell}px)
          </p>
          <section className="f09-panel">
            <p className="f09-muted" style={{ marginBottom: "0.55rem" }}>
              Carded is the visual default. How nested tab content (This week /
              Past / Lifetime, ledger filters) should be represented is{" "}
              <strong>M1 scope</strong> — not solved by containment alone.
            </p>
            <div className="f09-stress-tabs">
              {["ranked", "mismatches", "unranked", "needs description"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`f09-tab${tab === t ? " is-active" : ""}`}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
              <button type="button" className="f09-btn f09-btn-sm">
                Refresh
              </button>
            </div>
            <div className="f09-chips-row">
              {["all", "Bay Area", "Remote US", "NYC", "Seattle", "Austin"].map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`f09-loc${loc === l ? " is-active" : ""}`}
                  onClick={() => setLoc(l)}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="f09-columns">
              <div>
                <p className="f09-muted" style={{ marginBottom: "0.4rem" }}>
                  Day panel · compose row (nowrap)
                </p>
                <div className="f09-compose-row">
                  {["application", "technical", "other"].map((lane, i) => (
                    <span key={lane} className={`f09-lane${i === 0 ? " is-on" : ""}`}>
                      {lane}
                    </span>
                  ))}
                  <button type="button" className="f09-btn f09-btn-primary f09-btn-sm">
                    Add reflection
                  </button>
                </div>
              </div>
              <div>
                <p className="f09-muted" style={{ marginBottom: "0.4rem" }}>
                  Completions · shortened labels
                </p>
                <div className="f09-ledger-tabs">
                  {["all", "tasks", "apps", "interviews", "notes", "LC"].map((t, i) => (
                    <span key={t} className={i === 0 ? "is-on" : undefined}>
                      {t}
                    </span>
                  ))}
                </div>
                <p className="f09-body">
                  Flip shell width in the sidebar; notice whether chips/tabs stay
                  one line or scroll.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <PrototypeSwitcher
        variants={VIBES.map((v) => ({ key: v.key, name: v.name }))}
        surfaceLabel="F09 vibe"
      />
    </div>
  );
}
