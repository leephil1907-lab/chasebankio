/* Security headers, input validation and CSRF posture. */
"use strict";
const crypto = require("crypto");

/* ------------------------- validation ------------------------- */
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(v, { min = 0, max = 1000, trim = true, name = "value" } = {}) {
  if (typeof v !== "string") throw badRequest(`${name} must be text.`);
  let s = trim ? v.trim() : v;
  if (s.length < min) throw badRequest(`${name} is too short.`);
  if (s.length > max) throw badRequest(`${name} is too long.`);
  return s;
}
function username(v) {
  const s = String(v == null ? "" : v).trim();
  if (!USERNAME_RE.test(s)) throw badRequest("Username must be 3–30 letters, numbers, dots, dashes or underscores.");
  return s.toLowerCase();
}
function email(v) {
  const s = String(v == null ? "" : v).trim();
  if (!EMAIL_RE.test(s) || s.length > 80) throw badRequest("Enter a valid email address.");
  return s.toLowerCase();
}
function password(v) {
  if (typeof v !== "string" || v.length < 8 || v.length > 200)
    throw badRequest("Password must be 8–200 characters.");
  return v;
}
/* Amount in dollars (string|number) → integer cents, strictly validated. */
function cents(v, { name = "amount", min = 1, maxCents = 100_000_000 } = {}) {
  const s = String(v == null ? "" : v).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw badRequest(`${name} must be a dollar amount like 25.00.`);
  const [d, f = ""] = s.split(".");
  const c = parseInt(d, 10) * 100 + parseInt((f + "00").slice(0, 2), 10);
  if (!Number.isSafeInteger(c)) throw badRequest(`${name} is out of range.`);
  if (c < min) throw badRequest(`${name} must be at least $${(min / 100).toFixed(2)}.`);
  if (c > maxCents) throw badRequest(`${name} exceeds the allowed maximum of $${(maxCents / 100).toFixed(2)}.`);
  return c;
}
function pick(body, keys) {
  const out = {};
  for (const k of keys) if (body && Object.prototype.hasOwnProperty.call(body, k)) out[k] = body[k];
  return out;
}
function badRequest(message) { const e = new Error(message); e.status = 400; e.code = "bad_request"; return e; }

/* ------------------------- CSRF ------------------------- */
/* SameSite=Lax cookies + Origin allowlist (when present) + a custom header
   requirement on mutations (cross-origin HTML forms cannot set it). */
function csrfGuard(req) {
  const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  if (!mutating) return;
  const origin = req.headers.origin;
  if (origin) {
    let oh;
    try { oh = new URL(origin).host; } catch { throw forbidden("Bad request origin."); }
    const host = req.headers.host || "";
    const allowed = (process.env.ALLOWED_ORIGINS || "")
      .split(",").map((s) => s.trim()).filter(Boolean);
    if (oh !== host && !allowed.includes(origin)) throw forbidden("Request origin not allowed.");
  }
  if (req.url.startsWith("/api/") && req.url !== "/api/health") {
    const h = req.headers["x-requested-with"];
    if (h !== "fetch") throw forbidden("Missing request header.");
  }
}
function forbidden(message) { const e = new Error(message); e.status = 403; e.code = "forbidden"; return e; }

/* ------------------------- headers ------------------------- */
const INLINE_RE = /<script>([\s\S]*?)<\/script>/g;

function cspFor(htmlBuffer, cfg) {
  const hashes = [];
  let m;
  const src = htmlBuffer.toString("utf8");
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(src)) !== null) {
    const digest = crypto.createHash("sha256").update(m[1], "utf8").digest("base64");
    hashes.push(`'sha256-${digest}'`);
  }
  const connect = ["'self'", cfg.consoleUrl.replace(/\/$/, "")].join(" ");
  return [
    "default-src 'self'",
    "script-src 'self'" + (hashes.length ? " " + hashes.join(" ") : ""),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${connect}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${cfg.frameAncestors}`,
  ].join("; ");
}

function applyHeaders(req, res, cfg, csp) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  /* Deliberately no X-Frame-Options: framing is governed by CSP frame-ancestors
     (env FRAME_ANCESTORS, default permissive for the sandboxed preview iframe;
     production examples pin it to 'self'). XFO cannot express an allowlist. */
  res.setHeader("Content-Security-Policy", csp || `frame-ancestors ${cfg.frameAncestors}`);
  if (cfg.hsts) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Vary", "Cookie");
}

module.exports = {
  str, username, email, password, cents, pick, badRequest, forbidden,
  csrfGuard, cspFor, applyHeaders, USERNAME_RE, EMAIL_RE,
};
