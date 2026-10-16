#!/usr/bin/env node
/**
 * F09 M1-13 / Q6 — fail `npm run check` on variant-less controls.
 *
 * - Bare `<button>` without className in production web source (except ui/ + prototype/)
 * - Unclassed `<input>` / `<textarea>` / `<select>` in the migrated Home tree only
 *   (full-tree field enforcement waits on M2 form waves)
 *
 * Prototype paths are exempt.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB_SRC = path.join(ROOT, "apps/web/src");

const FIELD_ENFORCE_DIRS = [
  path.join(WEB_SRC, "pages", "Home.tsx"),
  path.join(WEB_SRC, "features", "home"),
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === "prototype" || name === "node_modules") continue;
      walk(full, out);
    } else if (name.endsWith(".tsx") || name.endsWith(".jsx")) {
      out.push(full);
    }
  }
  return out;
}

function isUiPrimitive(file) {
  const rel = path.relative(WEB_SRC, file);
  return rel.startsWith(`ui${path.sep}`) || rel.startsWith("ui/");
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

function findBareButtons(file, text) {
  const hits = [];
  // Lowercase HTML only — do not match React <Button>
  const re = /<button\b([^>]*?)>/gs;
  let m;
  while ((m = re.exec(text))) {
    const attrs = m[1] ?? "";
    if (/\bclassName\s*=/.test(attrs) || /\bclass\s*=/.test(attrs)) continue;
    hits.push({ file, line: lineOf(text, m.index), kind: "button" });
  }
  return hits;
}

function findBareFields(file, text) {
  const hits = [];
  for (const tag of ["input", "textarea", "select"]) {
    // Lowercase HTML only — do not match React <TextField> / <Select> helpers
    const re = new RegExp(`<${tag}\\b([^>]*?)/?>`, "gs");
    let m;
    while ((m = re.exec(text))) {
      const attrs = m[1] ?? "";
      if (/\bclassName\s*=/.test(attrs) || /\bclass\s*=/.test(attrs)) continue;
      if (tag === "input" && /type\s*=\s*["']hidden["']/i.test(attrs)) continue;
      hits.push({ file, line: lineOf(text, m.index), kind: tag });
    }
  }
  return hits;
}

function underFieldEnforce(file) {
  for (const target of FIELD_ENFORCE_DIRS) {
    if (file === target) return true;
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      if (file.startsWith(target + path.sep)) return true;
    }
  }
  return false;
}

const files = walk(WEB_SRC).filter((f) => !isUiPrimitive(f));
const errors = [];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  errors.push(...findBareButtons(file, text));
  if (underFieldEnforce(file)) {
    errors.push(...findBareFields(file, text));
  }
}

if (errors.length === 0) {
  console.log(
    "check-ui-variants: ok (no bare <button>; Home field tree clean)",
  );
  process.exit(0);
}

console.error("check-ui-variants: variant-less controls found:\n");
for (const e of errors) {
  console.error(`  ${path.relative(ROOT, e.file)}:${e.line}  <${e.kind}>`);
}
console.error(`
Use apps/web/src/ui Button / Field variants (or an allowed feature className).
Prototype paths and apps/web/src/ui/* are exempt.
Bare fields outside Home are not enforced yet (M2 form waves).
`);
process.exit(1);
