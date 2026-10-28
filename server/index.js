/* Entry point — environment checks, migrations, HTTP server.
   Zero dependencies: Node built-ins only. Serves the site + /api on one origin. */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DB } = require("./db");
const A = require("./auth");
const S = require("./security");
const { dispatch } = require("./api");
const { serveStatic } = require("./static");
const { processDuePayments } = require("./api");

const ROOT = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT, "migrations");

/* ------------------------- env loading ------------------------- */
function loadDotEnv() {
  const file = path.join(ROOT, ".env");
  try {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch { /* .env optional in development */ }
}

function checkEnv(nodeEnv) {
  const problems = [];
  if (nodeEnv === "production") {
    const requireVar = (name, minLen, hint) => {
      const v = process.env[name] || "";
      if (!v || v.length < minLen)
        problems.push(`${name} must be set to at least ${minLen} characters in production. ${hint}`);
    };
    requireVar("SESSION_SECRET", 32, "Generate with: openssl rand -hex 32");
    requireVar("ADMIN_API_TOKEN", 16, "Generate with: openssl rand -hex 16");
    if (process.env.COOKIE_SECURE !== "1")
      problems.push("COOKIE_SECURE=1 is required in production (session cookies must be Secure).");
  }
  return problems;
}

/* ------------------------- config ------------------------- */
function buildConfig() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isProd = nodeEnv === "production";
  return {
    nodeEnv,
    isProd,
    root: ROOT,
    dataDir: path.resolve(ROOT, process.env.DATA_DIR || "data"),
    port: parseInt(process.env.PORT || "8123", 10),
    host: process.env.HOST || "0.0.0.0",
    consoleUrl: process.env.CONSOLE_URL || "http://127.0.0.1:7788",
    /* Accept `self` bare (common in env files) and quote it for CSP. */
    frameAncestors: (() => { const fa = process.env.FRAME_ANCESTORS || "*"; return fa === "self" ? "'self'" : fa; })(),
    hsts: process.env.HSTS === "1",
    cookieSecure: process.env.COOKIE_SECURE === "1",
    trustProxy: process.env.TRUST_PROXY === "1",
    sessionSecret: process.env.SESSION_SECRET || "",
    adminToken: process.env.ADMIN_API_TOKEN || "",
    devAdminToken: "local-dev-admin-token",
  };
}

/* ------------------------- app factory ------------------------- */
function createApp(cfg) {
  const db = new DB(cfg.dataDir).load();
  const mig = db.applyMigrations(MIGRATIONS_DIR);

  if (!cfg.sessionSecret) {
    /* Development secret persists in the DB so restarts keep sessions. */
    if (!db.data.meta.devSecret) {
      db.data.meta.devSecret = crypto.randomBytes(32).toString("hex");
      db.saveSync();
    }
    cfg.sessionSecret = db.data.meta.devSecret;
  }
  if (!cfg.adminToken) cfg.adminToken = cfg.devAdminToken;

  const limiter = new A.RateLimiter();
  const started = Date.now();

  const server = require("http").createServer((req, res) => {
    const ip = cfg.trustProxy
      ? String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress
      : req.socket.remoteAddress;

    try {
      if (req.url.startsWith("/api/")) {
        S.applyHeaders(req, res, cfg, null);
        S.csrfGuard(req);
        const url = new URL(req.url, "http://x");
        /* Global API rate budget per IP (generous — protects, never blocks QA). */
        const g = limiter.check("api:" + ip, 600, 60e3);
        if (g !== null) return sendErr(res, 429, "rate_limited", "Too many requests — slow down.");
        return readBody(req, (bodyErr, body) => {
          if (bodyErr) return sendErr(res, bodyErr.status || 400, bodyErr.code || "bad_request", bodyErr.message);
          const sessionToken = cookieValue(req.headers.cookie, "chase_sid");
          let session = A.findSession(db, sessionToken);
          let user = null;
          if (session) user = db.coll("users").find((u) => u.id === session.userId) || null;
          if (user && user.status === "suspended" && !url.pathname.startsWith("/api/admin/") && url.pathname !== "/api/auth/session") {
            session = null; user = null;
          }
          const ctx = {
            req, res, body, params: {}, url,
            path: url.pathname,
            user, session,
            sessionToken: session ? sessionToken : null,
            sessionHash: session ? session.tokenHash : null,
            db, cfg, ip, limiter,
          };
          const handled = dispatch(ctx);
          if (!handled) sendErr(res, 404, "not_found", "No such API endpoint.");
        });
      }
      if (req.method !== "GET" && req.method !== "HEAD") {
        S.applyHeaders(req, res, cfg, null);
        return sendErr(res, 405, "method_not_allowed", "Method not allowed.");
      }
      serveStatic(req, res, cfg, (rq, rs, c, csp) => S.applyHeaders(rq, rs, c, csp));
    } catch (e) {
      const st = e.status || 500;
      if (st >= 500) console.error("[server]", e);
      if (!res.headersSent) sendErr(res, st, e.code || "error", e.message || "Server error.");
      else try { res.end(); } catch {}
    }
  });

  /* Scheduled payment sweep — keeps "scheduled → completed/failed" honest. */
  const sweep = setInterval(() => { try { processDuePayments(db, cfg); } catch (e) { console.error("[sweep]", e.message); } }, 5 * 60e3);
  sweep.unref();
  limiter._sweep.unref?.();

  return { server, db, cfg, limiter, mig, stop() { clearInterval(sweep); limiter.stop(); } };
}

