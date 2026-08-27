import { useEffect, useRef, type ClipboardEvent, type ReactNode } from "react";

/** Strip dangerous bits from pasted HTML before insert; server re-sanitizes on save. */
function lightSanitize(html: string): string {
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, "text/html");
  const root = doc.getElementById("root");
  if (!root) return "";

  root.querySelectorAll("script, style, iframe, object, embed, form, input, button").forEach((el) => {
    el.remove();
  });
  root.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "srcset") el.removeAttribute(attr.name);
    }
    if (el.tagName.toLowerCase() === "a") {
      const href = el.getAttribute("href") ?? "";
      if (/^\s*javascript:/i.test(href)) el.removeAttribute("href");
      else {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    }
  });
  return root.innerHTML;
}

export function isEmptyRichHtml(html: string | null | undefined): boolean {
  if (!html?.trim()) return true;
  const text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  "aria-label"?: string;
  toolbarExtra?: ReactNode;
};

export default function RichTextField({
  value,
  onChange,
  placeholder,
  minHeight = "10rem",
  "aria-label": ariaLabel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Sync from props on mount and when the value changes externally (e.g. after reload).
    if (document.activeElement === el && lastEmitted.current !== null) return;
    if (el.innerHTML === (value || "") && lastEmitted.current === value) return;
    el.innerHTML = value || "";
    lastEmitted.current = value;
  }, [value]);

  function emit() {
    const html = ref.current?.innerHTML ?? "";
    lastEmitted.current = html;
    onChange(html);
  }

  function run(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  }

  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    if (html.trim()) {
      document.execCommand("insertHTML", false, lightSanitize(html));
    } else if (text) {
      document.execCommand("insertText", false, text);
    }
    emit();
  }

  function addLink() {
    const existing = document.getSelection()?.toString() ? "" : "https://";
    const url = window.prompt("Link URL", existing || "https://");
    if (!url?.trim()) return;
    run("createLink", url.trim());
  }

  const empty = isEmptyRichHtml(value);

  return (
    <div className="rich-text">
      <div className="rich-text-toolbar" role="toolbar" aria-label="Formatting">
        <button type="button" className="secondary" onClick={() => run("bold")} title="Bold">
          Bold
        </button>
        <button type="button" className="secondary" onClick={() => run("italic")} title="Italic">
          Italic
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => run("underline")}
          title="Underline"
        >
          Underline
        </button>
        <button type="button" className="secondary" onClick={addLink} title="Link">
          Link
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => run("insertUnorderedList")}
          title="Bullet list"
        >
          List
        </button>
      </div>
      <div className="rich-text-editor-wrap">
        {empty && placeholder && (
          <span className="rich-text-placeholder" aria-hidden="true">
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          className="rich-text-editor"
          style={{ minHeight }}
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel ?? "Job description"}
          suppressContentEditableWarning
          onInput={emit}
          onPaste={onPaste}
          onBlur={emit}
        />
      </div>
    </div>
  );
}
