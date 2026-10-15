/**
 * Shared frame for F08 M8-01 Progress hub prototypes.
 * Ticket: M8-01. Nested Progress subnav mock + variant switcher.
 */
import type { ReactNode } from "react";
import { Link, NavLink, useSearchParams } from "react-router-dom";
import PrototypeSwitcher, { type PrototypeVariantMeta } from "../PrototypeSwitcher";
import "../m4/prototype-m4.css";
import "../f08-weekly/prototype-f08-weekly.css";
import "./prototype-f08-progress.css";

export const HUB_PATH = "/prototype/f08/progress";

export type BtnKind = "primary" | "secondary" | "ghost";
export type BtnSize = "sm" | "md";

export function btn(kind: BtnKind = "secondary", size: BtnSize = "sm", extra = ""): string {
  return `secondary f08-btn f08-btn-${kind} f08-btn-${size}${extra ? ` ${extra}` : ""}`;
}

export function useVariant(variants: readonly PrototypeVariantMeta[]): string {
  const [params] = useSearchParams();
  const key = params.get("variant");
  return variants.some((v) => v.key === key) ? key! : variants[0]!.key;
}

export function useParam<T extends string>(name: string, options: readonly T[]): T {
  const [params] = useSearchParams();
  const value = params.get(name) as T | null;
  return value && options.includes(value) ? value : options[0]!;
}

export function ParamToggle({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: ReadonlyArray<{ key: string; label: string }>;
}) {
  const [params, setParams] = useSearchParams();
  const current = params.get(name) ?? options[0]!.key;
  return (
    <div className="f08-param" role="group" aria-label={label}>
      <span className="f08-param-label">{label}</span>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={btn("ghost", "sm", current === o.key ? "is-active" : "")}
          aria-pressed={current === o.key}
          onClick={() => {
            const next = new URLSearchParams(params);
            next.set(name, o.key);
            setParams(next, { replace: true });
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const SUBNAV = [
  { to: `${HUB_PATH}/this-week`, label: "This week", end: false },
  { to: `${HUB_PATH}/past-work`, label: "Past work", end: false },
  { to: `${HUB_PATH}/lifetime`, label: "Lifetime", end: false },
] as const;

export default function ProgressShell({
  title,
  question,
  variants,
  surfaceLabel,
  controls,
  notes,
  children,
}: {
  title: string;
  question: string;
  variants: readonly PrototypeVariantMeta[];
  surfaceLabel: string;
  controls?: ReactNode;
  notes?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="f08-proto f08-page f08p-page">
      <p className="prototype-banner">
        <strong>Experimental prototype</strong> · F08 M8-01 · mock data only.{" "}
        <Link to={HUB_PATH}>← Progress hub</Link> · ← / → flips variants.
      </p>
      <div className="f08p-subnav" role="navigation" aria-label="Progress (prototype)">
        {SUBNAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? "f08p-subnav-link is-active" : "f08p-subnav-link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
      <header className="f08-page-head">
        <h2>{title}</h2>
        <p className="muted f08-question">{question}</p>
      </header>
      {controls && <div className="f08-controls">{controls}</div>}
      {children}
      {notes && <aside className="f08-notes">{notes}</aside>}
      <PrototypeSwitcher variants={[...variants]} surfaceLabel={surfaceLabel} />
    </section>
  );
}
