/* 004 — operator-issued invoices payable from the customer dashboard. */
"use strict";
module.exports = {
  schema: 4,
  name: "invoices",
  up(db) {
    const d = db.data;
    if (!Array.isArray(d.invoices)) d.invoices = [];
    d.meta.schema = 4;
  },
};
