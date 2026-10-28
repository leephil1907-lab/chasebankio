/* HTTP API — auth, accounts, transfers, payments, support, admin.
   All money values are integer cents. All mutations are audit-logged. */
"use strict";
const crypto = require("crypto");
const { uid } = require("./db");
const A = require("./auth");
const V = require("./security");

/* ------------------------- helpers ------------------------- */
const json = (res, status, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
};
const err = (res, status, code, message) => { json(res, status, { error: { code, message } }); return true; };

function audit(db, ctx, row) {
  db.coll("audit").push({
    id: uid("a"),
    ts: new Date().toISOString(),
    actorType: row.actorType || (ctx.user ? "user" : "anon"),
    actorId: row.actorId || (ctx.user ? ctx.user.id : ""),
    actorName: row.actorName || (ctx.user ? ctx.user.username : ""),
    action: row.action,
    target: row.target || "",
    detail: row.detail || "",
    ok: row.ok !== false,
    reason: row.reason || "",
    ip: ctx.ip || "",
  });
  db.save();
}

function siteSettings(db) {
  return db.coll("settings").find((s) => s.id === "site") || {
    id: "site", transferDailyCents: 500000, transferMaxCents: 250000,
    depositDailyCents: 1000000, depositMaxCents: 500000, maxPayees: 25,
  };
}

function todayPrefix() { return new Date().toISOString().slice(0, 10); }

function userAccounts(db, userId) {
  return db.coll("accounts").filter((a) => a.userId === userId);
}

function publicUser(u) {
  return {
    id: u.id, username: u.username, name: u.name, email: u.email,
    phone: u.phone || "", memberSince: u.createdAt, status: u.status,
  };
}

function setSessionCookie(res, cfg, token, remember) {
  const parts = [
    `chase_sid=${token}`, "Path=/", "HttpOnly", "SameSite=Lax",
    `Max-Age=${remember ? 7 * 86400 : 12 * 3600}`,
  ];
  if (cfg.cookieSecure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}
function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "chase_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

/* Best-effort server→console event forwarding (no email is ever claimed). */
function forwardEvent(cfg, type, payload, page) {
  if (!cfg.consoleUrl) return;
  const body = JSON.stringify({
    type, payload, page: page || "", visitor: "server",
    ts: Date.now(), read: false,
  });
  try {
    const u = new URL(cfg.consoleUrl.replace(/\/$/, "") + "/api/events");
    const mod = u.protocol === "https:" ? require("https") : require("http");
    const req = mod.request({
      hostname: u.hostname, port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: u.pathname, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      timeout: 1500,
    }, (r) => r.resume());
    req.on("error", () => {});
    req.on("timeout", () => req.destroy());
    req.end(body);
  } catch { /* console offline — never blocks the user */ }
}

function processDuePayments(db, cfg) {
  const today = todayPrefix();
  const due = db.coll("payments").filter((p) => p.status === "scheduled" && p.scheduledFor <= today);
  for (const p of due) {
    const acct = db.coll("accounts").find((a) => a.id === p.accountId);
    if (!acct || acct.userId !== p.userId || acct.status !== "open") {
      p.status = "failed"; p.failureReason = "account_unavailable"; p.processedAt = new Date().toISOString();
      continue;
    }
    if (p.amountCents > acct.balanceCents) {
      p.status = "failed"; p.failureReason = "insufficient_funds"; p.processedAt = new Date().toISOString();
      audit(db, { ip: "system", user: null }, {
        actorType: "system", action: "payment.failed", target: p.id,
        detail: `${p.payeeName} $${(p.amountCents / 100).toFixed(2)}`, ok: false, reason: "insufficient_funds",
      });
      continue;
    }
    acct.balanceCents -= p.amountCents;
    p.status = "completed"; p.processedAt = new Date().toISOString();
    db.coll("txns").push({
      id: uid("t"), userId: p.userId, accountId: acct.id,
      ts: p.processedAt, type: "payment", status: "completed",
      label: `Payment to ${p.payeeName}`, memo: p.memo || "",
      amountCents: -p.amountCents, balanceAfterCents: acct.balanceCents, paymentId: p.id,
    });
    audit(db, { ip: "system", user: null }, {
      actorType: "system", actorId: p.userId, action: "payment.completed", target: p.id,
      detail: `${p.payeeName} $${(p.amountCents / 100).toFixed(2)}`,
    });
  }
  if (due.length) db.save();
  return due.length;
}

/* ------------------------- route table ------------------------- */
const routes = [];
const on = (method, pattern, opts, handler) => {
  if (typeof opts === "function") { handler = opts; opts = {}; }
  const keys = [];
  const rx = new RegExp("^" + pattern.replace(/:[a-zA-Z]+/g, (m) => { keys.push(m.slice(1)); return "([^/]+)"; }) + "$");
  routes.push({ method, rx, keys, handler, opts });
};

const needAuth = (h) => (ctx) => {
  if (!ctx.user) return err(ctx.res, 401, "unauthorized", "Sign in to continue.");
  if (ctx.user.status === "suspended")
    return err(ctx.res, 403, "suspended", "This account is suspended. Contact support.");
  return h(ctx);
};
const needAdmin = (h) => (ctx) => {
  const got = ctx.req.headers["x-admin-token"] || "";
  const a = Buffer.from(String(got)), b = Buffer.from(String(ctx.cfg.adminToken));
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) return err(ctx.res, 401, "admin_unauthorized", "Admin token required.");
  return h(ctx);
};

