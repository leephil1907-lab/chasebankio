/* 003 — withdrawal requests (operator-approval money movement). */
"use strict";
module.exports = {
  schema: 3,
  name: "withdrawal requests",
  up(db) {
    const d = db.data;
    if (!Array.isArray(d.withdrawals)) d.withdrawals = [];
    d.meta.schema = 3;
  },
};
