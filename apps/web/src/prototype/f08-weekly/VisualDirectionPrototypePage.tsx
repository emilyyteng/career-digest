/**
 * F08 M5-06 · F09 Q1–Q5 test case: visual direction for the weekly surfaces.
 * Q1 primary button style and accent, Q2 elevation, Q3 button sizes, Q4 keep
 * or revise the pastel tokens, Q5 which conflicting patterns win.
 * Every direction uses existing `:root` tokens only. The same direction can be
 * applied to the other F08 weekly prototypes with `?dir=a|b|c`.
 */
import { Link } from "react-router-dom";
import F08Shell, { btn, DIRECTIONS, HUB_PATH, useVariant } from "./F08Shell";
import { LAST_WEEK_LABEL, LC_LABEL_SAMPLE, LC_TARGET } from "./fixtures";
import { GoalBar, PaceText, TierStepper } from "./parts";

const VARIANTS = DIRECTIONS.map((d) => ({ key: d.key.toUpperCase(), name: d.name }));

const DIRECTION_NOTES: Record<string, { q1: string; q2: string; q3: string; q4: string }> = {
  a: {
    q1: "Filled blue-deep primary (today's global button default).",
    q2: "Shadows on buttons and cards (--shadow-button, --shadow-soft).",
    q3: "Two sizes: sm for in-card actions, md for page and modal actions.",
    q4: "Palette unchanged.",
  },
  b: {
    q1: "Tinted purple primary: a pastel fill with deep text; no solid blocks.",
    q2: "Flat: borders only, no shadows anywhere (--shadow-minimal).",
    q3: "Two sizes, same as A; softer 14px corners (--radius-soft-box).",
    q4: "Palette kept; purple becomes the action accent and blue drops back to links.",
  },
  c: {
    q1: "Ink primary (--text fill); pink-deep only for active and selected states.",
    q2: "Cards get a subtle shadow; buttons are flat.",
    q3: "Two sizes, same as A; pill corners.",
    q4: "Palette kept; pink, the brand pastel, carries state; other pastels stay for data (bars, lanes).",
  },
};

const SWATCHES = [
  "--accent-pink",
  "--accent-pink-deep",
  "--accent-blue",
  "--accent-blue-deep",
  "--accent-purple",
  "--accent-purple-deep",
  "--accent-mint",
  "--accent-mint-deep",
  "--accent-yellow",
  "--accent-yellow-deep",
  "--danger",
  "--surface",
  "--surface-2",
  "--border",
  "--text-muted",
];

const CONFLICTS: Array<{ area: string; found: string; proposed: string }> = [
  {
    area: "Buttons",
    found:
      "Global `button` default (filled blue + shadow) with a 22-class `:not(...)` opt-out chain; `button.secondary`; `.modal-confirm-btn`; `.interview-cta-btn`. 51 of 81 `box-shadow` rules in styles.css are `none` (7 with !important), mostly undoing the default. New variants must sit on `.secondary` to escape the chain, as these prototypes do.",
    proposed: "One `.btn` with kind (primary, secondary, ghost) and size (sm, md); delete the chain.",
  },
  {
    area: "Tabs and toggles",
    found:
      "`.tabs` / `.tab.on`, `.ledger-subtab.on`, `.home-upcoming-range-btn.is-active` (secondary buttons as a toggle), `.progress-lane-chip`.",
    proposed: "One segmented control (`is-active` + aria-pressed) for toggles, and one tab style for page tabs.",
  },
  {
    area: "Badges and chips",
    found: "`.ledger-kind`, `PriorityBadge`, lane chips, and feature `*-badge` classes (`.badge` appears on 13 lines of styles.css).",
    proposed: "One Badge with a tone prop; PriorityBadge keeps its own colors as a tone set.",
  },
  {
    area: "Banners",
    found: "`EarnFlash` (mint), `.demo-banner`, `.prototype-banner`, inline `.error` paragraphs.",
    proposed: "One Banner with tones (success, info, warn, error) and a one-time variant for R5.18.",
  },
  {
    area: "Card elevation",
    found: "`.card` uses a raw `0 1px 2px` shadow plus a hover shadow; `--shadow-soft` is used 7 times; `--shadow-minimal` 0 times.",
    proposed: "Decided by Q2; whichever wins becomes the only card shadow token.",
  },
];