const limit = (ctx, key, n, windowMs) => {
  const wait = ctx.limiter.check(`${key}:${ctx.ip}`, n, windowMs);
  if (wait !== null) {
    return err(ctx.res, 429, "rate_limited", `Too many attempts — try again in ${Math.ceil(wait / 1000)}s.`);
  }
  return null;
};

/* =================== AUTH =================== */
on("POST", "/api/auth/register", (ctx) => {
  const l = limit(ctx, "register", 20, 3600e3); if (l) return l;
  const b = V.pick(ctx.body, ["first", "last", "email", "dob", "username", "password"]);
  const first = V.str(b.first, { min: 2, max: 40, name: "First name" });
  const last = V.str(b.last, { min: 2, max: 40, name: "Last name" });
  const mail = V.email(b.email);
  const dob = V.str(b.dob, { min: 4, max: 10, name: "Date of birth" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || dob > todayPrefix()) throw V.badRequest("Enter a valid date of birth.");
  const uname = V.username(b.username);
  const pass = V.password(b.password);
  const db = ctx.db;
  if (db.coll("users").some((u) => u.username === uname)) {
    audit(db, ctx, { action: "auth.register", target: uname, ok: false, reason: "duplicate_username" });
    return err(ctx.res, 409, "username_taken", "That username is already enrolled.");
  }
  if (db.coll("users").some((u) => u.email === mail)) {
    return err(ctx.res, 409, "email_taken", "An account already exists for that email address.");
  }
  const user = {
    id: uid("u"), username: uname, name: `${first} ${last}`, email: mail,
    dob, phone: "", passwordHash: A.hashPassword(pass),
    status: "active", createdAt: new Date().toISOString(), lastLoginAt: null,
  };
  db.coll("users").push(user);
  const mk = (type, nm, last4) => {
    const acct = {
      id: uid("ac"), userId: user.id, type, name: nm,
      last4: String(crypto.randomInt(1000, 10000)),
      balanceCents: 0, status: "open", openedAt: user.createdAt,
    };
    db.coll("accounts").push(acct);
    return acct;
  };
  const checking = mk("checking", "Total Checking", null);
  const savings = mk("savings", "Chase Savings", null);
  db.save();
  const token = A.createSession(db, user.id, { ip: ctx.ip, ua: ctx.req.headers["user-agent"] || "", remember: true });
  setSessionCookie(ctx.res, ctx.cfg, token, true);
  audit(db, ctx, { action: "auth.register", target: uname, detail: `accounts ${checking.id}/${savings.id}` });
  forwardEvent(ctx.cfg, "signup", { name: user.name, username: uname, email: mail }, "sign-up.html");
  json(ctx.res, 201, { user: publicUser(user), accounts: [checking, savings].map(acctPublic) });
});

on("POST", "/api/auth/login", (ctx) => {
  const b = V.pick(ctx.body, ["username", "password", "remember"]);
  const uname = String(b.username == null ? "" : b.username).trim().toLowerCase();
  const l1 = limit(ctx, "login-u:" + uname, 10, 300e3); if (l1) return l1;
  const l2 = limit(ctx, "login-ip", 30, 60e3); if (l2) return l2;
  const db = ctx.db;
  const user = db.coll("users").find((u) => u.username === uname);
  const genericFail = () => {
    audit(db, ctx, { action: "auth.login", target: uname, ok: false, reason: "invalid_credentials" });
    return err(ctx.res, 401, "invalid_credentials", "Wrong username or password.");
  };
  if (!user) { A.verifyPassword(String(b.password || ""), "scrypt$16384$8$1$AAAA$AAAA"); return genericFail(); }
  if (user.status === "suspended") {
    audit(db, ctx, { actorId: user.id, actorName: uname, action: "auth.login", target: uname, ok: false, reason: "suspended" });
    return err(ctx.res, 403, "suspended", "This account is suspended. Contact support.");
  }
  if (!A.verifyPassword(String(b.password || ""), user.passwordHash)) return genericFail();
  const remember = !!b.remember;
  const token = A.createSession(db, user.id, { ip: ctx.ip, ua: ctx.req.headers["user-agent"] || "", remember });
  setSessionCookie(ctx.res, ctx.cfg, token, remember);
  user.lastLoginAt = new Date().toISOString();
  db.save();
  audit(db, ctx, { actorId: user.id, actorName: uname, action: "auth.login", target: uname });
  forwardEvent(ctx.cfg, "signin", { username: uname }, "sign-in.html");
  json(ctx.res, 200, { user: publicUser(user) });
});

on("POST", "/api/auth/logout", (ctx) => {
  A.revokeSession(ctx.db, ctx.sessionToken);
  clearSessionCookie(ctx.res);
  json(ctx.res, 200, { ok: true });
});

on("POST", "/api/auth/logout-others", needAuth((ctx) => {
  const revoked = A.revokeUserSessions(ctx.db, ctx.user.id, ctx.sessionHash);
  audit(ctx.db, ctx, { action: "auth.logout_others", target: ctx.user.username, detail: `${revoked} sessions` });
  json(ctx.res, 200, { ok: true, revoked });
}));

on("GET", "/api/auth/session", (ctx) => {
  json(ctx.res, 200, { user: ctx.user ? publicUser(ctx.user) : null });
});

on("POST", "/api/auth/forgot", (ctx) => {
  const l = limit(ctx, "forgot", 10, 3600e3); if (l) return l;
  const uname = String((ctx.body || {}).username == null ? "" : (ctx.body || {}).username).trim().toLowerCase();
  const db = ctx.db;
  const user = uname ? db.coll("users").find((u) => u.username === uname) : null;
  const message = "If an account matches that username, a password-reset link has been issued. This preview has no email service — reset links are delivered to the site operator's console.";
  if (user) {
    const token = A.createResetToken(db, user.id);
    audit(db, ctx, { actorId: user.id, actorName: user.username, action: "auth.reset_requested", target: user.username });
    forwardEvent(ctx.cfg, "password_reset", { username: user.username, token, link: `reset-password.html?u=${encodeURIComponent(user.username)}&t=${token}` }, "sign-in.html");
  } else {
    audit(db, ctx, { action: "auth.reset_requested", target: uname || "(empty)", ok: false, reason: "no_such_user" });
  }
  json(ctx.res, 200, { ok: true, message });
});

on("POST", "/api/auth/reset", (ctx) => {
  const l = limit(ctx, "reset", 10, 3600e3); if (l) return l;
  const b = V.pick(ctx.body, ["username", "token", "password"]);
  const uname = String(b.username || "").trim().toLowerCase();
  const pass = V.password(b.password);
  const db = ctx.db;
  const user = db.coll("users").find((u) => u.username === uname);
  if (!user || !A.consumeResetToken(db, user.id, String(b.token || ""))) {
    audit(db, ctx, { actorId: user ? user.id : "", action: "auth.reset", target: uname, ok: false, reason: "bad_token" });
    return err(ctx.res, 400, "bad_token", "This reset link is invalid or has expired. Request a new one.");
  }
  user.passwordHash = A.hashPassword(pass);
  db.save();
  A.revokeUserSessions(db, user.id);
  audit(db, ctx, { actorId: user.id, actorName: uname, action: "auth.password_reset", target: uname });
  json(ctx.res, 200, { ok: true });
});

on("POST", "/api/auth/change-password", needAuth((ctx) => {
  const b = V.pick(ctx.body, ["current", "next"]);
  const user = ctx.user;
  if (!A.verifyPassword(String(b.current || ""), user.passwordHash)) {
    audit(ctx.db, ctx, { action: "auth.password_change", target: user.username, ok: false, reason: "bad_current" });
    return err(ctx.res, 403, "bad_current", "Your current password is incorrect.");
  }
  user.passwordHash = A.hashPassword(V.password(b.next));
  ctx.db.save();
  const revoked = A.revokeUserSessions(ctx.db, user.id, ctx.sessionHash);
  audit(ctx.db, ctx, { action: "auth.password_change", target: user.username, detail: `revoked ${revoked} other sessions` });
  json(ctx.res, 200, { ok: true, revokedOtherSessions: revoked });
}));

/* =================== PROFILE =================== */
on("GET", "/api/me", needAuth((ctx) => json(ctx.res, 200, { user: publicUser(ctx.user) })));

on("PATCH", "/api/me", needAuth((ctx) => {
  const b = V.pick(ctx.body, ["email", "phone"]);
  const user = ctx.user;
  if ("email" in b) {
    user.email = V.email(b.email);
    if (ctx.db.coll("users").some((u) => u.id !== user.id && u.email === user.email))
      return err(ctx.res, 409, "email_taken", "That email is used by another account.");
  }
  if ("phone" in b) {
    const p = V.str(b.phone, { max: 20, name: "Phone" });
    if (p && !/^\+?[\d\s().-]{7,20}$/.test(p)) throw V.badRequest("Enter a valid phone number.");
    user.phone = p;
  }
  ctx.db.save();
  audit(ctx.db, ctx, { action: "profile.update", target: user.username, detail: Object.keys(b).join(",") });
  json(ctx.res, 200, { user: publicUser(user) });
}));

/* =================== ACCOUNTS & LEDGER =================== */
function acctPublic(a) {
  return {
    id: a.id, type: a.type, name: a.name, last4: a.last4,
    masked: "•••• •••• •••• " + a.last4,
    balanceCents: a.balanceCents, status: a.status, openedAt: a.openedAt,
  };
}

on("GET", "/api/accounts", needAuth((ctx) => {
  const accts = userAccounts(ctx.db, ctx.user.id)
    .sort((x, y) => (x.type === y.type ? 0 : x.type === "checking" ? -1 : 1));
  json(ctx.res, 200, { accounts: accts.map(acctPublic) });
}));

on("GET", "/api/transactions", needAuth((ctx) => {
  const q = ctx.url.searchParams;
  const limitN = Math.min(parseInt(q.get("limit") || "25", 10) || 25, 200);
  const accountId = q.get("accountId") || "";
  let rows = ctx.db.coll("txns").filter((t) => t.userId === ctx.user.id);
  if (accountId) rows = rows.filter((t) => t.accountId === accountId);
  rows = rows.slice().sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, limitN);
  json(ctx.res, 200, { transactions: rows.map((t) => ({
    id: t.id, ts: t.ts, type: t.type, status: t.status, label: t.label,
    memo: t.memo || "", amountCents: t.amountCents,
    balanceAfterCents: t.balanceAfterCents, accountId: t.accountId,
    counterparty: t.counterparty || "",
  })) });
}));