/* ------------------------- helpers ------------------------- */
function sendErr(res, status, code, message) {
  const body = JSON.stringify({ error: { code, message } });
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}
function cookieValue(header, name) {
  if (!header) return null;
  for (const part of String(header).split(";")) {
    const m = /^\s*([^=]+)=(.*)$/.exec(part);
    if (m && m[1].trim() === name) return m[2];
  }
  return null;
}
function readBody(req, cb) {
  const method = req.method;
  if (method === "GET" || method === "HEAD") return cb(null, {});
  const ct = req.headers["content-type"] || "";
  if (ct && !ct.includes("application/json")) {
    const e = new Error("Send JSON with Content-Type: application/json."); e.status = 415; e.code = "unsupported"; return cb(e);
  }
  let size = 0;
  let settled = false;
  const done = (e, v) => { if (settled) return; settled = true; cb(e, v); };
  const chunks = [];
  req.on("data", (c) => {
    if (settled) return;
    size += c.length;
    if (size > 64 * 1024) { const e = new Error("Body too large."); e.status = 413; e.code = "too_large"; req.destroy(); return done(e); }
    chunks.push(c);
  });
  req.on("end", () => {
    if (settled) return;
    if (!chunks.length) return done(null, {});
    try { done(null, JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
    catch { const e = new Error("Invalid JSON body."); e.status = 400; e.code = "bad_json"; done(e); }
  });
  req.on("error", () => { const x = new Error("Request failed."); x.status = 400; done(x); });
}

/* ------------------------- main ------------------------- */
function main() {
  loadDotEnv();
  const nodeEnv = process.env.NODE_ENV || "development";
  const problems = checkEnv(nodeEnv);
  if (problems.length) {
    console.error("✖ environment check failed:");
    for (const p of problems) console.error("  - " + p);
    process.exit(1);
  }
  const cfg = buildConfig();
  const app = createApp(cfg);
  app.server.listen(cfg.port, cfg.host, () => {
    console.log(`chasebankio server → http://${cfg.host}:${cfg.port}  (${cfg.nodeEnv})`);
    console.log(`  data dir:  ${cfg.dataDir}`);
    console.log(`  schema:    v${app.db.data.meta.schema}  migrations: ${app.db.data.meta.migrations.join(", ") || "none"}`);
    console.log(`  health:    http://127.0.0.1:${cfg.port}/api/health`);
    try { processDuePayments(app.db, cfg); } catch {}
  });
  const shutdown = () => { app.stop(); app.server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 1500).unref(); };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (require.main === module) main();
module.exports = { createApp, buildConfig, loadDotEnv, checkEnv };
