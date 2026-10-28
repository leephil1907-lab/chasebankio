/* ============================================================
   notify.js — site → admin notification client.
   • Meaningful events (feedback, meeting, signup, signin, chat
     handoff) POST to the admin console endpoint; if it is offline
     they queue in this browser and auto-flush later — status text
     is always honest about which happened.
   • A random per-browser visitor id rides on every event so the
     console can piece together one visitor's journey.
   • page_view beacons are best-effort ONLY (never queued) so the
     activity feed stays live without ever flooding the outbox.
   ============================================================ */
(() => {
  "use strict";

  const QUEUE_KEY = "chase_notify_outbox";
  const VISITOR_KEY = "chase_visitor";
  const MAX_QUEUE = 50;

  /* Stable anonymous id for this browser (no personal data). */
  const visitor = (() => {
    try {
      let v = localStorage.getItem(VISITOR_KEY);
      if (!v) {
        v = "vis_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
        localStorage.setItem(VISITOR_KEY, v);
      }
      return v;
    } catch { return "vis_anon"; }
  })();

  const readQueue = () => {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); }
    catch { return []; }
  };
  const writeQueue = (q) => {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE))); }
    catch { /* storage full/blocked */ }
  };

  const endpoint = () => (window.SiteConfig && window.SiteConfig.endpoint) ? window.SiteConfig.endpoint() : "";

  const post = async (path, body) => {
    const base = endpoint();
    if (!base) throw new Error("no-endpoint");
    const res = await fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true
    });
    if (!res.ok) throw new Error("http-" + res.status);
    return res.json().catch(() => ({}));
  };

  const attempt = async (event) => {
    await post("/api/events", event);
    return "sent";
  };

  const flush = async () => {
    const q = readQueue();
    if (!q.length || !endpoint()) return 0;
    const remaining = [];
    let sent = 0;
    let failed = false;
    for (let i = 0; i < q.length; i++) {
      if (failed) { remaining.push(q[i]); continue; } // keep unattempted events
      try {
        await attempt(q[i]);
        sent++;
      } catch {
        failed = true;
        remaining.push(q[i]);
      }
    }
    writeQueue(remaining);
    if (sent) document.dispatchEvent(new CustomEvent("notify:flushed", { detail: { sent } }));
    return sent;
  };

  const send = async (type, payload) => {
    const event = {
      id: "ev_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      type,
      payload: payload || {},
      page: location.pathname + location.search,
      visitor,
      ts: new Date().toISOString()
    };
    // Wait for config so the endpoint is known.
    if (window.SiteConfig && window.SiteConfig.ready) {
      try { await window.SiteConfig.ready; } catch {}
    }
    try {
      await attempt(event);
      flush(); // opportunistically drain anything queued
      return { status: "sent", event };
    } catch {
      const q = readQueue();
      q.push(event);
      writeQueue(q);
      return { status: "queued", event };
    }
  };

  /* Best-effort page view — never queued, dropped silently if offline. */
  const pageView = async () => {
    if (window.SiteConfig && window.SiteConfig.ready) {
      try { await window.SiteConfig.ready; } catch {}
    }
    try {
      await post("/api/events", {
        id: "pv_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        type: "page_view",
        payload: {
          title: document.title.split("|")[0].trim().slice(0, 80),
          w: innerWidth, h: innerHeight
        },
        page: location.pathname + location.search,
        visitor,
        ts: new Date().toISOString()
      });
    } catch { /* console offline — views are dropped, not queued */ }
  };

  const pending = () => readQueue().length;

  window.SiteNotify = { send, flush, pending, endpoint, visitor, pageView };

  /* Boot: flush the outbox, then report the view. */
  const boot = async () => {
    if (window.SiteConfig && window.SiteConfig.ready) {
      try { await window.SiteConfig.ready; } catch {}
    }
    flush();
    pageView();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  window.setInterval(() => { if (readQueue().length) flush(); }, 45000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && readQueue().length) flush();
  });
})();