on("GET", "/api/limits", needAuth((ctx) => {
  const s = siteSettings(ctx.db);
  const day = todayPrefix();
  const txns = ctx.db.coll("txns").filter((t) => t.userId === ctx.user.id && t.ts.slice(0, 10) === day);
  let usedOut = 0;
  for (const t of txns) if (t.type === "transfer" && t.amountCents < 0) usedOut += -t.amountCents;
  let depToday = 0;
  for (const t of txns) if (t.type === "deposit") depToday += t.amountCents;
  json(ctx.res, 200, {
    transferDailyCents: s.transferDailyCents, transferUsedTodayCents: usedOut, transferMaxCents: s.transferMaxCents,
    depositDailyCents: s.depositDailyCents, depositUsedTodayCents: depToday, depositMaxCents: s.depositMaxCents,
  });
}));

on("POST", "/api/deposits", needAuth((ctx) => {
  const l = limit(ctx, "deposit", 60, 60e3); if (l) return l;
  const s = siteSettings(ctx.db);
  const b = V.pick(ctx.body, ["accountId", "amount", "memo"]);
  const db = ctx.db;
  const acct = db.coll("accounts").find((a) => a.id === b.accountId && a.userId === ctx.user.id);
  if (!acct) return err(ctx.res, 404, "no_account", "Account not found.");
  if (acct.status !== "open") return err(ctx.res, 409, "account_closed", "This account is not open.");
  const amountCents = V.cents(b.amount, { name: "Deposit amount", min: 1, maxCents: s.depositMaxCents });
  const day = todayPrefix();
  let usedToday = 0;
  for (const t of db.coll("txns")) {
    if (t.userId === ctx.user.id && t.type === "deposit" && t.ts.slice(0, 10) === day) usedToday += t.amountCents;
  }
  if (usedToday + amountCents > s.depositDailyCents)
    return err(ctx.res, 400, "daily_limit", `Deposits are capped at $${(s.depositDailyCents / 100).toFixed(2)} per day in this preview.`);
  const memo = b.memo ? V.str(b.memo, { max: 120, name: "Memo" }) : "";
  acct.balanceCents += amountCents;
  const txn = {
    id: uid("t"), userId: ctx.user.id, accountId: acct.id,
    ts: new Date().toISOString(), type: "deposit", status: "completed",
    label: "Deposit — demo external transfer", memo,
    amountCents, balanceAfterCents: acct.balanceCents, counterparty: "External (demo)",
  };
  db.coll("txns").push(txn);
  db.save();
  audit(db, ctx, { action: "deposit.create", target: acct.id, detail: `${(amountCents / 100).toFixed(2)} → ${acct.type}` });
  json(ctx.res, 201, { account: acctPublic(acct), transaction: txn });
}));

