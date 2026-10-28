/* Standalone migration runner: npm run migrate */
"use strict";
const path = require("path");
const { DB } = require("../server/db");
const dir = path.resolve(__dirname, "..", process.env.DATA_DIR || "data");
const migDir = path.resolve(__dirname, "..", "migrations");
const db = new DB(dir).load();
const res = db.applyMigrations(migDir);
console.log(`db: ${dir}`);
console.log(`schema v${res.schema}; ${res.applied.length ? "applied: " + res.applied.join(", ") : "already up to date"}`);
