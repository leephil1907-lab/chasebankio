/* Full-stack API test suite — zero dependencies, runs in-process.
   Covers auth, sessions, validation, ledger integrity, limits, payments,
   support cases, admin authorization, security headers and rate limits. */
"use strict";
const os = require("os");
const path = require("path");
const fs = require("fs");
const http = require("http");

const { createApp, buildConfig } = require("../server/index");

let passed = 0, failed = 0;
const problems = [];
const ok = (m) => { passed++; console.log("  ✓ " + m); };
const bad = (m) => { failed++; problems.push(m); console.log("  ✗ " + m); };
const check = (cond, m) => (cond ? ok(m) : bad(m));
const eq = (a, b, m) => check(a === b, `${m} (got ${JSON.stringify(a)})`);

function request(base, method, p, { body, cookie, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(p, base);
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname + u.search, method,
      headers: {
        ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        "X-Requested-With": "fetch",
        ...headers,
      },
    }, (res) => {
      let raw = "";
      res.on("data", (c) => { raw += c; });
      res.on("end", () => {
        let data = null;
        try { data = JSON.parse(raw); } catch { /* html */ }
        resolve({ status: res.statusCode, headers: res.headers, data, raw });
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}
const cookieOf = (res) => String(res.headers["set-cookie"] || "").split(";")[0];

(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "chase-test-"));
  process.env.DATA_DIR = dataDir;
  const cfg = buildConfig();
  cfg.dataDir = dataDir;
  cfg.port = 0;
  const app = createApp(cfg);
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const R = (m, p, o) => request(base, m, p, o);

  /* ---------------- health & migrations ---------------- */
  let res = await R("GET", "/api/health");
  eq(res.status, 200, "health 200");
  eq(res.data.schema, 4, "schema v4");
  eq(res.data.migrations.length, 4, "all migrations recorded");

  /* ---------------- static & headers ---------------- */
  res = await R("GET", "/index.html");
  eq(res.status, 200, "index served");
  const csp = res.headers["content-security-policy"] || "";
  check(csp.includes("default-src 'self'"), "CSP default-src self");
  check(/'sha256-[^']+'/.test(csp), "CSP carries hash for the inline boot script");
  check(csp.includes("frame-ancestors"), "CSP frame-ancestors present");
  eq(res.headers["x-content-type-options"], "nosniff", "nosniff header");
  check(res.headers["cross-origin-opener-policy"] === "same-origin", "COOP header");

  res = await R("GET", "/nope.html");
  eq(res.status, 404, "designed 404 status");
  check(/404/.test(res.raw), "designed 404 body");

  res = await R("GET", "/../../etc/passwd");
  check(res.status === 404 || res.status === 400, "path traversal rejected");

  res = await R("GET", "/styles.css", { headers: { "If-None-Match": '"' } });
  res = await R("GET", "/favicon.svg");
  eq(res.status, 200, "asset served");
  res = await R("GET", "/favicon.svg", { headers: { "If-None-Match": res.headers.etag } });
  eq(res.status, 304, "etag revalidation");

  /* ---------------- CSRF posture ---------------- */
  res = await R("POST", "/api/auth/login", { body: { username: "x", password: "yyyyyyyy" }, headers: { "X-Requested-With": "" } });
  eq(res.status, 403, "mutation without X-Requested-With blocked");
  res = await R("POST", "/api/auth/login", { body: { username: "x", password: "yyyyyyyy" }, headers: { Origin: "http://evil.example" } });
  eq(res.status, 403, "cross-origin blocked");

  /* ---------------- registration ---------------- */
  const alice = { first: "Alice", last: "Okoro", email: "alice@example.com", dob: "1992-04-04", username: "aliceok", password: "Sup3rSecret!" };
  res = await R("POST", "/api/auth/register", { body: alice });
  eq(res.status, 201, "register 201");
  const aliceCookie = cookieOf(res);
  check(!!aliceCookie && /HttpOnly/.test(res.headers["set-cookie"]), "session cookie HttpOnly");
  check(/SameSite=Lax/.test(res.headers["set-cookie"]), "session cookie SameSite=Lax");
  eq(res.data.accounts.length, 2, "two accounts opened");
  eq(res.data.accounts[0].balanceCents + res.data.accounts[1].balanceCents, 0, "accounts start at $0.00");

  res = await R("POST", "/api/auth/register", { body: alice });
  eq(res.status, 409, "duplicate username rejected");
  res = await R("POST", "/api/auth/register", { body: { ...alice, username: "alice2", email: "nope" } });
  eq(res.status, 400, "invalid email rejected");
  res = await R("POST", "/api/auth/register", { body: { ...alice, username: "alice2", email: "a2@example.com", password: "short" } });
  eq(res.status, 400, "short password rejected");
  res = await R("POST", "/api/auth/register", { body: { ...alice, username: "Bad Name!", email: "a3@example.com" } });
  eq(res.status, 400, "bad username rejected");

  /* ---------------- sessions ---------------- */
  res = await R("GET", "/api/auth/session", { cookie: aliceCookie });
  eq(res.data.user && res.data.user.username, "aliceok", "session returns user");
  res = await R("GET", "/api/accounts");
  eq(res.status, 401, "protected route requires session");

  /* ---------------- deposits ---------------- */
  let accts = (await R("GET", "/api/accounts", { cookie: aliceCookie })).data.accounts;
  const checking = accts.find((a) => a.type === "checking");
  const savings = accts.find((a) => a.type === "savings");

  res = await R("POST", "/api/deposits", { cookie: aliceCookie, body: { accountId: checking.id, amount: "100.50", memo: "opening" } });
  eq(res.status, 201, "deposit accepted");
  eq(res.data.account.balanceCents, 10050, "balance credited in cents");
  res = await R("POST", "/api/deposits", { cookie: aliceCookie, body: { accountId: checking.id, amount: "10.999" } });
  eq(res.status, 400, "3-decimal amount rejected");
  res = await R("POST", "/api/deposits", { cookie: aliceCookie, body: { accountId: "ac_forged", amount: "10" } });
  eq(res.status, 404, "foreign accountId rejected");
  res = await R("POST", "/api/deposits", { cookie: aliceCookie, body: { accountId: checking.id, amount: "999999" } });
  eq(res.status, 400, "single deposit cap enforced");

  /* ---------------- transfers ---------------- */
  res = await R("POST", "/api/transfers", { cookie: aliceCookie, body: { fromId: checking.id, toId: savings.id, amount: "10.00", confirmPassword: alice.password } });
  eq(res.status, 201, "authorized transfer succeeds");
  eq(res.data.transactions.length, 2, "transfer writes both legs");
  const outLeg = res.data.transactions.find((t) => t.amountCents < 0);
  eq(outLeg.balanceAfterCents, 9050, "debit balanceAfter correct");

  res = await R("POST", "/api/transfers", { cookie: aliceCookie, body: { fromId: checking.id, toId: savings.id, amount: "10.00", confirmPassword: "WrongOne!" } });
  eq(res.status, 403, "wrong step-up password denied");
  check(res.data.error.code === "bad_confirmation", "step-up error code");
  res = await R("POST", "/api/transfers", { cookie: aliceCookie, body: { fromId: checking.id, toId: checking.id, amount: "1.00", confirmPassword: alice.password } });
  eq(res.status, 400, "self-transfer rejected");
  res = await R("POST", "/api/transfers", { cookie: aliceCookie, body: { fromId: checking.id, toId: savings.id, amount: "99999.00", confirmPassword: alice.password } });
  eq(res.status, 400, "over-balance transfer rejected");

  /* daily limit: fund to $5,001, move $2,500 twice, then one more must fail */
  await R("POST", "/api/deposits", { cookie: aliceCookie, body: { accountId: checking.id, amount: "5000.00" } });
  await R("POST", "/api/deposits", { cookie: aliceCookie, body: { accountId: checking.id, amount: "1.00" } });
  res = await R("POST", "/api/transfers", { cookie: aliceCookie, body: { fromId: checking.id, toId: savings.id, amount: "2500.00", confirmPassword: alice.password } });
  eq(res.status, 201, "transfer at single cap ok");
  /* $10 already moved today, so a second $2,500 would exceed the $5,000 daily cap */
  res = await R("POST", "/api/transfers", { cookie: aliceCookie, body: { fromId: checking.id, toId: savings.id, amount: "2500.00", confirmPassword: alice.password } });
  eq(res.status, 400, "daily transfer limit enforced");
  check(res.data.error && res.data.error.code === "daily_limit", "daily limit error code");

  res = await R("GET", "/api/limits", { cookie: aliceCookie });
  eq(res.data.transferUsedTodayCents, 251000, "limits endpoint reports usage ($10 + $2,500)");

  /* ---------------- transactions feed ---------------- */
  res = await R("GET", "/api/transactions?limit=50", { cookie: aliceCookie });
  eq(res.status, 200, "transactions list");
  check(res.data.transactions.length >= 6, "ledger rows present");
  check(res.data.transactions[0].ts >= res.data.transactions[1].ts, "transactions newest first");

  /* ---------------- payees & payments ---------------- */
  res = await R("POST", "/api/payees", { cookie: aliceCookie, body: { name: "Ike Electric", detail: "ike@example.com" } });
  eq(res.status, 201, "payee created");
  const payee = res.data.payee;
  res = await R("POST", "/api/payees", { cookie: aliceCookie, body: { name: "x", detail: "y" } });
  eq(res.status, 400, "short payee rejected");

  const before = (await R("GET", "/api/accounts", { cookie: aliceCookie })).data.accounts.find((a) => a.id === checking.id).balanceCents;
  res = await R("POST", "/api/payments", { cookie: aliceCookie, body: { payeeId: payee.id, accountId: checking.id, amount: "25.00" } });
  eq(res.status, 201, "immediate payment created");
  eq(res.data.payment.status, "completed", "immediate payment completed");
  eq(res.data.account.balanceCents, before - 2500, "payment debited balance");

  res = await R("POST", "/api/payments", { cookie: aliceCookie, body: { payeeId: payee.id, accountId: checking.id, amount: "99999.00" } });
  eq(res.status, 400, "single payment cap enforced");
  /* move most of the checking balance out (within daily cap) so a $200 payment must fail */
  res = await R("POST", "/api/transfers", { cookie: aliceCookie, body: { fromId: checking.id, toId: savings.id, amount: "2489.00", confirmPassword: alice.password } });
  eq(res.status, 201, "balance drained for insufficient test");
  res = await R("POST", "/api/payments", { cookie: aliceCookie, body: { payeeId: payee.id, accountId: checking.id, amount: "200.00" } });
  eq(res.status, 400, "over-balance payment rejected");
  check(res.data.error.code === "insufficient_funds", "insufficient-funds error code");
  eq((await R("GET", "/api/payments", { cookie: aliceCookie })).data.payments.filter((p) => p.status === "failed").length, 1, "failed payment recorded for tracking");

  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  res = await R("POST", "/api/payments", { cookie: aliceCookie, body: { payeeId: payee.id, accountId: checking.id, amount: "30.00", scheduledFor: tomorrow } });
  eq(res.status, 201, "scheduled payment created");
  const sched = res.data.payment;
  eq(sched.status, "scheduled", "future payment is scheduled");
  res = await R("DELETE", `/api/payments/${sched.id}`, { cookie: aliceCookie });
  eq(res.status, 200, "scheduled payment cancellable");
  eq(res.data.payment.status, "cancelled", "payment cancelled status");

  /* sweep processes due scheduled payments (insert a past-dated one directly) */
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  app.db.coll("payments").push({
    id: "p_test_due", userId: app.db.coll("users")[0].id, payeeId: payee.id, payeeName: payee.name,
    accountId: checking.id, accountType: "checking", amountCents: 1000, memo: "",
    status: "scheduled", scheduledFor: yesterday, createdAt: new Date().toISOString(),
    processedAt: null, failureReason: null,
  });
  app.db.save();
  const { processDuePayments } = require("../server/api");
  processDuePayments(app.db, cfg);
  const swept = app.db.coll("payments").find((p) => p.id === "p_test_due");
  eq(swept.status, "completed", "due scheduled payment processed by sweep");

  /* ---------------- support cases ---------------- */
  res = await R("POST", "/api/support", { body: { category: "feedback", subject: "Card issue at ATM", message: "The ATM on Main Street swallowed my card.", name: "Visitor V", email: "v@example.com" } });
  eq(res.status, 201, "anonymous case opened");
  const anonCase = res.data.case;
  check(/^CS-\d{4}$/.test(anonCase.id), "case id format");
  res = await R("POST", "/api/support", { body: { category: "x", subject: "ab", message: "hi" } });
  eq(res.status, 400, "undersized case rejected");

  res = await R("POST", "/api/support", { cookie: aliceCookie, body: { category: "account", subject: "Statement question", message: "Where do I find my December statement?" } });
  eq(res.status, 201, "authenticated case opened");
  const aliceCase = res.data.case;
  res = await R("GET", "/api/support", { cookie: aliceCookie });
  eq(res.data.cases.length, 1, "user sees only their own cases");
  eq(res.data.cases[0].id, aliceCase.id, "case ownership correct");

  /* ---------------- admin (token-gated) ---------------- */
  res = await R("GET", "/api/admin/users");
  eq(res.status, 401, "admin without token rejected");
  res = await R("GET", "/api/admin/users", { headers: { "x-admin-token": "wrong-token" } });
  eq(res.status, 401, "admin with wrong token rejected");
  res = await R("GET", "/api/admin/users", { headers: { "x-admin-token": cfg.adminToken } });
  eq(res.status, 200, "admin with token accepted");
  const aliceRow = res.data.users.find((u) => u.username === "aliceok");
  check(!!aliceRow && aliceRow.accounts.length === 2, "admin user list includes accounts");

  res = await R("GET", "/api/admin/stats", { headers: { "x-admin-token": cfg.adminToken } });
  eq(res.status, 200, "admin stats");
  check(res.data.users >= 1 && res.data.txns >= 5, "stats counts populated");

  /* manual balance control: top-up, set-to, validation, authz */
  const balAcct = aliceRow.accounts.find((a) => a.type === "checking");
  res = await R("POST", `/api/admin/users/${aliceRow.id}/balance`, { headers: { "x-admin-token": cfg.adminToken }, body: { accountId: balAcct.id, mode: "credit", amount: "12.34", reason: "QA top-up" } });
  eq(res.status, 200, "admin top-up accepted");
  eq(res.data.account.balanceCents, balAcct.balanceCents + 1234, "top-up added to balance");
  eq(res.data.transaction.amountCents, 1234, "top-up ledgered signed");
  eq(res.data.transaction.type, "adjustment", "top-up is an adjustment txn");
  res = await R("POST", `/api/admin/users/${aliceRow.id}/balance`, { headers: { "x-admin-token": cfg.adminToken }, body: { accountId: balAcct.id, mode: "set", amount: "5.00", reason: "QA set" } });
  eq(res.status, 200, "admin set-balance accepted");
  eq(res.data.account.balanceCents, 500, "set-balance applied");
  eq(res.data.transaction.amountCents, 500 - (balAcct.balanceCents + 1234), "set delta ledgered");
  res = await R("GET", "/api/accounts", { cookie: aliceCookie });
  eq(res.data.accounts.find((a) => a.id === balAcct.id).balanceCents, 500, "user sees adjusted balance");
  res = await R("GET", "/api/transactions?limit=50", { cookie: aliceCookie });
  check(res.data.transactions.some((t) => t.type === "adjustment" && /adjusted|top-up/.test(t.label)), "adjustment visible in user activity");
  res = await R("POST", `/api/admin/users/${aliceRow.id}/balance`, { headers: { "x-admin-token": cfg.adminToken }, body: { accountId: balAcct.id, mode: "teleport", amount: "1" } });
  eq(res.status, 400, "invalid mode rejected");
  res = await R("POST", `/api/admin/users/${aliceRow.id}/balance`, { headers: { "x-admin-token": cfg.adminToken }, body: { accountId: balAcct.id, mode: "set", amount: "5.00" } });
  eq(res.status, 400, "no-change adjustment rejected");
  res = await R("POST", `/api/admin/users/${aliceRow.id}/balance`, { body: { accountId: balAcct.id, mode: "credit", amount: "1" } });
  eq(res.status, 401, "balance endpoint token-gated");
  res = await R("POST", `/api/admin/users/${aliceRow.id}/balance`, { headers: { "x-admin-token": cfg.adminToken }, body: { accountId: "ac_none", mode: "credit", amount: "1" } });
  eq(res.status, 404, "unknown account rejected");

  /* withdrawal tickets: request → admin approve/decline → ledger */
  res = await R("POST", "/api/withdrawals", { cookie: aliceCookie, body: { accountId: balAcct.id, amount: "99999" } });
  eq(res.status, 400, "withdraw over balance rejected");
  res = await R("POST", "/api/withdrawals", { cookie: aliceCookie, body: { accountId: balAcct.id, amount: "2.00" } });
  eq(res.status, 201, "withdrawal request created");
  const wdId = res.data.request.id;
  check(/^WD-\d{4}$/.test(wdId), "ticket id format WD-0001", wdId);
  eq(res.data.request.status, "pending", "request starts pending");
  check(typeof res.data.chatText === "string" && res.data.chatText.includes(wdId), "chat confirmation text carries ticket");
  res = await R("GET", "/api/withdrawals", { cookie: aliceCookie });
  check(res.data.requests.some((w) => w.id === wdId && w.status === "pending"), "user sees own pending ticket");
  res = await R("GET", "/api/admin/withdrawals", { headers: { "x-admin-token": cfg.adminToken } });
  eq(res.status, 200, "admin withdrawal list");
  const wdRow = res.data.requests.find((w) => w.id === wdId);
  check(!!wdRow && wdRow.username === "aliceok" && !!wdRow.account, "admin row joined with user + account");
  res = await R("POST", "/api/admin/withdrawals", { headers: { "x-admin-token": cfg.adminToken } });
  eq(res.status, 404, "withdrawal admin route shape");
  res = await R("POST", `/api/admin/withdrawals/${wdId}/approve`, { body: {} });
  eq(res.status, 401, "approve token-gated");
  res = await R("POST", `/api/admin/withdrawals/${wdId}/approve`, { headers: { "x-admin-token": cfg.adminToken } });
  eq(res.status, 200, "approve accepted");
  eq(res.data.account.balanceCents, 300, "approve debited $5.00 → $3.00");
  eq(res.data.transaction.type, "withdrawal", "approve wrote withdrawal txn");
  eq(res.data.transaction.amountCents, -200, "withdrawal txn is a signed debit");
  eq(res.data.transaction.balanceAfterCents, 300, "running balance exact after approval");
  res = await R("POST", `/api/admin/withdrawals/${wdId}/approve`, { headers: { "x-admin-token": cfg.adminToken } });
  eq(res.status, 409, "double approve rejected");
  res = await R("POST", "/api/withdrawals", { cookie: aliceCookie, body: { accountId: balAcct.id, amount: "1.00" } });
  const wd2 = res.data.request.id;
  res = await R("POST", `/api/admin/withdrawals/${wd2}/decline`, { headers: { "x-admin-token": cfg.adminToken }, body: { reason: "needs identity check" } });
  eq(res.status, 200, "decline accepted");
  eq(res.data.request.status, "declined", "declined ticket recorded");
  res = await R("GET", "/api/accounts", { cookie: aliceCookie });
  eq(res.data.accounts.find((a) => a.id === balAcct.id).balanceCents, 300, "decline moved no money");
  res = await R("GET", "/api/transactions?limit=50", { cookie: aliceCookie });
  check(res.data.transactions.some((x) => x.type === "withdrawal" && x.label.includes(wdId)), "customer sees approved withdrawal in activity");

  /* invoices: operator sends → customer pays with step-up → ledger */
  res = await R("POST", "/api/admin/invoices", { headers: { "x-admin-token": cfg.adminToken }, body: { userId: aliceRow.id, items: [{ desc: "Plan fee", amount: "2.00" }], dueDate: "2026-12-01", notes: "Test invoice" } });
  eq(res.status, 201, "invoice sent");
  const invId = res.data.invoice.id;
  check(/^INV-\d{4}$/.test(invId), "invoice id format INV-0001", invId);
  eq(res.data.invoice.totalCents, 200, "invoice total computed from lines");
  eq(res.data.invoice.status, "open", "invoice starts open");
  res = await R("GET", "/api/invoices", { cookie: aliceCookie });
  check(res.data.invoices.some((v) => v.id === invId && v.status === "open"), "customer sees open invoice on dashboard");
  res = await R("POST", `/api/invoices/${invId}/pay`, { cookie: aliceCookie, body: { accountId: balAcct.id, confirmPassword: "wrong" } });
  eq(res.status, 403, "invoice pay requires step-up password");
  res = await R("POST", `/api/invoices/${invId}/pay`, { cookie: aliceCookie, body: { accountId: balAcct.id, confirmPassword: "Sup3rSecret!" } });
  eq(res.status, 200, "invoice paid");
  eq(res.data.account.balanceCents, 100, "$3.00 → $1.00 after paying $2.00");
  eq(res.data.transaction.type, "invoice", "invoice payment wrote ledger row");
  eq(res.data.transaction.amountCents, -200, "invoice txn is a signed debit");
  res = await R("POST", `/api/invoices/${invId}/pay`, { cookie: aliceCookie, body: { accountId: balAcct.id, confirmPassword: "Sup3rSecret!" } });
  eq(res.status, 409, "double pay rejected");
  res = await R("POST", "/api/admin/invoices", { headers: { "x-admin-token": cfg.adminToken }, body: { userId: aliceRow.id, items: [{ desc: "Big fee", amount: "50.00" }] } });
  const inv2 = res.data.invoice.id;
  res = await R("POST", `/api/invoices/${inv2}/pay`, { cookie: aliceCookie, body: { accountId: balAcct.id, confirmPassword: "Sup3rSecret!" } });
  eq(res.status, 400, "invoice pay insufficient funds rejected");
  res = await R("POST", `/api/admin/invoices/${inv2}/void`, { headers: { "x-admin-token": cfg.adminToken } });
  eq(res.status, 200, "invoice cancelled");
  res = await R("POST", `/api/invoices/${inv2}/pay`, { cookie: aliceCookie, body: { accountId: balAcct.id, confirmPassword: "Sup3rSecret!" } });
  eq(res.status, 409, "cancelled invoice unpayable");
  res = await R("POST", "/api/admin/invoices", { headers: { "x-admin-token": cfg.adminToken }, body: { userId: aliceRow.id, items: [{ desc: "Bad", amount: "0" }] } });
  eq(res.status, 400, "zero-value line rejected");
  res = await R("GET", "/api/admin/invoices", { headers: { "x-admin-token": cfg.adminToken } });
  check(res.data.invoices.some((v) => v.id === invId && v.status === "paid"), "admin sees paid invoice");
  res = await R("POST", "/api/admin/invoices", { body: { userId: aliceRow.id, items: [{ desc: "X", amount: "1.00" }] } });
  eq(res.status, 401, "invoice send token-gated");

  res = await R("PATCH", `/api/admin/cases/${aliceCase.id}`, { headers: { "x-admin-token": cfg.adminToken }, body: { message: "Your statement lives in Account hub → Activity.", status: "pending" } });
  eq(res.status, 200, "admin replies to case");
  res = await R("GET", "/api/support", { cookie: aliceCookie });
  check(res.data.cases[0].messages.some((m) => m.from === "operator"), "user sees operator reply");
  eq(res.data.cases[0].status, "pending", "case status tracked");

  res = await R("PATCH", `/api/admin/users/${aliceRow.id}`, { headers: { "x-admin-token": cfg.adminToken }, body: { status: "suspended" } });
  eq(res.status, 200, "admin suspends user");
  res = await R("POST", "/api/auth/login", { body: { username: "aliceok", password: alice.password } });
  eq(res.status, 403, "suspended user cannot sign in");
  res = await R("GET", "/api/accounts", { cookie: aliceCookie });
  eq(res.status, 401, "suspension revokes sessions");
  res = await R("PATCH", `/api/admin/users/${aliceRow.id}`, { headers: { "x-admin-token": cfg.adminToken }, body: { status: "active" } });
  eq(res.status, 200, "admin reactivates user");

  /* ---------------- password reset flow ---------------- */
  res = await R("POST", "/api/auth/forgot", { body: { username: "aliceok" } });
  eq(res.status, 200, "forgot always answers generically");
  check(/operator.*console/i.test(res.data.message), "reset message is honest about delivery");
  let resetRow = app.db.coll("resets").slice(-1)[0];
  check(!!resetRow, "reset token stored");
  const rawToken = (() => {
    /* tests read the issued token from the admin path (console delivery) */
    return null;
  })();
  res = await R("POST", "/api/auth/reset", { body: { username: "aliceok", token: "not-the-token", password: "N3wSecret!!" } });
  eq(res.status, 400, "bogus reset token rejected");
  /* issue via admin endpoint (this is how the console delivers it) */
  res = await R("POST", `/api/admin/users/${aliceRow.id}/reset`, { headers: { "x-admin-token": cfg.adminToken } });
  eq(res.status, 200, "admin issues reset link");
  const token = new URL(res.data.link, "http://x").searchParams.get("t");
  res = await R("POST", "/api/auth/reset", { body: { username: "aliceok", token, password: "N3wSecret!!" } });
  eq(res.status, 200, "valid reset completes");
  res = await R("POST", "/api/auth/login", { body: { username: "aliceok", password: alice.password } });
  eq(res.status, 401, "old password no longer works");
  res = await R("POST", "/api/auth/login", { body: { username: "aliceok", password: "N3wSecret!!" } });
  eq(res.status, 200, "new password signs in");
  const aliceCookie2 = cookieOf(res);
  res = await R("POST", "/api/auth/reset", { body: { username: "aliceok", token, password: "AgainAgain1" } });
  eq(res.status, 400, "reset token is single-use");

  /* ---------------- change password + logout-others ---------------- */
  res = await R("POST", "/api/auth/change-password", { cookie: aliceCookie2, body: { current: "N3wSecret!!", next: "ThirdSecret1" } });
  eq(res.status, 200, "change password");
  res = await R("POST", "/api/auth/change-password", { cookie: aliceCookie2, body: { current: "nope", next: "ThirdSecret2" } });
  eq(res.status, 403, "wrong current password denied");
  res = await R("POST", "/api/auth/logout-others", { cookie: aliceCookie2 });
  eq(res.status, 200, "logout-others ok");

  /* ---------------- rate limiting ---------------- */
  const r = { ...alice, username: "ratey", email: "ratey@example.com" };
  await R("POST", "/api/auth/register", { body: r });
  let limited = false;
  for (let i = 0; i < 14; i++) {
    const lr = await R("POST", "/api/auth/login", { body: { username: "ratey", password: "WrongPass1" } });
    if (lr.status === 429) { limited = true; break; }
  }
  check(limited, "login rate limit kicks in");

  /* ---------------- audit trail ---------------- */
  res = await R("GET", "/api/admin/audit?limit=200", { headers: { "x-admin-token": cfg.adminToken } });
  const actions = res.data.audit.map((a) => a.action);
  check(actions.includes("auth.register"), "audit: register");
  check(actions.includes("transfer.create"), "audit: transfer");
  check(actions.includes("payment.create"), "audit: payment");
  check(actions.includes("admin.user_suspended") || actions.includes("admin.user_active"), "audit: admin actions");
  check(res.data.audit.some((a) => a.ok === false), "audit: failures recorded too");

  /* ---------------- teardown ---------------- */
  app.stop();
  await new Promise((r2) => app.server.close(r2));
  fs.rmSync(dataDir, { recursive: true, force: true });

  if (failed) {
    console.log(`\nAPI TESTS FAIL — ${failed}/${passed + failed} checks failed`);
    for (const p of problems) console.log("  • " + p);
    process.exit(1);
  }
  console.log(`\nAPI TESTS PASS — ${passed} checks green`);
})().catch((e) => { console.error(e); process.exit(1); });
