#!/usr/bin/env node
/**
 * Zero-dependency build validation for the Chase homepage recreation.
 * Checks: required files, asset references, duplicate ids, hash targets,
 * required metadata, image alt text, JS syntax, CSS brace balance and
 * that no external asset URLs slipped in (fully self-contained page).
 *
 * Usage: node scripts/validate.js   (or: npm run build / npm test)
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const errors = [];
const warnings = [];

const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const rel = (f) => path.relative(ROOT, f);

/* 1. Required files ------------------------------------------------------ */
const required = ["index.html", "styles.css", "app.js", "favicon.svg", "README.md"];
for (const f of required) {
  if (!fs.existsSync(path.join(ROOT, f))) errors.push(`Missing required file: ${f}`);
}

const html = fs.existsSync(path.join(ROOT, "index.html")) ? read("index.html") : "";
const css = fs.existsSync(path.join(ROOT, "styles.css")) ? read("styles.css") : "";
const js = fs.existsSync(path.join(ROOT, "app.js")) ? read("app.js") : "";

/* 2. Local asset references resolve -------------------------------------- */
const refRe = /\s(?:src|href)="([^"]+)"/g;
let m;
const localRefs = new Set();
while ((m = refRe.exec(html))) {
  const url = m[1];
  if (/^(https?:|mailto:|tel:|data:|#|javascript:)/i.test(url)) continue;
  localRefs.add(url.split("?")[0].split("#")[0]);
}
for (const ref of localRefs) {
  if (!ref) continue;
  const target = path.join(ROOT, ref);
  if (!fs.existsSync(target)) errors.push(`Broken local reference: "${ref}"`);
}

/* also check url() references inside CSS */
const cssUrlRe = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
while ((m = cssUrlRe.exec(css))) {
  const url = m[1];
  if (/^(https?:|data:)/i.test(url)) { warnings.push(`External URL in CSS: ${url}`); continue; }
  if (!fs.existsSync(path.join(ROOT, url))) errors.push(`Broken CSS url(): "${url}"`);
}

/* 3. No external assets (page must render fully offline) ----------------- */
/* Only asset-bearing tags: script[src], img[src], and link[rel=stylesheet|preload|icon]. */
for (const tag of html.match(/<script\b[^>]*\bsrc="[^"]+"[^>]*>/g) || []) {
  const src = /\ssrc="([^"]+)"/.exec(tag);
  if (src && /^https?:\/\//i.test(src[1])) errors.push(`External script (must be local): ${src[1]}`);
}
for (const tag of html.match(/<img\b[^>]*>/g) || []) {
  const src = /\ssrc="([^"]+)"/.exec(tag);
  if (src && /^https?:\/\//i.test(src[1])) errors.push(`External image (must be local): ${src[1]}`);
}
for (const tag of html.match(/<link\b[^>]*>/g) || []) {
  const relAttr = /\srel="([^"]+)"/.exec(tag);
  if (!relAttr) continue;
  const relVal = relAttr[1].toLowerCase();
  if (!/(stylesheet|preload|icon|manifest|apple-touch)/.test(relVal)) continue;
  const href = /\shref="([^"]+)"/.exec(tag);
  if (href && /^https?:\/\//i.test(href[1])) errors.push(`External ${relVal} (must be local): ${href[1]}`);
}

/* 4. Unique ids ----------------------------------------------------------- */
const ids = Array.from(html.matchAll(/\sid="([^"]+)"/g), (x) => x[1]);
const seen = new Set();
for (const id of ids) {
  if (seen.has(id)) errors.push(`Duplicate id: #${id}`);
  seen.add(id);
}

/* 5. Same-page hash links resolve ---------------------------------------- */
for (const [, hash] of html.matchAll(/href="#([^"]+)"/g)) {
  if (!seen.has(hash)) errors.push(`Hash link has no target: #${hash}`);
}