export default function VisualDirectionPrototypePage() {
  const variant = useVariant(VARIANTS);
  const dir = variant.toLowerCase();
  const notes = DIRECTION_NOTES[dir]!;

  return (
    <F08Shell
      title="F09 visual direction · weekly surfaces"
      question="F09 Q1–Q5: primary button and accent, elevation, button sizes, palette, and which conflicting patterns win."
      variants={VARIANTS}
      surfaceLabel="F09 direction"
      fixedDir={dir}
      notes={
        <p>
          Apply this direction to the real prototypes:{" "}
          {[
            ["lc-stepper", "LC stepper"],
            ["progress-block", "Weekly block"],
            ["home-targets", "Home targets"],
            ["congrats", "Congrats"],
            ["weekly-record", "Weekly record"],
          ].map(([path, label], i) => (
            <span key={path}>
              {i > 0 ? " · " : ""}
              <Link to={`${HUB_PATH}/${path}?dir=${dir}`}>{label}</Link>
            </span>
          ))}
          . All three directions use existing tokens only. Every recommendation here is Proposed.
        </p>
      }
    >
      <div className="f08-specimen-grid">
        <section className="card f08-card">
          <h3 className="home-section-title">Q1 + Q3 · Buttons</h3>
          <p className="muted f08-hint">{notes.q1}</p>
          <p className="muted f08-hint">{notes.q3}</p>
          {(["md", "sm"] as const).map((size) => (
            <div key={size} className="f08-btn-row">
              <span className="f08-param-label">{size}</span>
              <button type="button" className={btn("primary", size)}>
                Save
              </button>
              <button type="button" className={btn("secondary", size)}>
                Cancel
              </button>
              <button type="button" className={btn("ghost", size)}>
                Edit label
              </button>
              <button type="button" className={btn("primary", size)} disabled>
                Disabled
              </button>
            </div>
          ))}
        </section>

        <section className="card f08-card">
          <h3 className="home-section-title">Q2 · Elevation</h3>
          <p className="muted f08-hint">{notes.q2}</p>
          <div className="f08-elev-row">
            <div className="f08-elev-sample f08-card">Card</div>
            <div className="f08-elev-sample f08-elev-raised">Dialog surface</div>
          </div>
        </section>

        <section className="card f08-card">
          <h3 className="home-section-title">In context</h3>
          <div className="weekly-goal-row">
            <div className="weekly-goal-row-head">
              <strong className="weekly-goal-title">Weekly LC goal · {LC_LABEL_SAMPLE}</strong>
              <span className="weekly-goal-fraction muted">7/{LC_TARGET}</span>
              <PaceText done={7} total={LC_TARGET} />
            </div>
            <GoalBar done={7} total={LC_TARGET} />
          </div>
          <div className="f08-tier-list">
            <TierStepper tier="medium" count={2} onAdd={() => {}} onRemove={() => {}} />
          </div>
          <div className="f08-segmented" role="group" aria-label="Sample toggle">
            <button type="button" className={btn("ghost", "sm", "is-active")} aria-pressed>
              Weekly
            </button>
            <button type="button" className={btn("ghost", "sm")} aria-pressed={false}>
              Misc
            </button>
          </div>
          <p className="f08-congrats f08-congrats-strip">
            <span>
              <strong>Last week&apos;s targets met</strong> · {LAST_WEEK_LABEL} · LC 12/10 <strong>+340</strong>
            </span>
          </p>
        </section>

        <section className="card f08-card">
          <h3 className="home-section-title">Q4 · Palette</h3>
          <p className="muted f08-hint">{notes.q4}</p>
          <div className="f08-swatches">
            {SWATCHES.map((token) => (
              <span key={token} className="f08-swatch">
                <span className="f08-swatch-chip" style={{ background: `var(${token})` }} />
                <code>{token}</code>
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="card f08-card">
        <h3 className="home-section-title">Q5 · Conflicting patterns (audit, Proposed standards)</h3>
        <table className="f08-audit">
          <thead>
            <tr>
              <th>Area</th>
              <th>Competing patterns found</th>
              <th>Proposed standard</th>
            </tr>
          </thead>
          <tbody>
            {CONFLICTS.map((c) => (
              <tr key={c.area}>
                <td>{c.area}</td>
                <td>{c.found}</td>
                <td>{c.proposed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </F08Shell>
  );
}
