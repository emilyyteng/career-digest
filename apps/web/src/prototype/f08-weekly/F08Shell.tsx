/**
 * Shared frame for the F08 M5-06 prototypes: experimental banner, scenario
 * toggles, the F09 visual-direction picker (`?dir=`) and the variant switcher.
 */
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PrototypeSwitcher, { type PrototypeVariantMeta } from "../PrototypeSwitcher";
import "../m4/prototype-m4.css";
import "./prototype-f08-weekly.css";

export const HUB_PATH = "/prototype/f08/weekly";

export const DIRECTIONS = [
  { key: "a", name: "Current · filled blue, shadows" },
  { key: "b", name: "Tinted flat · purple" },
  { key: "c", name: "Ink · pink accent" },
] as const;

export type BtnKind = "primary" | "secondary" | "ghost";
export type BtnSize = "sm" | "md";

/** Prototype button variants sit on `.secondary` so the global `button:not(...)` chain doesn't apply. */
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

export default function F08Shell({
  title,
  question,
  variants,
  surfaceLabel,
  controls,
  notes,
  fixedDir,
  children,
}: {
  title: string;
  question: string;
  variants: readonly PrototypeVariantMeta[];
  surfaceLabel: string;
  controls?: ReactNode;
  notes?: ReactNode;
  /** Set by the visual-direction page, where the switcher picks the direction. */
  fixedDir?: string;
  children: ReactNode;
}) {
  const paramDir = useParam("dir", DIRECTIONS.map((d) => d.key));
  const dir = fixedDir ?? paramDir;
  return (
    <section className="f08-proto f08-page" data-dir={dir}>
      <p className="prototype-banner">
        <strong>Experimental prototype</strong> · mock data only · M5-06.{" "}
        <Link to={HUB_PATH}>← F08 weekly hub</Link> · ← / → flips variants.
      </p>
      <header className="f08-page-head">
        <h2>{title}</h2>
        <p className="muted f08-question">{question}</p>
      </header>
      <div className="f08-controls">
        {controls}
        {!fixedDir && (
          <ParamToggle
            name="dir"
            label="Visual direction (F09)"
            options={DIRECTIONS.map((d) => ({ key: d.key, label: d.key.toUpperCase() }))}
          />
        )}
      </div>
      {children}
      {notes && <aside className="f08-notes">{notes}</aside>}
      <PrototypeSwitcher variants={[...variants]} surfaceLabel={surfaceLabel} />
    </section>
  );
}
