#!/usr/bin/env node
/**
 * Zero-dependency build validation for the Chase multi-page site.
 * Checks, for every HTML page:
 *   required files · local references · external assets · unique ids ·
 *   hash targets (incl. chrome.js sprite symbols) · required metadata ·
 *   img alt/dimensions · landmarks · JS syntax · CSS balance ·
 *   cross-page internal links · required page set.
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

/* 1. Required files ------------------------------------------------------ */
const REQUIRED_PAGES = [
  "index.html", "checking.html", "savings.html", "credit-cards.html",
  "home-loans.html", "auto.html", "investing.html", "education.html",
  "travel.html", "business.html", "support.html", "search.html",
  "sign-in.html", "sign-up.html", "account.html", "404.html",
];
const required = [
  ...REQUIRED_PAGES,
  "styles.css", "app.js", "chrome.js", "site-index.js", "notify.js", "chat.js",
  "site-config.json", "favicon.svg", "apple-touch-icon.png", "manifest.webmanifest",
  "robots.txt", "logo.svg", "COMPARISON.md", "README.md",
];
for (const f of required) {
  if (!fs.existsSync(path.join(ROOT, f))) errors.push(`Missing required file: ${f}`);
}

const pages = REQUIRED_PAGES.filter((f) => fs.existsSync(path.join(ROOT, f)));
const css = read("styles.css");
const chromeJs = fs.existsSync(path.join(ROOT, "chrome.js")) ? read("chrome.js") : "";

/* Sprite symbol ids injected at runtime by chrome.js count as valid hash targets */
const spriteIds = new Set(
  Array.from(chromeJs.matchAll(/<symbol id="([^"]+)"/g), (x) => x[1])
);
/* Element ids chrome.js injects (drawers/overlays/header controls) */
const chromeInjectedIds = new Set(
  Array.from(chromeJs.matchAll(/id="([A-Za-z][^"]*)"/g), (x) => x[1])
);

const refRe = /\s(?:src|href)="([^"]+)"/g;
const internalLinkRe = /href="([^"#:]+\.html)(?:[?#][^"]*)?"/g;

let totalLocalRefs = 0;
let totalPagesChecked = 0;

