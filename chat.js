/* ============================================================
   chat.js — customer support chat widget.
   • Every message the customer sends is delivered straight to the
     admin console thread (site-config.json endpoint) — there is no
     handoff step. If the console is offline the message is queued
     in this browser and delivered automatically later.
   • Knowledge-base answers give instant information inside the
     same thread; admin replies are polled from the console and
     shown live while the panel is open. A status pill always
     states whether customer support is online or replies are pending.
   ============================================================ */
(() => {
  "use strict";

  const G = window.SiteConfig || null;
  const LOG_KEY = "chase_chat_log";
  const THREAD_KEY = "chase_chat_thread";

  /* ---------------- knowledge base (local-first) ---------------- */
  const KB = [
    { id: "greeting", re: /^(hi|hello|hey|good (morning|afternoon|evening))\b/i,
      say: "Hello! Ask about checking, savings, credit cards, home loans, auto, investing or business banking — or type anything to reach customer support; their replies appear right in this chat.",
      links: [["Open an account", "sign-up.html"], ["Support options", "support.html"]] },
    { id: "checking", re: /\b(checking|current account|debit account|total checking|secure banking|student checking)\b/i,
      say: "We have three checking accounts: Chase Total Checking® (most popular, $300 new-customer bonus with qualifying direct deposit), Chase Secure Banking℠ (no overdraft fee, no personal checks) and Chase Student Checking. You can compare them side by side.",
      links: [["Compare checking accounts", "checking.html"], ["See the $400 offer", "index.html#offers"]] },
    { id: "savings", re: /\b(savings|save money|cd|certificate of deposit|interest rate)\b/i,
      say: "Chase Savings™, Chase Premier Savings™ (relationship rates with a linked checking account) and CDs from 3 months to 10 years are all FDIC-insured up to $250,000 per depositor.",
      links: [["Compare savings accounts", "savings.html"]] },
    { id: "cards", re: /\b(credit card|credit cards|cash back|rewards|freedom|sapphire|preapproval|pre-approved)\b/i,
      say: "Chase cards cover cash back, travel and business spending — for example Freedom Unlimited® earns unlimited 1.5% cash back with a $0 annual fee. You can also check preapproval with no impact to your credit score.",
      links: [["Explore credit cards", "credit-cards.html"], ["See if you're preapproved", "credit-cards.html#rewards"]] },
    { id: "score", re: /\b(credit score|credit report|credit journey|my score)\b/i,
      say: "Chase Credit Journey® shows your score from VantageScore® updated weekly, at no cost, and checking it there won't affect your score.",
      links: [["Free credit score", "credit-cards.html#score"]] },
    { id: "mortgage", re: /\b(mortgage|home loan|home loans|refinance|refi|heloc|house|home equity|preapproval|prequalify)\b/i,
      say: "For buying, refinancing or a home equity line of credit, Chase offers prequalification in minutes, rate locks for up to 90 days and loan officers you can talk to.",
      links: [["Home loans hub", "home-loans.html"], ["Get prequalified", "home-loans.html#preapproval"]] },
    { id: "auto", re: /\b(auto|car loan|vehicle|refinance my car|car financing)\b/i,
      say: "Apply for Chase Auto financing online in minutes — your rate and terms are honored for 30 days while you shop, with no application or prepayment fees.",
      links: [["Auto financing", "auto.html"], ["Apply now", "auto.html#apply"]] },
    { id: "investing", re: /\b(invest|investing|stocks|portfolio|retirement|ira|j\.?p\.? ?morgan|advisor)\b/i,
      say: "You can invest on your own with J.P. Morgan Self-Directed Investing (commission-free online trades) or work with a dedicated advisor for a plan built around your goals.",
      links: [["Investing options", "investing.html"], ["Current offers", "investing.html#offers"]] },
    { id: "business", re: /\b(business|commercial|merchant|llc|company|invoice)\b/i,
      say: "Chase for Business covers checking, payment acceptance (QuickAccept™), business loans and cards, plus commercial banking for larger companies — with a local Business Specialist you can talk to.",
      links: [["Business banking", "business.html"], ["Commercial banking", "business.html#commercial"]] },
    { id: "travel", re: /\b(travel|flight|hotel|points|ultimate rewards)\b/i,
      say: "Travel rewards turn everyday spending into flights, hotels and experiences — points can transfer 1:1 to airline and hotel partners, and select cards have no foreign transaction fees.",
      links: [["Travel rewards", "travel.html"]] },
    { id: "zelle", re: /\b(zelle|send money|transfer money|pay someone)\b/i,
      say: "Zelle® is built into Chase online and the mobile app for fast sends to people you know — usually within minutes between enrolled accounts.",
      links: [["Ways to pay & transfer", "support.html#feedback"]] },
    { id: "signin", re: /\b(sign in|signin|log ?in|login|password|username|forgot|locked out|passwordless)\b/i,
      say: "You can sign in with username and password or use passwordless sign-in. If you forgot your username or password, the sign-in page has recovery steps.",
      links: [["Sign in", "sign-in.html"], ["Recover username/password", "sign-in.html#help"]] },
    { id: "signup", re: /\b(sign up|signup|enroll|open an account|new account|apply for checking)\b/i,
      say: "Enrolling takes three short steps: about you, your credentials, then the agreements.",
      links: [["Start enrollment", "sign-up.html"]] },
    { id: "score2", re: /\b(how much|balance|my money|statement|transaction|account details)\b/i,
      say: "Your balances and statements appear here straight from your account activity as it happens.",
      links: [["My account", "account.html"], ["Contact support", "support.html"]] },
    { id: "meeting", re: /\b(meeting|appointment|schedule|talk to (a|someone|people)|branch|banker)\b/i,
      say: "You can book time with a banker at a branch or by phone/video from the support page.",
      links: [["Schedule a meeting", "support.html#meeting"]] },
    { id: "security", re: /\b(fraud|scam|security|lock my card|stolen|suspicious)\b/i,
      say: "If something looks wrong, lock your card in the Chase Mobile® app immediately, then contact support. Chase will never ask for your password by email, text or phone.",
      links: [["Security & fraud help", "support.html#security"]] },
    { id: "hours", re: /\b(hours|open|when are you|contact|phone|email|customer service|help)\b/i,
      say: "You can reach support through the support page — schedule a meeting, send feedback, or use the contact details published by the site operator there.",
      links: [["Support hub", "support.html"]] },
    { id: "human", re: /\b(human|real person|agent|operator|representative|speak to someone|talk to a person)\b/i,
      say: "You're messaging customer support directly — every message you send here is delivered straight to the team, and their replies appear in this chat." },
    { id: "what", re: /\b(what can you do|help|menu|options|who are you|are you a bot)\b/i,
      say: "This is customer support chat. Ask about checking, savings, credit cards, mortgages, auto, investing, business, travel or security — anything else you type goes straight to the support team and replies appear here.",
      links: [["Browse all pages", "search.html"]] },
    { id: "thanks", re: /\b(thanks|thank you|cheers|appreciate)\b/i,
      say: "You're welcome! Anything else I can point you to?",
      links: [["Support hub", "support.html"]] }
  ];
  const FALLBACK = {
    say: "I don't have a ready answer for that yet — your message has gone to customer support and their reply will appear here. Try one of the topics below meanwhile.",
    suggest: ["Checking accounts", "Credit cards", "Home loans", "Investing"]
  };

  const botReply = (text) => {
    for (const k of KB) {
      if (k.re.test(text)) return k;
    }
    return { say: FALLBACK.say, suggest: FALLBACK.suggest };
  };

  /* ---------------- UI ---------------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const DOCK = `
  <div class="chat-fab-wrap">
    <button class="chat-fab" id="chatToggle" type="button" aria-expanded="false" aria-controls="chatPanel" aria-label="Open support chat">
      <img class="chat-fab-avatar" src="favicon.svg" alt="" width="26" height="26">
      <span class="chat-fab-label">Support</span>
    </button>
  </div>
  <section class="chat-panel" id="chatPanel" hidden aria-label="Support chat">
    <header class="chat-head">
      <div class="chat-head-main">
        <strong><img class="chat-mark" src="favicon.svg" alt="" width="18" height="18"> Customer support</strong>
        <span class="chat-pill" id="chatPill" data-state="bot">Customer support</span>
      </div>
      <button class="icon-btn" id="chatClose" type="button" aria-label="Close chat">
        <svg class="icon" aria-hidden="true"><use href="#ic-close"/></svg>
      </button>
    </header>
    <div class="chat-log" id="chatLog" role="log" aria-live="polite" aria-relevant="additions"></div>
    <div class="chat-suggest" id="chatSuggest"></div>
    <form class="chat-form" id="chatForm">
      <label class="sr-only" for="chatInput">Message</label>
      <input id="chatInput" type="text" maxlength="400" autocomplete="off" placeholder="Message customer support…">
      <button class="btn btn-blue" type="submit">Send</button>
    </form>
    <footer class="chat-foot">
      <span>Messages go straight to customer support — replies appear here.</span>
    </footer>
  </section>`;

  let open = false;
  let pollTimer = null;
  let botThinking = false;
  const log = () => document.getElementById("chatLog");
  const els = {};

  const history = () => {
    try { return JSON.parse(sessionStorage.getItem(LOG_KEY) || "[]"); }
    catch { return []; }
  };
  const remember = (msg) => {
    try {
      const h = history();
      h.push(msg);
      sessionStorage.setItem(LOG_KEY, JSON.stringify(h.slice(-60)));
    } catch {}
  };

  const addMsg = (who, text, links) => {
    const row = document.createElement("div");
    row.className = "chat-msg chat-msg-" + who;
    const av = (who === "user") ? "" :
      `<img class="chat-av${who === "admin" ? " chat-av-support" : ""}" src="favicon.svg" alt="" width="22" height="22">`;
    let html = `${av}<div class="chat-msg-body"><div class="chat-bubble">${text.replace(/\n/g, "<br>")}`;
    if (links && links.length) {
      html += `<span class="chat-links">` +
        links.map(([l, h]) => `<a href="${esc(h)}">${esc(l)}</a>`).join("") + `</span>`;
    }
    html += `</div><span class="chat-meta">${who === "user" ? "You" : "Customer support"}</span></div>`;
    row.innerHTML = html;
    log().appendChild(row);
    log().scrollTop = log().scrollHeight;
    if (who !== "thinking") remember({ who, text, links: links || [] });
  };

  const setPill = (state, label) => {
    if (!els.pill) return;
    els.pill.dataset.state = state;
    els.pill.textContent = label;
  };

  const threadId = () => { try { return sessionStorage.getItem(THREAD_KEY) || ""; } catch { return ""; } };
  const setThread = (id) => { try { sessionStorage.setItem(THREAD_KEY, id); } catch {} };
  /* Push new conversation lines to the console thread so the operator sees
     the live conversation (fire-and-forget; offline is fine). */
  /* Who the console thread belongs to: the signed-in customer when there
     is one, else a stable anonymous visitor id (resolved same-origin). */
  let identCache = null;
  const identity = () => {
    if (identCache) return identCache;
    identCache = (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store", credentials: "same-origin", headers: { "X-Requested-With": "fetch" } });
        if (r.ok) {
          const d = await r.json();
          if (d && d.user) return { name: d.user.name || d.user.username || "Customer", contact: d.user.email || d.user.username || "customer", visitor: "" };
        }
      } catch { /* not signed in */ }
      let v = ""; try { v = localStorage.getItem("chase_visitor") || ""; } catch {}
      return { name: "Website visitor", contact: v ? `visitor ${v.slice(0, 16)}` : "visitor (anonymous)", visitor: v };
    })();
    return identCache;
  };

  /* Deliver one conversation line to the console thread — created on first
     message if needed. Offline → honest outbox queue (notify.js delivers). */
  const syncMessage = (who, text) => {
    const id = threadId();
    if (!id || !text) return;
    const base = (window.SiteConfig && window.SiteConfig.endpoint) ? window.SiteConfig.endpoint() : "";
    if (!base) return;
    const at = Date.now();
    (async () => {
      const ident = await identity();
      const payload = { id, who, text, at, name: ident.name, contact: ident.contact, visitor: ident.visitor, page: location.pathname };
      try {
        const res = await fetch(`${base}/api/chat/threads/${encodeURIComponent(id)}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
        if (!res.ok) throw new Error("sync failed: " + res.status);
        setPill("human", "Customer support · online");
      } catch {
        try {
          const q = JSON.parse(localStorage.getItem("chase_notify_outbox") || "[]");
          q.push({ id: `${id}_${at}`, type: "chat_message", payload, ts: at });
          localStorage.setItem("chase_notify_outbox", JSON.stringify(q.slice(-50)));
        } catch { /* storage blocked */ }
        setPill("off", "Customer support · offline");
      }
    })();
  };

  const renderSuggest = (items) => {
    els.suggest.innerHTML = "";
    (items || ["Checking accounts", "Credit cards", "Home loans"]).forEach((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chat-chip";
      b.textContent = s;
      b.addEventListener("click", () => handleUserText(s));
      els.suggest.appendChild(b);
    });
  };

  const botSay = (entry) => {
    if (botThinking) return;
    botThinking = true;
    addMsg("thinking", "…", null);
    window.setTimeout(() => {
      const t = log().querySelector(".chat-msg-thinking");
      if (t) t.remove();
      botThinking = false;
      addMsg("bot", entry.say, entry.links);
    syncMessage("bot", entry.say || "");
      renderSuggest(entry.suggest);
      if (open) startPoll();
    }, 420);
  };

  const handleUserText = (text) => {
    const v = (text || "").trim();
    if (!v || botThinking) return;
    if (!threadId()) setThread("th_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
    addMsg("user", v);
    syncMessage("user", v);
    els.input.value = "";
    botSay(botReply(v));
    startPoll();
  };

  const consoleOnline = async () => {
    const base = (window.SiteConfig && window.SiteConfig.endpoint) ? window.SiteConfig.endpoint() : "";
    if (!base) return null;
    try {
      const res = await fetch(base + "/api/health", { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  };

  /* ---------------- admin replies ---------------- */
  const startPoll = () => {
    if (pollTimer) return;
    const id = threadId();
    if (!id) return;
    pollTimer = window.setInterval(async () => {
      const base = (window.SiteConfig && window.SiteConfig.endpoint) ? window.SiteConfig.endpoint() : "";
      if (!base) return;
      try {
        const res = await fetch(`${base}/api/chat/threads/${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("bad");
        const data = await res.json();
        setPill(data.status === "closed" ? "bot" : "human", data.status === "closed" ? "Customer support · closed" : "Customer support · online");
        const seen = Number(sessionStorage.getItem("chat_seen") || 0);
        (data.replies || []).forEach((r) => {
          if ((r.at || 0) > seen) {
            addMsg("admin", r.text);
            sessionStorage.setItem("chat_seen", String(r.at));
          }
        });
      } catch {
        setPill("off", "Customer support · offline");
      }
    }, 3500);
  };
  const stopPoll = () => {
    if (pollTimer) { window.clearInterval(pollTimer); pollTimer = null; }
  };

  /* ---------------- boot ---------------- */
  const boot = async () => {
    if (window.SiteConfig && window.SiteConfig.ready) {
      try { await window.SiteConfig.ready; } catch {}
    }
    const cfg = (window.SiteConfig && window.SiteConfig.get) ? window.SiteConfig.get() : {};
    if (cfg.chat && cfg.chat.enabled === false) return;

    const wrap = document.createElement("div");
    wrap.className = "chat-root";
    wrap.innerHTML = DOCK;
    document.body.appendChild(wrap);

    ["chatToggle", "chatPanel", "chatClose", "chatLog", "chatSuggest", "chatForm", "chatInput",
     "chatHandoffBtn", "chatHandoff", "chName", "chContact", "chMsg", "chErr", "chSend", "chCancel", "chatPill"]
      .forEach((id) => { els[id] = document.getElementById(id); });
    // short aliases used by the handlers
    Object.assign(els, {
      suggest: els.chatSuggest, input: els.chatInput, pill: els.chatPill
    });

    const setOpen = (v) => {
      open = v;
      els.chatPanel.hidden = !v;
      els.chatToggle.setAttribute("aria-expanded", String(v));
      document.documentElement.classList.toggle("chat-open", v);
      if (v) {
        if (!log().childElementCount) {
          const welcome = (cfg.chat && cfg.chat.welcome) ||
            "Hi! This is customer support — send us a message and the team sees it right away; their replies appear in this chat. Ask anything about accounts, cards, loans or signing in.";
          addMsg("bot", welcome);
          renderSuggest();
        }
        if (threadId()) startPoll();
        window.setTimeout(() => els.chatInput.focus(), 80);
      } else stopPoll();
    };

    els.chatToggle.addEventListener("click", () => setOpen(!open));
    els.chatClose.addEventListener("click", () => setOpen(false));
    els.chatForm.addEventListener("submit", (e) => { e.preventDefault(); handleUserText(els.chatInput.value); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) setOpen(false); });

    // Restore transcript for this session
    history().slice(-6).forEach((m) => {
      const row = document.createElement("div");
      row.className = "chat-msg chat-msg-" + m.who;
      const av = (m.who === "user") ? "" :
        `<img class="chat-av${m.who === "admin" ? " chat-av-support" : ""}" src="favicon.svg" alt="" width="22" height="22">`;
      row.innerHTML = `${av}<div class="chat-msg-body"><div class="chat-bubble">${m.text.replace(/\n/g, "<br>")}</div><span class="chat-meta">${m.who === "user" ? "You" : "Customer support"}</span></div>`;
      log().appendChild(row);
    });

    // Reflect console availability once on boot
    const health = await consoleOnline();
    if (health) setPill("human", "Customer support · online");
    else setPill("off", threadId() ? "Customer support · offline" : "Customer support");

    /* Page-facing API: open the chat, optionally with text ready to send
       (used by the withdrawal flow's "Message support in chat" button). */
    window.ChaseChat = {
      open(prefill) {
        setOpen(true);
        if (prefill && els.input) {
          els.input.value = String(prefill);
          window.setTimeout(() => { els.input.focus(); }, 140);
        }
        if (threadId()) startPoll();
      }
    };
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
