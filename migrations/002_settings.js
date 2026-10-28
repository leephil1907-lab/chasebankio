/* 002 — site-wide settings defaults (limits used by transfers/deposits). */
"use strict";
module.exports = {
  schema: 2,
  name: "site settings + money limits",
  up(db) {
    const d = db.data;
    if (!d.settings.some((s) => s.id === "site")) {
      d.settings.push({
        id: "site",
        currency: "USD",
        /* Money limits, in cents — enforced server-side on every movement. */
        transferDailyCents: 500000,     /* $5,000 per day across transfers  */
        transferMaxCents: 250000,       /* $2,500 per single transfer       */
        depositDailyCents: 1000000,     /* $10,000 per day in demo deposits */
        depositMaxCents: 500000,        /* $5,000 per single demo deposit   */
        maxPayees: 25,
        updatedAt: new Date().toISOString(),
      });
    }
    d.meta.schema = 2;
  },
};
