/* Password hashing (scrypt), sessions, reset tokens and rate limiting.
   Zero dependencies — Node crypto only. */
"use strict";
const crypto = require("crypto");

/* ------------------------- passwords ------------------------- */
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function hashPassword(password) {
  if (typeof password !== "string" || password.length < 8 || password.length > 200)
    throw new Error("invalid password");
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

function verifyPassword(password, stored) {
  try {
    const [alg, N, r, p, saltB64, hashB64] = String(stored).split("$");
    if (alg !== "scrypt") return false;
    const salt = Buffer.from(saltB64, "base64");
    const expect = Buffer.from(hashB64, "base64");
    const got = crypto.scryptSync(password, salt, expect.length, {
      N: +N, r: +r, p: +p, maxmem: SCRYPT.maxmem,
    });
    return got.length === expect.length && crypto.timingSafeEqual(got, expect);
  } catch {
    return false;
  }
}

/* ------------------------- sessions ------------------------- */
/* Cookie carries a raw random token; only its sha256 is stored. */
function createSession(db, userId, meta = {}) {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  db.coll("sessions").push({
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    userId,
    createdAt: now,
    lastSeen: now,
    expiresAt: now + (meta.remember ? 7 * 864e5 : 12 * 36e5),
    ip: meta.ip || "",
    ua: (meta.ua || "").slice(0, 200),
    revoked: false,
  });
  db.save();
  return token;
}

function findSession(db, token) {
  if (!token) return null;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const s = db.coll("sessions").find((x) => x.tokenHash === hash);
  if (!s || s.revoked) return null;
  if (s.expiresAt < Date.now()) { s.revoked = true; db.save(); return null; }
  /* Sliding renewal — persisted at most once a minute to avoid disk churn. */
  const window = s.expiresAt - s.createdAt;
  if (Date.now() - s.createdAt > window * 0.25) {
    s.expiresAt = Date.now() + Math.max(window, 36e5);
    if (Date.now() - (s.lastSeen || 0) > 60e3) {
      s.lastSeen = Date.now();
      db.save();
    }
  }
  return s;
}

function revokeSession(db, token) {
  if (!token) return false;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const s = db.coll("sessions").find((x) => x.tokenHash === hash && !x.revoked);
  if (!s) return false;
  s.revoked = true; db.save(); return true;
}

function revokeUserSessions(db, userId, exceptTokenHash = null) {
  let n = 0;
  for (const s of db.coll("sessions")) {
    if (s.userId === userId && !s.revoked && s.tokenHash !== exceptTokenHash) {
      s.revoked = true; n++;
    }
  }
  if (n) db.save();
  return n;
}

/* ------------------------- reset tokens ------------------------- */
function createResetToken(db, userId) {
  const token = crypto.randomBytes(24).toString("base64url");
  db.coll("resets").push({
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 60 * 1000,
    used: false,
  });
  db.save();
  return token;
}

function consumeResetToken(db, userId, token) {
  if (!token) return false;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const r = db.coll("resets").find((x) => x.tokenHash === hash && x.userId === userId);
  if (!r || r.used || r.expiresAt < Date.now()) return false;
  r.used = true;
  db.save();
  return true;
}

/* ------------------------- rate limiting ------------------------- */
class RateLimiter {
  constructor() { this.buckets = new Map(); this._sweep = setInterval(() => this.sweep(), 60e3); }
  /* Returns null when allowed, or ms until reset when limited. */
  check(key, limit, windowMs) {
    const now = Date.now();
    let b = this.buckets.get(key);
    if (!b || b.resetAt <= now) { b = { count: 0, resetAt: now + windowMs }; this.buckets.set(key, b); }
    b.count++;
    if (b.count > limit) return b.resetAt - now;
    return null;
  }
  sweep() {
    const now = Date.now();
    for (const [k, b] of this.buckets) if (b.resetAt <= now) this.buckets.delete(k);
  }
  stop() { clearInterval(this._sweep); }
}

module.exports = {
  hashPassword, verifyPassword,
  createSession, findSession, revokeSession, revokeUserSessions,
  createResetToken, consumeResetToken,
  RateLimiter,
};