/* 6. Required metadata ---------------------------------------------------- */
const metaChecks = [
  [/<meta charset="utf-8">/i, "charset meta"],
  [/<meta name="viewport"/i, "viewport meta"],
  [/<meta name="description" content=".+"/i, "meta description"],
  [/<meta name="theme-color"/i, "theme-color meta"],
  [/<meta property="og:title"/i, "og:title"],
  [/<meta property="og:description"/i, "og:description"],
  [/<meta property="og:image"/i, "og:image"],
  [/<meta property="og:url"/i, "og:url"],
  [/<meta name="twitter:card"/i, "twitter:card"],
  [/<title>.+<\/title>/i, "title"],
  [/<meta name="robots"/i, "robots meta (demo pages must stay noindex)"],
  [/<html lang="en"/i, "html lang"],
  [/<link rel="icon"/i, "favicon link"],
  [/<link rel="preload"[^>]*fonts\/open-sans\.woff2/i, "font preload"],
  [/<link rel="canonical"/i, "canonical link"]
];
for (const [re, label] of metaChecks) {
  if (!re.test(html)) errors.push(`Missing ${label}`);
}

/* 7. Every <img> has alt + dimensions ------------------------------------ */
for (const tag of html.match(/<img\b[^>]*>/g) || []) {
  if (!/\salt="/.test(tag)) errors.push(`Image missing alt: ${tag.slice(0, 80)}`);
  if (!/\swidth="/.test(tag) || !/\sheight="/.test(tag)) {
    warnings.push(`Image missing width/height (CLS risk): ${tag.slice(0, 80)}`);
  }
}

/* 8. Landmarks & a11y basics --------------------------------------------- */
const a11yChecks = [
  [/<main[^>]*id="main"/, "<main id=\"main\"> landmark"],
  [/<footer/, "<footer> landmark"],
  [/<header/, "<header> landmark"],
  [/class="skip-link"/, "skip link"],
  [/aria-label="Chase home"/, "labelled home link"],
  [/class="sr-only">Chase home page</, "h1 present"]
];
for (const [re, label] of a11yChecks) {
  if (!re.test(html)) errors.push(`Missing ${label}`);
}

/* 9. JS syntax ----------------------------------------------------------- */
if (js) {
  const res = spawnSync(process.execPath, ["--check", path.join(ROOT, "app.js")], { encoding: "utf8" });
  if (res.status !== 0) errors.push(`app.js syntax error:\n${res.stderr.trim()}`);
}
if (fs.existsSync(path.join(ROOT, "scripts", "validate.js"))) {
  // nothing: this file is executing, so it parses fine
}

/* 10. CSS sanity ---------------------------------------------------------- */
if (css) {
  const open = (css.match(/\{/g) || []).length;
  const close = (css.match(/\}/g) || []).length;
  if (open !== close) errors.push(`CSS brace mismatch: ${open} "{" vs ${close} "}"`);
  if (/@font-face/.test(css) && !/fonts\/open-sans\.woff2/.test(css)) {
    errors.push("@font-face does not reference fonts/open-sans.woff2");
  }
}

/* 11. Referenced images exist on disk ------------------------------------ */
for (const [, src] of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
  if (!fs.existsSync(path.join(ROOT, src))) errors.push(`Missing image file: ${src}`);
}
if (fs.existsSync(path.join(ROOT, "fonts")) === false) errors.push("fonts/ directory missing");

/* ------------------------------ report --------------------------------- */
const banner = "Chase homepage build validation";
console.log(`\n  ${banner}`);
console.log("  " + "-".repeat(banner.length));

for (const w of warnings) console.log(`  ⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(`\n  FAIL — ${errors.length} error(s), ${warnings.length} warning(s)\n`);
  process.exit(1);
}
console.log(`  ✓ ${localRefs.size} local references OK`);
console.log(`  ✓ ${ids.length} ids unique`);
console.log(`  ✓ metadata, a11y landmarks, JS syntax, CSS balance OK`);
console.log(`  PASS — build is clean (${warnings.length} warning(s))\n`);
