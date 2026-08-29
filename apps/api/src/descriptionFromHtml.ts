import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

const STRIP_TAGS = [
  "script",
  "style",
  "noscript",
  "template",
  "iframe",
  "object",
  "embed",
  "svg",
  "canvas",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "button",
  "input",
  "select",
  "textarea",
  "link",
  "meta",
].join(", ");

/** Tags kept in stored job descriptions (manual paste + scrape). */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "a",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "div",
  "span",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

const CONTENT_SELECTORS = [
  '[itemprop="description"]',
  ".job-description",
  "#job-description",
  ".jobDescription",
  ".job_description",
  ".posting-description",
  ".posting-page .content",
  ".opening .section-wrapper",
  "article",
  "main",
  '[role="main"]',
];

const MIN_TEXT_CHARS = 80;

function isElement(node: AnyNode): node is Element {
  return node.type === "tag";
}

function asJobTypes(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).toLowerCase());
  if (value == null) return [];
  return [String(value).toLowerCase()];
}

function jobPostingDescription(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  if (
    asJobTypes(obj["@type"]).includes("jobposting") &&
    typeof obj.description === "string" &&
    obj.description.trim().length >= MIN_TEXT_CHARS
  ) {
    return obj.description;
  }
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = jobPostingDescription(item);
        if (found) return found;
      }
    } else {
      const found = jobPostingDescription(value);
      if (found) return found;
    }
  }
  return null;
}

function jsonLdDescription($: cheerio.CheerioAPI): string | null {
  const blocks: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else if (parsed && typeof parsed === "object" && "@graph" in parsed) {
        const graph = (parsed as Record<string, unknown>)["@graph"];
        if (Array.isArray(graph)) blocks.push(...graph);
        else blocks.push(parsed);
      } else {
        blocks.push(parsed);
      }
    } catch {
      // Career sites often ship invalid JSON-LD; ignore and fall back to the DOM.
    }
  });
  for (const block of blocks) {
    const description = jobPostingDescription(block);
    if (description) return description;
  }
  return null;
}

function wrapPlainText(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${part.replaceAll("\n", "<br>")}</p>`);
  return paragraphs.join("") || `<p>${text}</p>`;
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function countLinks(html: string): number {
  return (html.match(/<a\b[^>]*\bhref\s*=/gi) ?? []).length;
}

function textLength(html: string): number {
  return cheerio.load(html).root().text().replace(/\s+/g, " ").trim().length;
}

function absolutizeHref(href: string, baseUrl: string | null | undefined): string | null {
  const trimmed = href.trim();
  if (!trimmed || /^\s*javascript:/i.test(trimmed)) return null;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (!baseUrl) {
    return trimmed.startsWith("#") ? trimmed : null;
  }
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * Allowlist sanitize for job-description HTML (manual paste + scrapes).
 * Preserves links (http/https/mailto/tel) and common formatting tags.
 */
export function sanitizeDescriptionHtml(
  html: string,
  baseUrl?: string | null,
): string {
  const fragment = cheerio.load(`<div id="cd-root">${html}</div>`, {
    xml: false,
  });
  const root = fragment("#cd-root");
  root.find(STRIP_TAGS).remove();

  root.find("*").each((_, el) => {
    if (!isElement(el)) return;
    const tag = el.tagName.toLowerCase();
    const node = fragment(el);

    if (!ALLOWED_TAGS.has(tag)) {
      node.replaceWith(node.contents());
      return;
    }

    for (const name of Object.keys(el.attribs)) {
      const lower = name.toLowerCase();
      if (lower === "href" || lower === "target" || lower === "rel" || lower === "title") {
        continue;
      }
      if (lower === "colspan" || lower === "rowspan") continue;
      node.removeAttr(name);
    }

    if (tag === "a") {
      const href = el.attribs.href;
      const absolute = href ? absolutizeHref(href, baseUrl) : null;
      if (!absolute) {
        node.replaceWith(node.contents());
        return;
      }
      node.attr("href", absolute);
      node.attr("target", "_blank");
      node.attr("rel", "noopener noreferrer");
    }
  });

  return root.html()?.trim() ?? "";
}

function richestNode($: cheerio.CheerioAPI): cheerio.Cheerio<AnyNode> | null {
  for (const selector of CONTENT_SELECTORS) {
    const node = $(selector).first();
    if (node.length && node.text().replace(/\s+/g, " ").trim().length >= MIN_TEXT_CHARS) {
      return node;
    }
  }
  const body = $("body");
  if (body.length && body.text().replace(/\s+/g, " ").trim().length >= MIN_TEXT_CHARS) {
    return body;
  }
  return null;
}

function pickRicher(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  const aLinks = countLinks(a);
  const bLinks = countLinks(b);
  if (aLinks !== bLinks) return aLinks > bLinks ? a : b;
  return textLength(a) >= textLength(b) ? a : b;
}

/** Pull a job-description fragment from a career-site HTML page. */
export function descriptionFromHtml(
  html: string,
  baseUrl?: string | null,
): string | null {
  const $ = cheerio.load(html);
  const fromLdRaw = jsonLdDescription($);

  let fromLd: string | null = null;
  if (fromLdRaw) {
    if (looksLikeHtml(fromLdRaw)) {
      const cleaned = sanitizeDescriptionHtml(fromLdRaw, baseUrl);
      fromLd =
        textLength(cleaned) >= MIN_TEXT_CHARS ? cleaned : wrapPlainText(fromLdRaw);
    } else {
      fromLd = wrapPlainText(fromLdRaw);
    }
  }

  const node = richestNode($);
  let fromDom: string | null = null;
  if (node) {
    const cleaned = sanitizeDescriptionHtml(node.html() ?? "", baseUrl);
    if (textLength(cleaned) >= MIN_TEXT_CHARS) fromDom = cleaned;
  }

  // Prefer DOM when JSON-LD is plain text (no anchors) but the page HTML has links.
  if (fromDom && fromLd && !looksLikeHtml(fromLdRaw ?? "") && countLinks(fromDom) > 0) {
    return fromDom;
  }

  const picked = pickRicher(fromDom, fromLd);
  if (!picked) return null;
  if (textLength(picked) < MIN_TEXT_CHARS) return null;
  return picked;
}

function plainTextToHtml(text: string | null | undefined): string | null {
  const raw = text?.trim();
  if (!raw) return null;
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\r\n|\r|\n/g, "<br>")}</p>`;
}

/** Normalize manual paste (HTML or plain) into stored description HTML. */
export function normalizeDescriptionHtml(
  html: string | null | undefined,
  plain?: string | null,
): string | null {
  const fromHtml = html?.trim();
  if (fromHtml) {
    const cleaned = sanitizeDescriptionHtml(fromHtml);
    return cleaned || null;
  }
  return plainTextToHtml(plain);
}
