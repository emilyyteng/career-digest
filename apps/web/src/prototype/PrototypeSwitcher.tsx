import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export type PrototypeVariantMeta = {
  key: string;
  name: string;
};

/**
 * Floating bottom bar for UI prototypes (dev only).
 * Cycles `?variant=` and supports ← / → when not typing in a field.
 */
export default function PrototypeSwitcher({
  variants,
  surfaceLabel,
}: {
  variants: PrototypeVariantMeta[];
  /** Optional second line, e.g. current surface name */
  surfaceLabel?: string;
}) {
  const [params, setParams] = useSearchParams();
  const keys = variants.map((v) => v.key);
  const currentKey = params.get("variant") ?? keys[0] ?? "A";
  const index = Math.max(0, keys.indexOf(currentKey));
  const current = variants[index] ?? variants[0];

  function go(delta: number) {
    if (keys.length === 0) return;
    const next = keys[(index + delta + keys.length) % keys.length]!;
    const nextParams = new URLSearchParams(params);
    nextParams.set("variant", next);
    setParams(nextParams, { replace: true });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      go(event.key === "ArrowRight" ? 1 : -1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!import.meta.env.DEV || !current) return null;

  return (
    <div className="prototype-switcher" role="toolbar" aria-label="Prototype variant">
      {surfaceLabel && <span className="prototype-switcher-surface">{surfaceLabel}</span>}
      <button type="button" className="prototype-switcher-btn" onClick={() => go(-1)} aria-label="Previous variant">
        ←
      </button>
      <span className="prototype-switcher-label">
        {current.key} · {current.name}
      </span>
      <button type="button" className="prototype-switcher-btn" onClick={() => go(1)} aria-label="Next variant">
        →
      </button>
    </div>
  );
}