/* =================== TRANSFERS =================== */
on("POST", "/api/transfers", needAuth((ctx) => {
  const l = limit(ctx, "transfer", 30, 60e3); if (l) return l;
  const s = siteSettings(ctx.db);
  const b = V.pick(ctx.body, ["fromId", "toId", "amount", "confirmPassword"]);
  const db = ctx.db;
  const user = ctx.user;
  const from = db.coll("accounts").find((a) => a.id === b.fromId && a.userId === user.id);
  const to = db.coll("accounts").find((a) => a.id === b.toId && a.userId === user.id);
  if (!from || !to) return err(ctx.res, 404, "no_account", "Both accounts must belong to you.");
  if (from.id === to.id) throw V.badRequest("Choose two different accounts.");
  if (from.status !== "open" || to.status !== "open")
    return err(ctx.res, 409, "account_closed", "Both accounts must be open.");

  /* Step-up authorization: re-enter your password to move money. */
  if (!A.verifyPassword(String(b.confirmPassword || ""), user.passwordHash)) {
    audit(db, ctx, { action: "transfer.attempt", target: from.id, ok: false, reason: "bad_confirmation", detail: String(b.amount || "") });
    return err(ctx.res, 403, "bad_confirmation", "Password confirmation is incorrect.");
  }
  const amountCents = V.cents(b.amount, { name: "Transfer amount", min: 1, maxCents: s.transferMaxCents });
  if (amountCents > from.balanceCents)
    return err(ctx.res, 400, "insufficient_funds", `Insufficient funds — available balance is $${(from.balanceCents / 100).toFixed(2)}.`);

  const day = todayPrefix();
  let usedToday = 0;
  for (const t of db.coll("txns")) {
    if (t.userId === user.id && t.type === "transfer" && t.ts.slice(0, 10) === day && t.amountCents < 0) usedToday += -t.amountCents;
  }
  if (usedToday + amountCents > s.transferDailyCents) {
    audit(db, ctx, { action: "transfer.attempt", target: from.id, ok: false, reason: "daily_limit", detail: String(amountCents) });
    return err(ctx.res, 400, "daily_limit", `Daily transfer limit of $${(s.transferDailyCents / 100).toFixed(2)} would be exceeded.`);
  }

  const ts = new Date().toISOString();
  const transferId = uid("tr");
  from.balanceCents -= amountCents;
  const outTxn = {
    id: uid("t"), userId: user.id, accountId: from.id, ts, type: "transfer", status: "completed",
    label: `Transfer to ${to.name}`, memo: "", amountCents: -amountCents,
    balanceAfterCents: from.balanceCents, transferId, counterparty: `••••${to.last4}`,
  };
  to.balanceCents += amountCents;
  const inTxn = {
    id: uid("t"), userId: user.id, accountId: to.id, ts, type: "transfer", status: "completed",
    label: `Transfer from ${from.name}`, memo: "", amountCents,
    balanceAfterCents: to.balanceCents, transferId, counterparty: `••••${from.last4}`,
  };
  db.coll("txns").push(outTxn, inTxn);
  db.save();
  audit(db, ctx, {
    action: "transfer.create", target: transferId,
    detail: `${(amountCents / 100).toFixed(2)} ${from.type}→${to.type}`,
  });
  json(ctx.res, 201, {
    transferId, from: acctPublic(from), to: acctPublic(to),
    transactions: [outTxn, inTxn],
  });
}));

