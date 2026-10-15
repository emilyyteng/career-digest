/**
 * F09 M0-02 · Exploratory design lab.
 *
 * Design questions: Q17 brand, Q12 vibe, Q14 fonts (style↔readability),
 * Q18/Q4/Q1/Q13 color-meaning + palette, Q2 containment/elevation,
 * Q3/Q5 control looks, Q16 shell-width stress samples.
 *
 * Full-viewport sandbox with sidebar controls (not production shell).
 * Orthogonal URL params: ?variant=V1…V7&brand=&font=&color=&contain=&shell=
 */
import { useEffect, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PrototypeSwitcher from "../PrototypeSwitcher";
import {
  BRANDS,
  COLORS,
  CONTAINS,
  FONTS,
  HUB_PATH,
  SHELLS,
  VIBES,
  type BrandKey,
  type ColorKey,
  type ContainKey,
  type FontKey,
  type ShellKey,
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
  const containMeta = CONTAINS.find((c) => c.key === contain) ?? CONTAINS[0];

  const [seg, setSeg] = useState<"weekly" | "misc">("weekly");
  const [tab, setTab] = useState("ranked");
  const [loc, setLoc] = useState("all");

  return (
    <div
      className="f09-lab"
      data-vibe={vibe}
      data-font={fontKey}
      data-color={color}
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
            <h1 className="f09-brand-mark">{brandMeta.mark} 🌸</h1>
            <nav className="f09-nav" aria-label="Sample app nav">
              {["Home", "Jobs", "Tasks", "Progress", "Rewards"].map((label, i) => (
                <span key={label} className={i === 3 ? "is-on" : undefined}>
                  {label}
                </span>
              ))}
            </nav>
          </header>

          <div className="f09-subnav" aria-label="Sample feature subnav">
            {["This week", "Past work", "Lifetime"].map((label, i) => (
              <span key={label} className={i === 0 ? "is-on" : undefined}>
                {label}
              </span>
            ))}
          </div>

          <p className="f09-section-label">Composition sample</p>
          <div className="f09-grid-2">
            <section className="f09-panel">
              <h2 className="f09-panel-title">This week</h2>
              <p className="f09-body">
                Log a LeetCode solve and keep weekly goals in view. Body text uses
                the readable stack; judge whether chrome still feels like the brand
                thesis.
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
            Color meaning (priority · urgency · heat · success)
          </p>
          <section className="f09-panel">
            <div className="f09-meaning">
              <div>
                <p className="f09-muted" style={{ marginBottom: "0.35rem" }}>
                  Priority
                </p>
                <div className="f09-meaning-row">
                  <span className="f09-pill f09-pill-p0">P0</span>
                  <span className="f09-pill f09-pill-p1">P1</span>
                  <span className="f09-pill f09-pill-p2">P2</span>
                </div>
              </div>
              <div>
                <p className="f09-muted" style={{ marginBottom: "0.35rem" }}>
                  Deadline urgency
                </p>
                <div className="f09-meaning-row">
                  <span className="f09-urgency f09-urgency-overdue" title="overdue" />
                  <span className="f09-muted">overdue</span>
                  <span className="f09-urgency f09-urgency-soon" title="soon" />
                  <span className="f09-muted">soon</span>
                  <span className="f09-urgency f09-urgency-ok" title="ok" />
                  <span className="f09-muted">ok</span>
                </div>
              </div>
              <div>
                <p className="f09-muted" style={{ marginBottom: "0.35rem" }}>
                  Heatmap intensity (empty → peak)
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
                  Sample dialog anatomy — header, body, footer actions.
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

          <p className="f09-section-label">
            Width stress · tabs + chips + dual column (shell {shell}px)
          </p>
          <section className="f09-panel">
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
