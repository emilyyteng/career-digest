import { useEffect, useId, useRef, useState } from "react";
import { getApplicationLocations } from "./api";

type Props = {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function LocationSuggest({
  name = "location",
  value,
  onChange,
  placeholder = "Location",
}: Props) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const blurTimer = useRef<number | null>(null);

  useEffect(() => {
    const q = value.trim();
    const timer = window.setTimeout(() => {
      getApplicationLocations(q)
        .then((data) => {
          const next = data.locations.filter(
            (loc) => loc.toLowerCase() !== q.toLowerCase(),
          );
          setSuggestions(next);
          setActive(-1);
        })
        .catch(() => setSuggestions([]));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    return () => {
      if (blurTimer.current) window.clearTimeout(blurTimer.current);
    };
  }, []);

  function pick(loc: string) {
    onChange(loc);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div className="suggest" ref={wrapRef}>
      <input
        name={name}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open && suggestions.length > 0}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(event) => {
          if (!open || suggestions.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((i) => (i + 1) % suggestions.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
          } else if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            pick(suggestions[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && suggestions.length > 0 && (
        <ul id={listId} className="suggest-list" role="listbox">
          {suggestions.map((loc, index) => (
            <li key={loc} role="option" aria-selected={index === active}>
              <button
                type="button"
                className={index === active ? "suggest-option on" : "suggest-option"}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(loc)}
              >
                {loc}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
