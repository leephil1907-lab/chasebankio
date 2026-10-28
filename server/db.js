/* Zero-dependency JSON datastore with atomic writes and a migration runner.
   Money is stored as integer cents everywhere. Single-process writes only. */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const COLLECTIONS = [
  "users", "accounts", "txns", "payees", "payments",
  "sessions", "resets", "cases", "audit", "settings",
];

class DB {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, "db.json");
    this.data = null;
    this._queue = Promise.resolve();
  }

  load() {
    fs.mkdirSync(this.dir, { recursive: true });
    let raw = null;
    try { raw = fs.readFileSync(this.file, "utf8"); } catch (e) { if (e.code !== "ENOENT") throw e; }
    if (raw) {
      try { this.data = JSON.parse(raw); }
      catch (e) {
        const bak = this.file + ".corrupt-" + Date.now();
        fs.renameSync(this.file, bak);
        console.error(`[db] corrupt db moved to ${bak} (${e.message})`);
        this.data = null;
      }
    }
    if (!this.data) this.data = {};
    this.data.meta = this.data.meta || { schema: 0, migrations: [], seq: {}, devSecret: null };
    for (const c of COLLECTIONS) this.data[c] = Array.isArray(this.data[c]) ? this.data[c] : [];
    return this;
  }

  /* Atomic save: write temp file then rename over the target. Serialized. */
  save() {
    const json = JSON.stringify(this.data, null, 1);
    this._queue = this._queue.then(() => new Promise((resolve, reject) => {
      const tmp = this.file + "." + process.pid + ".tmp";
      fs.writeFile(tmp, json, (err) => {
        if (err) return reject(err);
        fs.rename(tmp, this.file, (err2) => (err2 ? reject(err2) : resolve()));
      });
    })).catch((e) => { console.error("[db] save failed:", e.message); });
    return this._queue;
  }

  saveSync() {
    const tmp = this.file + "." + process.pid + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 1));
    fs.renameSync(tmp, this.file);
  }

  coll(name) {
    if (!this.data[name]) throw new Error("unknown collection: " + name);
    return this.data[name];
  }

  nextSeq(key) {
    this.data.meta.seq[key] = (this.data.meta.seq[key] || 0) + 1;
    return this.data.meta.seq[key];
  }

  /* ---------------- migrations ---------------- */
  applyMigrations(dir) {
    let files = [];
    try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".js")).sort(); }
    catch { return { applied: [], schema: this.data.meta.schema }; }
    const applied = [];
    for (const f of files) {
      const id = f.replace(/\.js$/, "");
      if (this.data.meta.migrations.includes(id)) continue;
      const m = require(path.join(dir, f));
      if (typeof m.up !== "function") throw new Error(`migration ${f} has no up()`);
      m.up(this);
      if (!this.data.meta.migrations.includes(id)) this.data.meta.migrations.push(id);
      this.data.meta.schema = Math.max(this.data.meta.schema, m.schema || 0);
      this.saveSync();
      applied.push(id);
      console.log(`[db] migration applied: ${id}`);
    }
    return { applied, schema: this.data.meta.schema };
  }
}

/* ------------------------- helpers ------------------------- */
const uid = (prefix) => `${prefix}_${crypto.randomBytes(9).toString("base64url")}`;
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

module.exports = { DB, uid, sha256, COLLECTIONS };
