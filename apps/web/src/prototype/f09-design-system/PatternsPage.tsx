/**
 * F09 M1-09 + M1-10 + M1-11 · Parallel pattern exploration.
 *
 * Surfaces (PrototypeSwitcher ?variant=):
 *   A — List pagination (Q8 / R.7)
 *   B — EarnFlash placement (Q10 / R.9)
 *   C — Compact long pages (Q11 / R.10)
 *
 * Per-surface approach axis: ?page= · ?flash= · ?compact=
 * Recommendations are labeled in the rule card; lock after judgment.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, ChromeTab } from "../../ui";
import PrototypeSwitcher from "../PrototypeSwitcher";
import "./patterns.css";

const SURFACES = [
  { key: "A", name: "M1-09 · List pagination" },
  { key: "B", name: "M1-10 · EarnFlash placement" },
  { key: "C", name: "M1-11 · Compact long pages" },
] as const;

const PAGE_OPTS = [
  { key: "pager", name: "Rec · bottom pager (25)" },
  { key: "both", name: "Top + bottom pager" },
  { key: "more", name: "Load more (reject default)" },
  { key: "window", name: "Calendar window (special)" },
] as const;

const FLASH_OPTS = [
  { key: "near", name: "Rec · near control" },
  { key: "toast", name: "Viewport toast" },
  { key: "scroll", name: "Scroll-to top flash" },
  { key: "top", name: "Current · page top only" },
] as const;

const COMPACT_OPTS = [
  { key: "rec", name: "Rec · chips + clamp + pager" },
  { key: "chips", name: "Chips only (no pager)" },
  { key: "dense", name: "Denser rows, all open" },
  { key: "current", name: "Current · stacked clamps" },
] as const;

type PageKey = (typeof PAGE_OPTS)[number]["key"];
type FlashKey = (typeof FLASH_OPTS)[number]["key"];
type CompactKey = (typeof COMPACT_OPTS)[number]["key"];

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
    <div className="f09p-param" role="group" aria-label={label}>
      <span className="f09p-param-label">{label}</span>
      <div className="f09p-param-options">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            className={`f09p-chip${current === o.key ? " is-active" : ""}`}
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
    <aside className="f09p-rule card">
      {surface === "A" && (
        <>
          <h2 className="f09p-rule-title">M1-09 · Recommendation</h2>
          <p className="f09p-prose">
            <strong>Default:</strong> classic <em>Prev / page / Next</em> under the
            list (or inside a clamped well), page size <strong>25</strong>. Optional
            duplicate pager above when the well is tall. Reject infinite scroll / “load
            more” as the system default.
          </p>
          <p className="f09p-prose">
            <strong>Special case:</strong> calendar-anchored time series (Past work
            completions) may use a <em>day / 7-day window</em> instead of numbered
            pages — document as Progress-only, not the general list rule.
          </p>
          <p className="f09p-prose muted">
            Migrate targets later: completions diary, Jobs lists if unpaginated,
            any long board inside a 28rem well (pairs with M1-07).
          </p>
          <ParamRow name="page" label="Approach" options={PAGE_OPTS} />
        </>
      )}
      {surface === "B" && (
        <>
          <h2 className="f09p-rule-title">M1-10 · Recommendation</h2>
          <p className="f09p-prose">
            <strong>EarnFlash:</strong> render <em>near the control that earned</em>{" "}
            (inline under the row / action cluster, or a small portal anchored to that
            control). Must be in the current viewport without scrolling the page to
            the top. Sticky viewport toast is an acceptable fallback when the action
            has no stable anchor (e.g. modal close).
          </p>
          <p className="f09p-prose">
            <strong>Reject as default:</strong> page-top-only flash; scroll-into-view
            that jerks the page.
          </p>
          <p className="f09p-prose">
            <strong>OneTimeNotice:</strong> does <em>not</em> share the near-control
            rule — it is event/result chrome and may stay at the host section top
            (still preferably in the first viewport of that section).
          </p>
          <ParamRow name="flash" label="Approach" options={FLASH_OPTS} />
        </>
      )}
      {surface === "C" && (
        <>
          <h2 className="f09p-rule-title">M1-11 · Recommendation</h2>
          <p className="f09p-prose">
            Ordered tactics for long scroll pages (Tasks first, M2 apply):
          </p>
          <ol className="f09p-olist">
            <li>
              <strong>Section chips → one well</strong> (locked M1-07; tab-scoped
              counts)
            </li>
            <li>
              <strong>Paginate inside the well</strong> (M1-09 defaults)
            </li>
            <li>
              <strong>28rem clamp</strong> on the primary list body (M1-07)
            </li>
            <li>
              Slightly tighter row density only after 1–3; no hero redesign in M1
            </li>
            <li>
              Sticky compose / primary write only if actions still fall below the
              first viewport after 1–4
            </li>
          </ol>
          <p className="f09p-prose muted">
            Do not re-open multi-select accordion stacks as the Tasks standard.
          </p>
          <ParamRow name="compact" label="Approach" options={COMPACT_OPTS} />
        </>
      )}
      <p className="muted f09p-note">
        <Link to="/prototype/f09/layout">M1-07/08 layout</Link>
        {" · "}
        lock per ticket after judgment
      </p>
    </aside>
  );
}

function MockRows({ n, dense }: { n: number; dense?: boolean }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={`f09p-row${dense ? " is-dense" : ""}`}>
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

function Pager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="f09p-pager" role="navigation" aria-label="Pagination">
      <button
        type="button"
        className="f09p-chip"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Prev
      </button>
      <span className="f09p-page-meta">
        {page} / {pages}
      </span>
      <button
        type="button"
        className="f09p-chip"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

/** A — pagination approaches */
function PaginationSurface({ page }: { page: PageKey }) {
  const [p, setP] = useState(1);
  const pageSize = 25;
  const total = 83;
  const pages = Math.ceil(total / pageSize);
  const start = (p - 1) * pageSize;
  const slice = Math.min(pageSize, total - start);

  useEffect(() => {
    setP(1);
  }, [page]);

  return (
    <section className="f09p-surface card">
      <header className="f09p-surface-head">
        <div>
          <p className="f09p-kicker">Stress · long list in a well</p>
          <h3 className="f09p-surface-title">Applications</h3>
        </div>
        <Badge tone="ok">{page}</Badge>
      </header>
      <div className="f09p-tabs ui-chrome-tabs">
        <ChromeTab size="page" active>
          Open
        </ChromeTab>
        <ChromeTab size="page">Completed</ChromeTab>
      </div>
      <div className="f09p-chips">
        <button type="button" className="f09p-chip is-active">
          Applications <span className="f09p-count">{total}</span>
        </button>
        <button type="button" className="f09p-chip">
          Technical <span className="f09p-count">12</span>
        </button>
      </div>

      {page === "window" ? (
        <>
          <p className="muted f09p-caption">
            Past work special case: 7 days ending on selected calendar day — not
            numbered pages.
          </p>
          <div className="f09p-window-bar">
            <span>7-day window</span>
            <span className="muted">Oct 9 – Oct 15</span>
          </div>
          <div className="f09p-well is-clamp">
            <MockRows n={18} />
          </div>
        </>
      ) : (
        <>
          {(page === "pager" || page === "both") && (
            <>
              {page === "both" && (
                <Pager page={p} pages={pages} onPage={setP} />
              )}
              <div className="f09p-well is-clamp">
                <MockRows n={slice} />
              </div>
              <Pager page={p} pages={pages} onPage={setP} />
              <p className="muted f09p-caption">
                {page === "pager"
                  ? "Recommended: bottom pager, size 25, inside/after the clamped well."
                  : "Top + bottom when the well is tall — optional, not required."}
              </p>
            </>
          )}
          {page === "more" && (
            <>
              <div className="f09p-well is-clamp">
                <MockRows n={40} />
              </div>
              <button type="button" className="f09p-chip f09p-load-more">
                Load more
              </button>
              <p className="muted f09p-caption">
                Reject as system default — no stable position, fights R.7.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}

function FlashBanner({
  className,
  onDismiss,
}: {
  className?: string;
  onDismiss: () => void;
}) {
  return (
    <p className={`f09p-flash${className ? ` ${className}` : ""}`} role="status">
      <span>+18 points · completed Follow up</span>
      <span className="f09p-flash-bal">balance 420</span>
      <button type="button" className="f09p-flash-x" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </p>
  );
}

/** B — EarnFlash placement */
function FlashSurface({ flash }: { flash: FlashKey }) {
  const [earn, setEarn] = useState(false);
  const [toast, setToast] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  function trigger() {
    setEarn(false);
    setToast(false);
    requestAnimationFrame(() => {
      if (flash === "toast") {
        setToast(true);
        return;
      }
      if (flash === "scroll") {
        setEarn(true);
        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      setEarn(true);
      if (flash === "near") {
        rowRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(false), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!earn) return;
    const id = window.setTimeout(() => setEarn(false), 3200);
    return () => window.clearTimeout(id);
  }, [earn]);

  return (
    <div className="f09p-flash-page">
      <section className="f09p-surface card" ref={topRef}>
        <header className="f09p-surface-head">
          <div>
            <p className="f09p-kicker">Host · scrolled page</p>
            <h3 className="f09p-surface-title">Tasks</h3>
          </div>
          <Badge tone="ok">{flash}</Badge>
        </header>
        {(flash === "top" || flash === "scroll") && earn && (
          <FlashBanner onDismiss={() => setEarn(false)} />
        )}
        <p className="muted f09p-caption">
          Scroll down and complete a row. Compare where the flash appears.
        </p>
        <div className="f09p-well is-tall">
          <MockRows n={8} />
          <div className="f09p-action-row" ref={rowRef}>
            <span>Follow up · Acme screen</span>
            <button type="button" className="f09p-chip is-active" onClick={trigger}>
              Complete
            </button>
          </div>
          {flash === "near" && earn && (
            <FlashBanner onDismiss={() => setEarn(false)} />
          )}
          <MockRows n={10} />
        </div>
      </section>
      {toast && (
        <div className="f09p-toast" role="status">
          <FlashBanner className="is-toast" onDismiss={() => setToast(false)} />
        </div>
      )}
      <p className="muted f09p-caption">
        OneTimeNotice (not shown): stays section-top — different job than EarnFlash.
      </p>
    </div>
  );
}

function CompactPanel({
  title,
  children,
  bodyClass,
}: {
  title: string;
  children: ReactNode;
  bodyClass?: string;
}) {
  return (
    <section className="f09p-panel card">
      <h4 className="f09p-panel-title">{title}</h4>
      <div className={`f09p-panel-body${bodyClass ? ` ${bodyClass}` : ""}`}>
        {children}
      </div>
    </section>
  );
}

/** C — compact long-page tactics */
function CompactSurface({ compact }: { compact: CompactKey }) {
  const [cat, setCat] = useState("apps");
  const cats = [
    { id: "apps", name: "Applications", n: 28 },
    { id: "tech", name: "Technical", n: 12 },
    { id: "other", name: "Other", n: 9 },
  ] as const;
  const active = cats.find((c) => c.id === cat) ?? cats[0]!;
  const [p, setP] = useState(1);
  const pageSize = 25;
  const pages = Math.max(1, Math.ceil(active.n / pageSize));
  const shown =
    compact === "rec" ? Math.min(pageSize, active.n - (p - 1) * pageSize) : active.n;

  useEffect(() => {
    setP(1);
  }, [cat, compact]);

  return (
    <section className="f09p-surface card">
      <header className="f09p-surface-head">
        <div>
          <p className="f09p-kicker">Tasks · compaction tactics</p>
          <h3 className="f09p-surface-title">Tasks</h3>
        </div>
        <Badge tone="ok">{compact}</Badge>
      </header>
      <div className="f09p-tabs ui-chrome-tabs">
        <ChromeTab size="page" active>
          Open
        </ChromeTab>
        <ChromeTab size="page">Completed</ChromeTab>
      </div>

      {compact === "current" && (
        <>
          {cats.map((c) => (
            <CompactPanel key={c.id} title={c.name} bodyClass="is-clamp">
              <MockRows n={Math.min(c.n, 14)} />
            </CompactPanel>
          ))}
          <p className="muted f09p-caption">
            Problem: three open clamps → long page even with internal scroll.
          </p>
        </>
      )}

      {compact === "dense" && (
        <>
          {cats.map((c) => (
            <CompactPanel key={c.id} title={c.name}>
              <MockRows n={c.n} dense />
            </CompactPanel>
          ))}
          <p className="muted f09p-caption">
            Density alone does not fix stack length — still three regions.
          </p>
        </>
      )}

      {(compact === "chips" || compact === "rec") && (
        <>
          <div className="f09p-chips" role="group" aria-label="Category">
            {cats.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`f09p-chip${cat === c.id ? " is-active" : ""}`}
                onClick={() => setCat(c.id)}
              >
                {c.name}
                <span className="f09p-count">{c.n}</span>
              </button>
            ))}
          </div>
          <CompactPanel
            title={active.name}
            bodyClass={compact === "rec" ? "is-clamp" : undefined}
          >
            <MockRows n={shown} />
          </CompactPanel>
          {compact === "rec" && (
            <Pager page={p} pages={pages} onPage={setP} />
          )}
          <p className="muted f09p-caption">
            {compact === "rec"
              ? "Recommended order: chips → one clamped well → pager (M1-07 + M1-09)."
              : "Chips alone help; still add clamp + pager for long categories."}
          </p>
        </>
      )}
    </section>
  );
}

export default function PatternsPage() {
  const [params, setParams] = useSearchParams();
  const variant = params.get("variant") ?? "A";
  const page = useAxis("page", PAGE_OPTS, "pager");
  const flash = useAxis("flash", FLASH_OPTS, "near");
  const compact = useAxis("compact", COMPACT_OPTS, "rec");

  useEffect(() => {
    const next = new URLSearchParams(params);
    let changed = false;
    for (const [k, v] of [
      ["variant", "A"],
      ["page", "pager"],
      ["flash", "near"],
      ["compact", "rec"],
    ] as const) {
      if (!next.has(k)) {
        next.set(k, v);
        changed = true;
      }
    }
    if (changed) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first-load seed
  }, []);

  return (
    <div className="f09p-page">
      <div className="f09p-banner" role="status">
        <strong>Experimental prototype</strong>
        {" · "}
        F09 M1-09 / M1-10 / M1-11. Flip surfaces A–C; each rule card states the
        recommendation. Lock per ticket after judgment.
      </div>
      <div className="f09p-layout">
        <RuleCard surface={variant} />
        <div className="f09p-preview">
          {variant === "A" && <PaginationSurface page={page} />}
          {variant === "B" && <FlashSurface flash={flash} />}
          {variant === "C" && <CompactSurface compact={compact} />}
        </div>
      </div>
      <PrototypeSwitcher variants={[...SURFACES]} surfaceLabel="M1-09/10/11 patterns" />
    </div>
  );
}