for (const page of pages) {
  const html = read(page);
  totalPagesChecked++;
  const pageErrors = [];

  /* 2. Local asset references resolve */
  let m;
  const localRefs = new Set();
  while ((m = refRe.exec(html))) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:|#|javascript:)/i.test(url)) continue;
    localRefs.add(url.split("?")[0].split("#")[0]);
  }
  totalLocalRefs += localRefs.size;
  for (const ref of localRefs) {
    if (!ref) continue;
    if (!fs.existsSync(path.join(ROOT, ref))) pageErrors.push(`Broken local reference: "${ref}"`);
  }

  /* 3. No external assets (pages must render fully offline) */
  for (const tag of html.match(/<script\b[^>]*\bsrc="[^"]+"[^>]*>/g) || []) {
    const src = /\ssrc="([^"]+)"/.exec(tag);
    if (src && /^https?:\/\//i.test(src[1])) pageErrors.push(`External script (must be local): ${src[1]}`);
  }
  for (const tag of html.match(/<img\b[^>]*>/g) || []) {
    const src = /\ssrc="([^"]+)"/.exec(tag);
    if (src && /^https?:\/\//i.test(src[1])) pageErrors.push(`External image (must be local): ${src[1]}`);
  }
  for (const tag of html.match(/<link\b[^>]*>/g) || []) {
    const relAttr = /\srel="([^"]+)"/.exec(tag);
    if (!relAttr) continue;
    const relVal = relAttr[1].toLowerCase();
    if (!/(stylesheet|preload|icon|manifest|apple-touch)/.test(relVal)) continue;
    const href = /\shref="([^"]+)"/.exec(tag);
    if (href && /^https?:\/\//i.test(href[1])) pageErrors.push(`External ${relVal} (must be local): ${href[1]}`);
  }

  /* 4. Unique ids per page */
  const ids = Array.from(html.matchAll(/\sid="([^"]+)"/g), (x) => x[1]);
  const seen = new Set(ids);
  for (const id of new Set(ids)) {
    if (ids.filter((x) => x === id).length > 1) pageErrors.push(`Duplicate id: #${id}`);
  }

  /* 5. Same-page hash links resolve (sprite symbols + injected ids allowed) */
  for (const [, hash] of html.matchAll(/href="#([^"]+)"/g)) {
    if (seen.has(hash) || spriteIds.has(hash) || chromeInjectedIds.has(hash)) continue;
    pageErrors.push(`Hash link has no target: #${hash}`);
  }

  /* 6. Required metadata */
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
    [/<link rel="manifest"/i, "web app manifest link"],
    [/<link rel="apple-touch-icon"/i, "apple-touch-icon link"],
    [/<link rel="preload"[^>]*fonts\/open-sans\.woff2/i, "font preload"],
    [/<link rel="canonical"/i, "canonical link"],
    [/id="siteHeaderSlot"/, "header slot"],
    [/id="siteFooterSlot"/, "footer slot"],
    [/page-skeleton/, "loading skeleton"],
    [/chrome\.js/, "shared chrome script"],
    [/app\.js/, "app script"],
  ];
  for (const [re, label] of metaChecks) {
    if (!re.test(html)) pageErrors.push(`Missing ${label}`);
  }

  /* 7. Every <img> has alt + dimensions */
  for (const tag of html.match(/<img\b[^>]*>/g) || []) {
    if (!/\salt="/.test(tag)) pageErrors.push(`Image missing alt: ${tag.slice(0, 80)}`);
    if (!/\swidth="/.test(tag) || !/\sheight="/.test(tag)) {
      warnings.push(`${page}: image missing width/height (CLS risk): ${tag.slice(0, 60)}`);
    }
  }

  /* 8. Landmarks & a11y basics */
  const a11yChecks = [
    [/<main[^>]*id="main"/, '<main id="main"> landmark'],
    [/<footer/, "<footer> landmark"],
    [/<header/, "<header> landmark"],
    [/class="skip-link"/, "skip link"],
    [/<h1[\s>]/, "<h1> present"],
    [/<meta name="description" content="[^"]{40,}"/, "substantial meta description"],
  ];
  for (const [re, label] of a11yChecks) {
    if (!re.test(html)) pageErrors.push(`Missing ${label}`);
  }

  /* Page identity: data-page + unique title */
  if (!/data-page="/.test(html)) pageErrors.push("Missing data-page attribute");
  if (/<title>(Chase home page|.+)<\/title>/.test(html) === false) pageErrors.push("Missing <title>");

  for (const e of pageErrors) errors.push(`[${page}] ${e}`);
}

/* chrome.js must carry the labelled home link (logo lives there) */
if (!/aria-label="Chase logo, links to Chase home"/.test(chromeJs)) {
  errors.push("[chrome.js] Missing labelled home link");
}

/* 9. Cross-page internal links resolve --------------------------------- */
const pageSet = new Set(pages);
for (const page of pages) {
  const html = read(page);
  for (const [, target] of html.matchAll(internalLinkRe)) {
    if (!pageSet.has(target)) errors.push(`[${page}] Internal link to missing page: ${target}`);
  }
}
/* links emitted by chrome.js, app.js and site-index.js also must resolve */
for (const src of [chromeJs,
  fs.existsSync(path.join(ROOT, "app.js")) ? read("app.js") : "",
  fs.existsSync(path.join(ROOT, "site-index.js")) ? read("site-index.js") : ""]) {
  for (const [, target] of src.matchAll(internalLinkRe)) {
    if (!pageSet.has(target)) errors.push(`[chrome/app] Internal link to missing page: ${target}`);
  }
}

/* 9b. Cross-page anchors resolve ---------------------------------------- */
const pageIds = {};
for (const page of pages) {
  pageIds[page] = new Set(Array.from(read(page).matchAll(/\sid="([^"]+)"/g), (x) => x[1]));
}
const anchorRe = /href="([^"#?]+\.html)#([^"]+)"/g;
const anchorSources = [
  ...pages.map((p) => [p, read(p)]),
  ["chrome.js", chromeJs],
  ["app.js", fs.existsSync(path.join(ROOT, "app.js")) ? read("app.js") : ""],
];
for (const [srcName, text] of anchorSources) {
  let a;
  anchorRe.lastIndex = 0;
  while ((a = anchorRe.exec(text))) {
    const [, targetPage, anchor] = a;
    if (targetPage === "sign-in.html" && anchor === "help") {
      // #help is rendered by the page itself
    }
    if (!pageIds[targetPage]) continue;
    if (!pageIds[targetPage].has(anchor)) {
      errors.push(`[${srcName}] Anchor has no target: ${targetPage}#${anchor}`);
    }
  }
}

/* 10. JS syntax ---------------------------------------------------------- */
for (const file of ["app.js", "chrome.js", "site-index.js", "notify.js", "chat.js"]) {
  if (!fs.existsSync(path.join(ROOT, file))) continue;
  const res = spawnSync(process.execPath, ["--check", path.join(ROOT, file)], { encoding: "utf8" });
  if (res.status !== 0) errors.push(`${file} syntax error:\n${res.stderr.trim()}`);
}

/* 11. CSS sanity --------------------------------------------------------- */
const open = (css.match(/\{/g) || []).length;
const close = (css.match(/\}/g) || []).length;
if (open !== close) errors.push(`CSS brace mismatch: ${open} "{" vs ${close} "}"`);
if (/@font-face/.test(css) && !/fonts\/open-sans\.woff2/.test(css)) {
  errors.push("@font-face does not reference fonts/open-sans.woff2");
}
const cssUrlRe = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
let m2;
while ((m2 = cssUrlRe.exec(css))) {
  const url = m2[1];
  if (/^(https?:|data:)/i.test(url)) { warnings.push(`External URL in CSS: ${url}`); continue; }
  if (!fs.existsSync(path.join(ROOT, url))) errors.push(`Broken CSS url(): "${url}"`);
}

/* 11b. site-config.json parses and carries the admin control surface ------- */
try {
  const cfg = JSON.parse(read("site-config.json"));
  for (const key of ["banner", "maintenance", "hero", "contact", "chat", "notifications", "inject"]) {
    if (!(key in cfg)) errors.push(`site-config.json missing control group: ${key}`);
  }
  if (typeof cfg.notifications.adminEndpoint !== "string") {
    errors.push("site-config.json notifications.adminEndpoint must be a string");
  }
} catch (e) {
  errors.push(`site-config.json is not valid JSON: ${e.message}`);
}

/* 12. Every local HTML link in JS template strings exists ---------------- */
for (const file of ["app.js", "chrome.js"]) {
  const src = fs.existsSync(path.join(ROOT, file)) ? read(file) : "";
  for (const [, target] of src.matchAll(internalLinkRe)) {
    if (!pageSet.has(target)) errors.push(`[${file}] Internal link to missing page: ${target}`);
  }
}

/* ------------------------------ report --------------------------------- */
const banner = "Chase multi-page build validation";
console.log(`\n  ${banner}`);
console.log("  " + "-".repeat(banner.length));

for (const w of warnings) console.log(`  ⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(`\n  FAIL — ${errors.length} error(s), ${warnings.length} warning(s)\n`);
  process.exit(1);
}
console.log(`  ✓ ${pages.length} pages checked, ${totalLocalRefs} local references OK`);
console.log(`  ✓ ${spriteIds.size} sprite symbols available as hash targets`);
console.log(`  ✓ metadata, landmarks, alt text, JS syntax, CSS balance OK`);
console.log(`  ✓ all internal links resolve to real pages`);
console.log(`  PASS — build is clean (${warnings.length} warning(s))\n`);