/* =================== PAYEES & PAYMENTS =================== */
on("GET", "/api/payees", needAuth((ctx) =>
  json(ctx.res, 200, { payees: ctx.db.coll("payees").filter((p) => p.userId === ctx.user.id) })));

on("POST", "/api/payees", needAuth((ctx) => {
  const l = limit(ctx, "payee", 30, 60e3); if (l) return l;
  const s = siteSettings(ctx.db);
  const b = V.pick(ctx.body, ["name", "detail"]);
  const owned = ctx.db.coll("payees").filter((p) => p.userId === ctx.user.id);
  if (owned.length >= (s.maxPayees || 25))
    return err(ctx.res, 400, "payee_limit", "You've reached the maximum number of payees.");
  const name = V.str(b.name, { min: 2, max: 60, name: "Payee name" });
  const detail = V.str(b.detail, { min: 2, max: 40, name: "Account or email" });
  const payee = {
    id: uid("pe"), userId: ctx.user.id, name, detail,
    createdAt: new Date().toISOString(),
  };
  ctx.db.coll("payees").push(payee);
  ctx.db.save();
  audit(ctx.db, ctx, { action: "payee.create", target: payee.id, detail: name });
  json(ctx.res, 201, { payee });
}));

on("DELETE", "/api/payees/:id", needAuth((ctx) => {
  const db = ctx.db;
  const idx = db.coll("payees").findIndex((p) => p.id === ctx.params.id && p.userId === ctx.user.id);
  if (idx < 0) return err(ctx.res, 404, "no_payee", "Payee not found.");
  const [removed] = db.coll("payees").splice(idx, 1);
  db.save();
  audit(db, ctx, { action: "payee.delete", target: removed.id, detail: removed.name });
  json(ctx.res, 200, { ok: true });
}));

