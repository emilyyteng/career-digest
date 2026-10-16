/**
 * Shared frame for F11 M0 prototypes. Hub: `/prototype/f11/habits`.
 */
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PrototypeSwitcher, { type PrototypeVariantMeta } from "../PrototypeSwitcher";
import { Button } from "../../ui";
import "../m1/prototype-m1.css";
import "./prototype-f11.css";

export const HUB_PATH = "/prototype/f11/habits";

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
    <div className="f11-param" role="group" aria-label={label}>
      <span className="f11-param-label">{label}</span>
      {options.map((o) => (
        <Button
          key={o.key}
          size="sm"
          variant="ghost"
          className={current === o.key ? "f11-param-btn is-active" : "f11-param-btn"}
          aria-pressed={current === o.key}
          onClick={() => {
            const next = new URLSearchParams(params);
            next.set(name, o.key);
            setParams(next, { replace: true });
          }}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

export default function F11Shell({
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
    <section className="f11-proto proto-page proto-page-wide">
      <p className="prototype-banner">
        <strong>Experimental prototype</strong> · F11 M0-01 · mock data only.{" "}
        <Link to={HUB_PATH}>← F11 habits hub</Link> · ← / → flips variants.
      </p>
      <header className="f11-page-head">
        <h2>{title}</h2>
        <p className="muted f11-question">{question}</p>
      </header>
      {controls && <div className="f11-controls">{controls}</div>}
      {children}
      {notes && <aside className="f11-notes">{notes}</aside>}
      <PrototypeSwitcher variants={[...variants]} surfaceLabel={surfaceLabel} />
    </section>
  );
}
