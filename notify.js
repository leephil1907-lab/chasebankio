/* ============================================================
   notify.js — site → admin notification client.
   Events (feedback, meeting requests, sign-ups, sign-ins) are
   POSTed to the admin console endpoint from site-config.json.
   If the console is offline the event is queued in this browser
   and flushed automatically later — status text everywhere is
   honest about which of the two happened.
   ============================================================ */
(() => {
  "use strict";

  const QUEUE_KEY = "chase_notify_outbox";
  const MAX_QUEUE = 50;

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

  const pending = () => readQueue().length;

  window.SiteNotify = { send, flush, pending, endpoint };

  /* Flush when the console comes online: on boot and periodically. */
  const boot = async () => {
    if (window.SiteConfig && window.SiteConfig.ready) {
      try { await window.SiteConfig.ready; } catch {}
    }
    flush();
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