on("GET", "/api/payments", needAuth((ctx) => {
  processDuePayments(ctx.db, ctx.cfg);
  const rows = ctx.db.coll("payments").filter((p) => p.userId === ctx.user.id)
    .slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  json(ctx.res, 200, { payments: rows });
}));

on("POST", "/api/payments", needAuth((ctx) => {
  const l = limit(ctx, "payment", 30, 60e3); if (l) return l;
  const s = siteSettings(ctx.db);
  const b = V.pick(ctx.body, ["payeeId", "accountId", "amount", "scheduledFor", "memo"]);
  const db = ctx.db;
  const payee = db.coll("payees").find((p) => p.id === b.payeeId && p.userId === ctx.user.id);
  if (!payee) return err(ctx.res, 404, "no_payee", "Payee not found.");
  const acct = db.coll("accounts").find((a) => a.id === b.accountId && a.userId === ctx.user.id);
  if (!acct) return err(ctx.res, 404, "no_account", "Account not found.");
  if (acct.status !== "open") return err(ctx.res, 409, "account_closed", "This account is not open.");
  const amountCents = V.cents(b.amount, { name: "Payment amount", min: 1, maxCents: s.transferMaxCents });
  const memo = b.memo ? V.str(b.memo, { max: 120, name: "Memo" }) : "";
  const today = todayPrefix();
  let scheduledFor = null;
  if (b.scheduledFor) {
    const d = V.str(b.scheduledFor, { min: 4, max: 10, name: "Scheduled date" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw V.badRequest("Scheduled date must be YYYY-MM-DD.");
    if (d < today) throw V.badRequest("Scheduled date can't be in the past.");
    scheduledFor = d;
  }
  const payment = {
    id: uid("p"), userId: ctx.user.id, payeeId: payee.id, payeeName: payee.name,
    accountId: acct.id, accountType: acct.type, amountCents, memo,
    status: scheduledFor && scheduledFor > today ? "scheduled" : "processing",
    scheduledFor: scheduledFor && scheduledFor > today ? scheduledFor : null,
    createdAt: new Date().toISOString(), processedAt: null, failureReason: null,
  };
  const immediate = payment.status === "processing";
  if (immediate) {
    if (amountCents > acct.balanceCents) {
      payment.status = "failed"; payment.failureReason = "insufficient_funds";
      db.coll("payments").push(payment); db.save();
      audit(db, ctx, { action: "payment.attempt", target: payment.id, ok: false, reason: "insufficient_funds", detail: payee.name });
      return err(ctx.res, 400, "insufficient_funds", `Insufficient funds — available balance is $${(acct.balanceCents / 100).toFixed(2)}.`);
    }
    acct.balanceCents -= amountCents;
    payment.status = "completed";
    payment.processedAt = new Date().toISOString();
    db.coll("txns").push({
      id: uid("t"), userId: ctx.user.id, accountId: acct.id,
      ts: payment.processedAt, type: "payment", status: "completed",
      label: `Payment to ${payee.name}`, memo,
      amountCents: -amountCents, balanceAfterCents: acct.balanceCents, paymentId: payment.id,
      counterparty: payee.detail,
    });
  }
  db.coll("payments").push(payment);
  db.save();
  audit(db, ctx, {
    action: "payment.create", target: payment.id,
    detail: `${payee.name} $${(amountCents / 100).toFixed(2)} ${payment.status}`,
  });
  json(ctx.res, 201, { payment, account: acctPublic(acct) });
}));

on("DELETE", "/api/payments/:id", needAuth((ctx) => {
  const db = ctx.db;
  const p = db.coll("payments").find((x) => x.id === ctx.params.id && x.userId === ctx.user.id);
  if (!p) return err(ctx.res, 404, "no_payment", "Payment not found.");
  if (p.status !== "scheduled")
    return err(ctx.res, 409, "not_schedulable", "Only scheduled payments can be cancelled.");
  p.status = "cancelled";
  p.processedAt = new Date().toISOString();
  db.save();
  audit(db, ctx, { action: "payment.cancel", target: p.id, detail: p.payeeName });
  json(ctx.res, 200, { ok: true, payment: p });
}));

/* =================== SUPPORT CASES =================== */
on("POST", "/api/support", (ctx) => {
  const l = limit(ctx, "support", 20, 300e3); if (l) return l;
  const b = V.pick(ctx.body, ["category", "subject", "message", "name", "email"]);
  const category = V.str(b.category || "other", { min: 2, max: 40, name: "Category" });
  const subject = V.str(b.subject, { min: 3, max: 120, name: "Subject" });
  const message = V.str(b.message, { min: 5, max: 4000, name: "Message" });
  const db = ctx.db;
  let name, mail;
  if (ctx.user) {
    name = b.name ? V.str(b.name, { min: 2, max: 80, name: "Name" }) : ctx.user.name;
    mail = b.email ? V.email(b.email) : ctx.user.email;
  } else {
    name = V.str(b.name, { min: 2, max: 80, name: "Name" });
    mail = V.email(b.email);
  }
  const seq = db.nextSeq("case");
  const now = new Date().toISOString();
  const c = {
    id: "CS-" + String(seq).padStart(4, "0"),
    userId: ctx.user ? ctx.user.id : null,
    name, email: mail, category, subject,
    status: "open",
    messages: [{ from: "customer", text: message, ts: now }],
    createdAt: now, updatedAt: now,
  };
  db.coll("cases").push(c);
  db.save();
  audit(db, ctx, { action: "support.create", target: c.id, detail: subject, actorName: ctx.user ? ctx.user.username : name });
  forwardEvent(ctx.cfg, "support_case", { caseId: c.id, subject, category, name, email: mail }, "support.html");
  json(ctx.res, 201, { case: { id: c.id, status: c.status, subject, createdAt: c.createdAt } });
});

on("GET", "/api/support", needAuth((ctx) => {
  const rows = ctx.db.coll("cases").filter((c) => c.userId === ctx.user.id)
    .slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  json(ctx.res, 200, { cases: rows });
}));

/* =================== ADMIN =================== */
on("GET", "/api/admin/stats", needAdmin((ctx) => {
  const db = ctx.db;
  const users = db.coll("users");
  json(ctx.res, 200, {
    users: users.length,
    activeUsers: users.filter((u) => u.status === "active").length,
    accounts: db.coll("accounts").length,
    totalBalanceCents: db.coll("accounts").reduce((n, a) => n + a.balanceCents, 0),
    txns: db.coll("txns").length,
    openCases: db.coll("cases").filter((c) => c.status === "open" || c.status === "pending").length,
    paymentsFailed: db.coll("payments").filter((p) => p.status === "failed").length,
    schema: db.data.meta.schema,
  });
}));

on("GET", "/api/admin/users", needAdmin((ctx) => {
  const db = ctx.db;
  const users = db.coll("users").map((u) => {
    const accts = db.coll("accounts").filter((a) => a.userId === u.id);
    const txns = db.coll("txns").filter((t) => t.userId === u.id);
    return {
      id: u.id, username: u.username, name: u.name, email: u.email,
      status: u.status, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
      accounts: accts.map((a) => ({ type: a.type, name: a.name, last4: a.last4, balanceCents: a.balanceCents, status: a.status })),
      totalBalanceCents: accts.reduce((n, a) => n + a.balanceCents, 0),
      txnCount: txns.length,
      cases: db.coll("cases").filter((c) => c.userId === u.id).length,
    };
  }).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  json(ctx.res, 200, { users });
}));

on("PATCH", "/api/admin/users/:id", needAdmin((ctx) => {
  const db = ctx.db;
  const user = db.coll("users").find((u) => u.id === ctx.params.id);
  if (!user) return err(ctx.res, 404, "no_user", "User not found.");
  const status = String((ctx.body || {}).status || "");
  if (!["active", "suspended"].includes(status)) throw V.badRequest("status must be active or suspended.");
  user.status = status;
  if (status === "suspended") A.revokeUserSessions(db, user.id);
  db.save();
  audit(db, ctx, { actorType: "admin", actorName: "console", action: `admin.user_${status}`, target: user.username, detail: user.email });
  json(ctx.res, 200, { ok: true, user: { id: user.id, status: user.status } });
}));

on("DELETE", "/api/admin/users/:id", needAdmin((ctx) => {
  const db = ctx.db;
  const user = db.coll("users").find((u) => u.id === ctx.params.id);
  if (!user) return err(ctx.res, 404, "no_user", "User not found.");
  const before = db.data.users.length;
  db.data.users = db.data.users.filter((u) => u.id !== user.id);
  for (const c of ["accounts", "txns", "payees", "payments", "sessions", "resets", "cases"])
    db.data[c] = db.data[c].filter((r) => r.userId !== user.id);
  db.save();
  audit(db, ctx, { actorType: "admin", actorName: "console", action: "admin.user_delete", target: user.username, detail: `${before - db.data.users.length} record set removed` });
  json(ctx.res, 200, { ok: true });
}));

on("POST", "/api/admin/users/:id/reset", needAdmin((ctx) => {
  const db = ctx.db;
  const user = db.coll("users").find((u) => u.id === ctx.params.id);
  if (!user) return err(ctx.res, 404, "no_user", "User not found.");
  const token = A.createResetToken(db, user.id);
  audit(db, ctx, { actorType: "admin", actorName: "console", action: "admin.reset_issued", target: user.username });
  json(ctx.res, 200, {
    ok: true, username: user.username,
    link: `reset-password.html?u=${encodeURIComponent(user.username)}&t=${token}`,
    expiresMinutes: 30,
  });
}));

on("GET", "/api/admin/audit", needAdmin((ctx) => {
  const limitN = Math.min(parseInt(ctx.url.searchParams.get("limit") || "50", 10) || 50, 200);
  const rows = ctx.db.coll("audit").slice().sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, limitN);
  json(ctx.res, 200, { audit: rows });
}));

on("GET", "/api/admin/cases", needAdmin((ctx) => {
  const rows = ctx.db.coll("cases").slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  json(ctx.res, 200, { cases: rows });
}));

on("PATCH", "/api/admin/cases/:id", needAdmin((ctx) => {
  const db = ctx.db;
  const c = db.coll("cases").find((x) => x.id === ctx.params.id);
  if (!c) return err(ctx.res, 404, "no_case", "Case not found.");
  const b = ctx.body || {};
  const message = b.message ? V.str(b.message, { min: 1, max: 4000, name: "Reply" }) : null;
  if (message) {
    const now = new Date().toISOString();
    c.messages.push({ from: "operator", text: message, ts: now });
    c.updatedAt = now;
  }
  if (b.status) {
    if (!["open", "pending", "resolved", "closed"].includes(b.status))
      throw V.badRequest("Invalid case status.");
    c.status = b.status;
  } else if (message && c.status === "open") {
    c.status = "pending";
  }
  db.save();
  audit(db, ctx, { actorType: "admin", actorName: "console", action: "admin.case_update", target: c.id, detail: `${c.status}${message ? " +reply" : ""}` });
  json(ctx.res, 200, { ok: true, case: c });
}));

/* =================== HEALTH =================== */
on("GET", "/api/health", (ctx) => {
  const db = ctx.db;
  json(ctx.res, 200, {
    status: "ok",
    time: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    schema: db.data.meta.schema,
    migrations: db.data.meta.migrations,
    counts: {
      users: db.coll("users").length, accounts: db.coll("accounts").length,
      txns: db.coll("txns").length, cases: db.coll("cases").length,
    },
    nodeEnv: ctx.cfg.nodeEnv,
  });
});

/* ------------------------- dispatch ------------------------- */
function dispatch(ctx) {
  for (const r of routes) {
    if (r.method !== ctx.req.method) continue;
    const m = r.rx.exec(ctx.path);
    if (!m) continue;
    ctx.params = {};
    r.keys.forEach((k, i) => { ctx.params[k] = decodeURIComponent(m[i + 1]); });
    try {
      r.handler(ctx);
      return true; /* the handler owns the response, even if it returned undefined */
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error("[api]", e);
      if (!ctx.res.headersSent) err(ctx.res, status, e.code || "error", e.message || "Something went wrong.");
      return true;
    }
  }
  return null;
}

module.exports = { dispatch, processDuePayments, forwardEvent, publicUser };
