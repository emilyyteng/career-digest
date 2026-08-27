import * as cheerio from "cheerio";

export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  return $.root().text().replace(/\s+/g, " ").trim();
}

export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trimEnd()}…`;
}
