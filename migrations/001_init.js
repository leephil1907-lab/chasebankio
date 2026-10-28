/* 001 — core schema: every collection the app uses. */
"use strict";
module.exports = {
  schema: 1,
  name: "core schema",
  up(db) {
    const d = db.data;
    d.meta.migrations = d.meta.migrations || [];
    d.meta.seq = d.meta.seq || {};
    for (const c of ["users", "accounts", "txns", "payees", "payments",
                     "sessions", "resets", "cases", "audit", "settings"]) {
      if (!Array.isArray(d[c])) d[c] = [];
    }
    d.meta.schema = 1;
  },
};
