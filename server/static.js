/* Static file serving with traversal protection, ETag and designed 404s. */
"use strict";
const fs = require("fs");
const path = require("path");
const { cspFor } = require("./security");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function notFound(req, res, root, cfg, applyHeaders) {
  const page = path.join(root, "404.html");
  fs.readFile(page, (e, buf) => {
    if (e) {
      applyHeaders(req, res, cfg, null);
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("404 — not found");
    }
    applyHeaders(req, res, cfg, cspFor(buf, cfg));
    res.writeHead(404, { "Content-Type": MIME[".html"], "Content-Length": buf.length });
    res.end(buf);
  });
}

function serveStatic(req, res, cfg, applyHeaders) {
  const root = cfg.root;
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://x").pathname); }
  catch { applyHeaders(req, res, cfg, null); res.writeHead(400); return res.end("Bad request"); }

  if (pathname.endsWith("/")) pathname += "index.html";
  const abs = path.normalize(path.join(root, pathname));
  if (abs !== root && !abs.startsWith(root + path.sep)) return notFound(req, res, root, cfg, applyHeaders);

  fs.stat(abs, (e, st) => {
    if (e || !st.isFile()) {
      /* Extensionless or missing → designed 404 (with .html → try literal first). */
      return notFound(req, res, root, cfg, applyHeaders);
    }
    const ext = path.extname(abs).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    const etag = `W/"${st.size}-${Math.floor(st.mtimeMs)}"`;
    if (req.headers["if-none-match"] === etag) {
      applyHeaders(req, res, cfg, null);
      res.writeHead(304, { ETag: etag });
      return res.end();
    }
    fs.readFile(abs, (err2, buf) => {
      if (err2) return notFound(req, res, root, cfg, applyHeaders);
      /* HTML gets a CSP built from its own inline scripts; assets get none. */
      applyHeaders(req, res, cfg, ext === ".html" ? cspFor(buf, cfg) : null);
      const headers = {
        "Content-Type": type,
        "Content-Length": buf.length,
        ETag: etag,
        "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300",
      };
      res.writeHead(200, headers);
      if (req.method === "HEAD") return res.end();
      res.end(buf);
    });
  });
}

module.exports = { serveStatic, MIME };
