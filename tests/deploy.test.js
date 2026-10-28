/* Deployment verification — production env checks, prod-mode boot,
   health endpoint, strict headers, and idempotent migrations. */
"use strict";
const os = require("os");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
let passed = 0, failed = 0;
const problems = [];
const ok = (m) => { passed++; console.log("  ✓ " + m); };
const bad = (m) => { failed++; problems.push(m); console.log("  ✗ " + m); };
const check = (cond, m) => (cond ? ok(m) : bad(m));

const get = (port, p) => new Promise((resolve, reject) => {
  const req = http.get({ hostname: "127.0.0.1", port, path: p, timeout: 4000 }, (res) => {
    let raw = "";
    res.on("data", (c) => { raw += c; });
    res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, raw }));
  });
  req.on("error", reject);
  req.on("timeout", () => req.destroy(new Error("timeout")));
});

async function boot(env) {
  const child = spawn(process.execPath, [path.join(ROOT, "server", "index.js")], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "", errOut = "";
  child.stdout.on("data", (c) => { out += c; });
  child.stderr.on("data", (c) => { errOut += c; });
  return { child, getOut: () => out + errOut };
}

(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "chase-deploy-"));

  /* 1. production without required env must fail fast with clear guidance */
  let proc = await boot({ NODE_ENV: "production", DATA_DIR: dataDir, SESSION_SECRET: "", ADMIN_API_TOKEN: "", COOKIE_SECURE: "0" });
  const exitCode = await new Promise((r) => { proc.child.on("exit", r); setTimeout(() => { proc.child.kill("SIGKILL"); r(-9); }, 6000) });
  const log = proc.getOut();
  check(exitCode === 1, "prod boot without env fails fast (exit 1)");
  check(/SESSION_SECRET/.test(log) && /ADMIN_API_TOKEN/.test(log) && /COOKIE_SECURE/.test(log), "env errors name every missing variable");

  /* 2. migrate CLI is idempotent */
  let m = spawnSync(process.execPath, [path.join(ROOT, "scripts", "migrate.js")], {
    cwd: ROOT, env: { ...process.env, DATA_DIR: dataDir }, encoding: "utf8",
  });
  check(m.status === 0 && /applied/.test(m.stdout), "first migrate applies migrations");
  m = spawnSync(process.execPath, [path.join(ROOT, "scripts", "migrate.js")], {
    cwd: ROOT, env: { ...process.env, DATA_DIR: dataDir }, encoding: "utf8",
  });
  check(m.status === 0 && /up to date/.test(m.stdout), "second migrate is a no-op");

  /* 3. healthy production-mode boot */
  const PORT = 8391;
  proc = await boot({
    NODE_ENV: "production", DATA_DIR: dataDir, PORT: String(PORT),
    SESSION_SECRET: "test-session-secret-0123456789abcdef0123456789abcdef",
    ADMIN_API_TOKEN: "test-admin-token-0123456789",
    COOKIE_SECURE: "1", HSTS: "1", FRAME_ANCESTORS: "self",
  });
  let up = false;
  for (let i = 0; i < 40; i++) {
    try { const h = await get(PORT, "/api/health"); if (h.status === 200) { up = true; break; } } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  check(up, "production-mode server boots and listens");

  if (up) {
    const h = await get(PORT, "/api/health");
    const data = JSON.parse(h.raw);
    check(data.status === "ok" && data.nodeEnv === "production", "health reports ok + production");
    check(data.schema >= 2 && data.migrations.length >= 2, "health shows applied migrations");
    check(h.headers["strict-transport-security"] === "max-age=31536000; includeSubDomains", "HSTS header when enabled");
    check(/frame-ancestors 'self'/.test(h.headers["content-security-policy"] || ""), "frame-ancestors pinned to 'self' from env");
    const idx = await get(PORT, "/index.html");
    check(idx.status === 200 && /text\/html/.test(idx.headers["content-type"]), "static site served in production");
    check(idx.headers["x-content-type-options"] === "nosniff", "security headers on static");
    const nf = await get(PORT, "/definitely-missing.html");
    check(nf.status === 404, "404 in production");
    /* session cookie must be Secure in production */
    const post = (p, body) => new Promise((resolve, reject) => {
      const payload = JSON.stringify(body);
      const req = http.request({
        hostname: "127.0.0.1", port: PORT, path: p, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), "X-Requested-With": "fetch" },
      }, (res) => { res.resume(); res.on("end", () => resolve(res)); });
      req.on("error", reject); req.write(payload); req.end();
    });
    const r = await post("/api/auth/register", {
      first: "Deploy", last: "Check", email: "deploy@example.com",
      dob: "1990-01-01", username: "deploycheck", password: "Sup3rSecret!",
    });
    check(r.statusCode === 201, "prod register works");
    const sc = String(r.headers["set-cookie"] || "");
    check(/Secure/.test(sc) && /HttpOnly/.test(sc) && /SameSite=Lax/.test(sc), "prod session cookie flags (Secure+HttpOnly+Lax)");
  }

  proc.child.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 700));
  try { proc.child.kill("SIGKILL"); } catch {}
  fs.rmSync(dataDir, { recursive: true, force: true });

  if (failed) {
    console.log(`\nDEPLOY TESTS FAIL — ${failed}/${passed + failed} checks failed`);
    for (const p of problems) console.log("  • " + p);
    process.exit(1);
  }
  console.log(`\nDEPLOY TESTS PASS — ${passed} checks green`);
})();
