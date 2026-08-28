import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

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

function closestAnchor(node: Node | null, root: HTMLElement): HTMLAnchorElement | null {
  let current: Node | null = node;
  while (current && current !== root) {
    if (current instanceof HTMLAnchorElement) return current;
    current = current.parentNode;
  }
  return null;
}

type LinkBubble = {
  href: string;
  top: number;
  left: number;
  anchor: HTMLAnchorElement;
};

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
  const wrapRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);
  const [linkBubble, setLinkBubble] = useState<LinkBubble | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Sync from props on mount and when the value changes externally (e.g. after reload).
    if (document.activeElement === el && lastEmitted.current !== null) return;
    if (el.innerHTML === (value || "") && lastEmitted.current === value) return;
    el.innerHTML = value || "";
    lastEmitted.current = value;
    setLinkBubble(null);
  }, [value]);

  useEffect(() => {
    function onDocMouseDown(event: globalThis.MouseEvent) {
      const target = event.target as Node;
      if (bubbleRef.current?.contains(target)) return;
      if (ref.current?.contains(target) && closestAnchor(target, ref.current)) return;
      setLinkBubble(null);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  function emit() {
    const html = ref.current?.innerHTML ?? "";
    lastEmitted.current = html;
    onChange(html);
  }

  function positionBubble(anchor: HTMLAnchorElement) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    const href = anchor.getAttribute("href")?.trim() || "";
    if (!href) {
      setLinkBubble(null);
      return;
    }
    setLinkBubble({
      href,
      top: rect.top - wrapRect.top - 8,
      left: rect.left - wrapRect.left + rect.width / 2,
      anchor,
    });
  }

  function showBubbleForSelection() {
    const editor = ref.current;
    if (!editor) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setLinkBubble(null);
      return;
    }
    const node = selection.focusNode ?? selection.anchorNode;
    if (!node || !editor.contains(node)) {
      setLinkBubble(null);
      return;
    }
    const anchor = closestAnchor(node, editor);
    if (!anchor) {
      setLinkBubble(null);
      return;
    }
    positionBubble(anchor);
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
    requestAnimationFrame(showBubbleForSelection);
  }

  function editLink() {
    if (!linkBubble) return;
    const next = window.prompt("Link URL", linkBubble.href);
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed) {
      removeLink();
      return;
    }
    linkBubble.anchor.setAttribute("href", trimmed);
    linkBubble.anchor.setAttribute("target", "_blank");
    linkBubble.anchor.setAttribute("rel", "noopener noreferrer");
    emit();
    positionBubble(linkBubble.anchor);
  }

  function removeLink() {
    if (!linkBubble) return;
    const anchor = linkBubble.anchor;
    const parent = anchor.parentNode;
    if (!parent) return;
    while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
    parent.removeChild(anchor);
    setLinkBubble(null);
    emit();
  }

  function onEditorMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    const editor = ref.current;
    if (!editor) return;
    const anchor = closestAnchor(event.target as Node, editor);
    if (!anchor) {
      setLinkBubble(null);
      return;
    }
    // Keep caret/selection behavior, but don't navigate away while editing.
    event.preventDefault();
    const range = document.createRange();
    range.selectNodeContents(anchor);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    editor.focus();
    positionBubble(anchor);
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
      <div className="rich-text-editor-wrap" ref={wrapRef}>
        {empty && placeholder && (
          <span className="rich-text-placeholder" aria-hidden="true">
            {placeholder}
          </span>
        )}
        {linkBubble && (
          <div
            ref={bubbleRef}
            className="rich-text-link-bubble"
            style={{ top: linkBubble.top, left: linkBubble.left }}
            role="dialog"
            aria-label="Link"
          >
            <a
              className="rich-text-link-url"
              href={linkBubble.href}
              target="_blank"
              rel="noopener noreferrer"
              title={linkBubble.href}
            >
              {linkBubble.href}
            </a>
            <div className="rich-text-link-actions">
              <button type="button" className="secondary" onClick={editLink}>
                Edit
              </button>
              <button type="button" className="secondary" onClick={removeLink}>
                Remove
              </button>
            </div>
          </div>
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
          onMouseDown={onEditorMouseDown}
          onKeyUp={showBubbleForSelection}
          onMouseUp={showBubbleForSelection}
        />
      </div>
    </div>
  );
}
