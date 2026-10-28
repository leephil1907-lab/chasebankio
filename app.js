/* ============================================================
   app.js — behaviours for the whole site:
   loading skeleton + navigation progress, side menu, sign-in
   (overlay + embedded + page), sign-up steps, session state,
   search, demo toasts and desktop dropdowns.
   ============================================================ */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const desktopMQ = window.matchMedia("(min-width: 1024px)");
  const SESSION_KEY = "chase_demo_session";
  const REMEMBER_KEY = "chase_demo_remember";

  /* ================================================================
     1. Loading skeleton + navigation progress
     ================================================================ */
  const MIN_SKELETON_MS = 420;
  let skeletonDone = false;
  const finishSkeleton = () => {
    if (skeletonDone) return;
    skeletonDone = true;
    document.documentElement.classList.remove("is-loading");
    document.body.classList.add("page-ready");
    if (window.__routeVeilDone) window.__routeVeilDone();
  };
  const armSkeleton = () => {
    const elapsed = performance.now();
    window.setTimeout(finishSkeleton, Math.max(0, MIN_SKELETON_MS - elapsed));
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", armSkeleton);
  } else {
    armSkeleton();
  }
  window.addEventListener("load", armSkeleton);
  // Returning via back/forward cache must never leave the skeleton up.
  window.addEventListener("pageshow", () => window.setTimeout(finishSkeleton, 120));
  window.setTimeout(finishSkeleton, 4000); // hard safety net

  // Top progress bar while an internal page is loading.
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || /^(https?:|mailto:|tel:|data:)/i.test(href)) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;
    document.body.classList.add("nav-loading");
  });

  /* ================================================================
     2. API client + server session helpers
     ================================================================ */
  const api = async (path, opts = {}) => {
    const { method = "GET", body } = opts;
    let res;
    try {
      res = await fetch(path, {
        method,
        headers: {
          "X-Requested-With": "fetch",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        credentials: "same-origin",
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      const e = new Error("Can\u2019t reach the site server \u2014 check that it is running, then try again.");
      e.status = 0; e.code = "offline";
      throw e;
    }
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    if (!res.ok) {
      const e = new Error((data && data.error && data.error.message) || "Something went wrong \u2014 please try again.");
      e.status = res.status;
      e.code = data && data.error && data.error.code;
      throw e;
    }
    return data;
  };

  let currentUser = null; /* server-verified session; null = signed out */
  const fetchSession = async () => {
    try { const d = await api("/api/auth/session"); currentUser = d.user || null; }
    catch { currentUser = null; }
    return currentUser;
  };
  const firstName = (user) => (user && (user.name || user.username || "").trim().split(/\s+/)[0]) || "there";
  const validUsername = (v) => v.trim().length >= 3;
  const validPassword = (v) => v.length >= 8;
  const nextAfterLogin = () => {
    const raw = String(new URLSearchParams(location.search).get("next") || "").trim();
    const m = /^([a-z0-9-]{1,40})(\.html)?$/i.exec(raw);
    const dest = m ? m[1].toLowerCase() + ".html" : "account.html";
    return dest === "sign-in.html" || dest === "sign-up.html" ? "account.html" : dest;
  };

  /* ================================================================
     3. Header account state (signed in vs signed out)
     ================================================================ */
  const renderHeaderAccount = () => {
    const slot = $("#headerAccount");
    if (!slot) return;
    const user = currentUser;
    if (user) {
      slot.innerHTML =
        `<a class="welcome-chip" href="account.html" aria-label="My account"><span class="avatar" aria-hidden="true">${firstName(user).charAt(0).toUpperCase()}</span><span class="welcome-name">Welcome, ${firstName(user).replace(/[<>&"]/g, "")}</span></a>` +
        `<a class="header-link" href="account.html">My account</a>` +
        `<button class="btn btn-outline btn-small" id="signoutBtn" type="button">Sign out</button>`;
      const out = $("#signoutBtn");
      if (out) out.addEventListener("click", async () => {
        out.disabled = true;
        try { await api("/api/auth/logout", { method: "POST" }); } catch { /* best effort */ }
        window.location.href = "index.html";
      });
    }
    /* Signed out → leave chrome's default "Sign in" markup untouched
       (the toggle button lives inside this slot). */
  };

  /* ================================================================
     4. Sign-in forms: overlay + embedded hero card + sign-in page
     ================================================================ */
  const bindSignin = ({ user, pass, toggle, submit, notice, remember, onFail }) => {
    if (!user || !pass || !submit) return;
    const shown = () => {
      if (!notice) return;
      notice.hidden = true;
      notice.classList.remove("is-error");
    };
    user.addEventListener("input", shown);
    pass.addEventListener("input", shown);

    if (toggle) {
      toggle.addEventListener("click", () => {
        const showing = pass.type === "text";
        pass.type = showing ? "password" : "text";
        toggle.textContent = showing ? "Show" : "Hide";
        toggle.setAttribute("aria-pressed", String(!showing));
      });
    }

    const attempt = async () => {
      if (!validUsername(user.value)) {
        if (notice) {
          notice.textContent = "Enter your username (at least 3 characters).";
          notice.classList.add("is-error");
          notice.hidden = false;
        }
        user.focus();
        if (onFail) onFail();
        return;
      }
      if (!validPassword(pass.value)) {
        if (notice) {
          notice.textContent = "Enter your password (at least 8 characters).";
          notice.classList.add("is-error");
          notice.hidden = false;
        }
        pass.focus();
        if (onFail) onFail();
        return;
      }
      const remembered = !!(remember && remember.checked);
      if (remembered) {
        try { localStorage.setItem(REMEMBER_KEY, user.value.trim()); } catch {}
      } else {
        try { localStorage.removeItem(REMEMBER_KEY); } catch {}
      }
      submit.classList.add("is-busy");
      submit.disabled = true;
      const label = submit.textContent;
      submit.textContent = "Signing in\u2026";
      try {
        const uname = user.value.trim();
        const d = await api("/api/auth/login", {
          method: "POST",
          body: { username: uname, password: pass.value, remember: remembered },
        });
        currentUser = d.user;
        if (window.SiteNotify) window.SiteNotify.send("signin", { username: uname }).catch(() => {});
        window.location.href = nextAfterLogin();
      } catch (err) {
        submit.classList.remove("is-busy");
        submit.disabled = false;
        submit.textContent = label;
        if (notice) {
          notice.textContent = (err && err.message) || "Sign-in failed \u2014 try again.";
          notice.classList.add("is-error");
          notice.hidden = false;
        }
      }
    };

    submit.addEventListener("click", attempt);
    pass.addEventListener("keydown", (e) => { if (e.key === "Enter") attempt(); });
    user.addEventListener("keydown", (e) => { if (e.key === "Enter") pass.focus(); });
  };

  const prefillRemembered = (userEl) => {
    if (!userEl) return;
    try {
      const v = localStorage.getItem(REMEMBER_KEY);
      if (v) userEl.value = v;
    } catch {}
  };

  // Overlay (chrome.js)
  const overlay = $("#signinOverlay");
  const overlayBackdrop = $("#signinBackdrop");
  const openOverlay = () => {
    if (!overlay) return;
    overlay.hidden = false;
    if (overlayBackdrop) {
      overlayBackdrop.hidden = false;
      void overlayBackdrop.offsetWidth;
      overlayBackdrop.classList.add("visible");
    }
    const t = $("#signinToggle");
    if (t) t.setAttribute("aria-expanded", "true");
    document.body.classList.add("no-scroll");
    window.setTimeout(() => $("#suUsername") && $("#suUsername").focus(), 80);
  };
  const closeOverlay = () => {
    if (!overlay) return;
    overlay.hidden = true;
    if (overlayBackdrop) {
      overlayBackdrop.classList.remove("visible");
      window.setTimeout(() => { overlayBackdrop.hidden = true; }, 250);
    }
    const t = $("#signinToggle");
    if (t) t.setAttribute("aria-expanded", "false");
    document.body.classList.remove("no-scroll");
  };

  const signinToggle = $("#signinToggle");
  if (signinToggle) {
    signinToggle.addEventListener("click", () => {
      // On the home page (desktop) the sign-in card lives in the hero — focus it.
      const heroCard = $("#signinCard");
      if (desktopMQ.matches && heroCard) {
        heroCard.scrollIntoView({ behavior: "smooth", block: "center" });
        const u = $("#username");
        if (u) window.setTimeout(() => u.focus(), 250);
        return;
      }
      overlay && overlay.hidden ? openOverlay() : closeOverlay();
    });
  }
  if (overlayBackdrop) overlayBackdrop.addEventListener("click", closeOverlay);
  const suClose = $("#suClose");
  if (suClose) suClose.addEventListener("click", closeOverlay);

  bindSignin({
    user: $("#suUsername"), pass: $("#suPassword"), toggle: $("#suPwToggle"),
    submit: $("#suSubmit"), notice: $("#suNotice"), remember: $("#suRemember")
  });
  prefillRemembered($("#suUsername"));

  // Embedded hero card (home page)
  bindSignin({
    user: $("#username"), pass: $("#password"), toggle: $("#pwToggle"),
    submit: $("#signinSubmit"), notice: $("#signinNotice"), remember: $("#rememberUser")
  });
  prefillRemembered($("#username"));

  // Full sign-in page
  const pageForm = $("#signinPageForm");
  if (pageForm) {
    bindSignin({
      user: $("#pgUsername"), pass: $("#pgPassword"), toggle: $("#pgPwToggle"),
      submit: $("#pgSubmit"), notice: $("#pgNotice"), remember: $("#pgRemember")
    });
    prefillRemembered($("#pgUsername"));
    const pwdless = $("#pgPasswordless");
    if (pwdless) pwdless.addEventListener("click", () => {
      if ($("#pgNotice")) {
        $("#pgNotice").textContent = "Passwordless sign-in (passkeys) is available in the connected Chase app.";
        $("#pgNotice").classList.remove("is-error");
        $("#pgNotice").hidden = false;
      }
    });
  }

  /* ================================================================
     5. Side menu
     ================================================================ */
  const menuToggle = $("#menuToggle");
  const menuClose = $("#menuClose");
  const mobileMenu = $("#mobileMenu");
  const menuBackdrop = $("#menuBackdrop");
  let lastFocused = null;

  const openMenu = () => {
    if (!mobileMenu) return;
    lastFocused = document.activeElement;
    mobileMenu.hidden = false;
    menuBackdrop.hidden = false;
    void mobileMenu.offsetWidth;
    mobileMenu.classList.add("open");
    menuBackdrop.classList.add("visible");
    document.body.classList.add("no-scroll");
    menuToggle.setAttribute("aria-expanded", "true");
    window.setTimeout(() => menuClose && menuClose.focus(), 140);
  };
  const closeMenu = () => {
    if (!mobileMenu || !mobileMenu.classList.contains("open")) return;
    mobileMenu.classList.remove("open");
    menuBackdrop.classList.remove("visible");
    document.body.classList.remove("no-scroll");
    menuToggle.setAttribute("aria-expanded", "false");
    window.setTimeout(() => {
      mobileMenu.hidden = true;
      menuBackdrop.hidden = true;
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }, 340);
  };
  if (menuToggle) menuToggle.addEventListener("click", openMenu);
  if (menuClose) menuClose.addEventListener("click", closeMenu);
  if (menuBackdrop) menuBackdrop.addEventListener("click", closeMenu);
  if (mobileMenu) $$("a", mobileMenu).forEach((a) => a.addEventListener("click", closeMenu));

  /* ================================================================
     6. Desktop dropdowns
     ================================================================ */
  const navItems = $$(".nav-item");
  const closeAllNav = (except) => {
    navItems.forEach((item) => {
      if (item === except) return;
      item.classList.remove("open");
      const t = $(".nav-trigger", item);
      if (t) t.setAttribute("aria-expanded", "false");
    });
  };
  navItems.forEach((item) => {
    const trigger = $(".nav-trigger", item);
    if (!trigger) return;
    trigger.addEventListener("click", () => {
      const willOpen = !item.classList.contains("open");
      closeAllNav(item);
      item.classList.toggle("open", willOpen);
      trigger.setAttribute("aria-expanded", String(willOpen));
    });
    item.addEventListener("focusout", (e) => {
      if (!item.contains(e.relatedTarget)) {
        item.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  });

  const utilMenus = $$(".util-menu");
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-item")) closeAllNav(null);
    utilMenus.forEach((d) => { if (!d.contains(e.target)) d.removeAttribute("open"); });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeAllNav(null);
    utilMenus.forEach((d) => d.removeAttribute("open"));
    if (overlay && !overlay.hidden) closeOverlay();
    closeMenu();
  });

  /* ================================================================
     7. Demo toasts for illustrative actions
     ================================================================ */
  let toastEl = null;
  const showToast = (msg) => {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    window.clearTimeout(toastEl._t);
    toastEl._t = window.setTimeout(() => toastEl.classList.remove("show"), 3200);
  };
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("[data-demo-action]");
    if (btn) showToast(btn.getAttribute("data-demo-action"));
  });

  /* ================================================================
     8. Sign-up wizard
     ================================================================ */
  const signup = $("#signupWizard");
  if (signup) {
    const steps = $$(".su-step", signup);
    const chips = $$(".step-chip");
    let current = 0;

    const showStep = (i) => {
      current = i;
      steps.forEach((s, idx) => { s.hidden = idx !== i; });
      chips.forEach((c, idx) => {
        c.classList.toggle("active", idx === i);
        c.classList.toggle("done", idx < i);
      });
      const h = steps[i].querySelector("h2");
      if (h) { h.setAttribute("tabindex", "-1"); h.focus(); }
    };

    const fail = (input, msg) => {
      const f = input.closest(".field, .field-check");
      if (f) f.classList.add("invalid");
      const err = f && f.querySelector(".field-error");
      if (err) err.textContent = msg;
      input.focus();
      return false;
    };
    const clearFail = (input) => {
      const f = input.closest(".field, .field-check");
      if (f) f.classList.remove("invalid");
    };

    const validateStep = (i) => {
      if (i === 0) {
        const first = $("#suFirst"), last = $("#suLast"), email = $("#suEmail"), dob = $("#suDob");
        [first, last, email, dob].forEach(clearFail);
        if (first.value.trim().length < 2) return fail(first, "Enter your first name.");
        if (last.value.trim().length < 2) return fail(last, "Enter your last name.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) return fail(email, "Enter a valid email address.");
        if (!dob.value) return fail(dob, "Enter your date of birth.");
        return true;
      }
      if (i === 1) {
        const u = $("#suNewUser"), p = $("#suNewPass"), p2 = $("#suNewPass2");
        [u, p, p2].forEach(clearFail);
        if (!validUsername(u.value)) return fail(u, "Username must be at least 3 characters.");
        if (!validPassword(p.value)) return fail(p, "Password must be at least 8 characters.");
        if (p.value !== p2.value) return fail(p2, "Passwords do not match.");
        return true;
      }
      if (i === 2) {
        const terms = $("#suTerms");
        clearFail(terms);
        if (!terms.checked) return fail(terms, "Please accept the agreements to continue.");
        return true;
      }
      return true;
    };

    signup.addEventListener("click", (e) => {
      const next = e.target.closest("[data-step-next]");
      const back = e.target.closest("[data-step-back]");
      if (next) {
        if (validateStep(current)) showStep(Math.min(current + 1, steps.length - 1));
      } else if (back) {
        showStep(Math.max(current - 1, 0));
      }
    });

    // Password strength meter
    const pw = $("#suNewPass");
    if (pw) {
      const meter = $("#pwMeterFill");
      const label = $("#pwMeterLabel");
      pw.addEventListener("input", () => {
        const v = pw.value;
        let score = 0;
        if (v.length >= 8) score++;
        if (v.length >= 12) score++;
        if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
        if (/\d/.test(v)) score++;
        if (/[^A-Za-z0-9]/.test(v)) score++;
        const pct = [0, 25, 45, 65, 85, 100][Math.min(score, 5)];
        const words = ["Too short", "Weak", "Fair", "Good", "Strong", "Excellent"];
        if (meter) { meter.style.width = pct + "%"; meter.dataset.level = String(Math.min(score, 5)); }
        if (label) label.textContent = v ? words[Math.min(score, 5)] : "";
      });
    }

    const finish = async (e) => {
      e.preventDefault();
      if (!validateStep(2)) return;
      const notice = $("#suNotice");
      const first = $("#suFirst").value.trim();
      const last = $("#suLast").value.trim();
      const name = `${first} ${last}`;
      const u = $("#suNewUser").value.trim();
      const mail = $("#suEmail").value.trim();
      const btn = $("#suFinish");
      btn.disabled = true;
      btn.textContent = "Creating account\u2026";
      if (notice) { notice.hidden = true; notice.classList.remove("is-error"); }
      try {
        const d = await api("/api/auth/register", {
          method: "POST",
          body: { first, last, email: mail, dob: $("#suDob").value, username: u, password: $("#suNewPass").value },
        });
        currentUser = d.user;
        if (window.SiteNotify) window.SiteNotify.send("signup", { name, username: u, email: mail }).catch(() => {});
        $$(".su-step", signup).forEach((s) => { s.hidden = true; });
        chips.forEach((c) => { c.classList.remove("active"); c.classList.add("done"); });
        const done = $("#suSuccess");
        done.hidden = false;
        done.setAttribute("tabindex", "-1");
        done.focus();
        document.querySelector(".signup-progress").hidden = true;
      } catch (err) {
        btn.disabled = false;
        btn.textContent = "Create account";
        if (notice) {
          notice.textContent = (err && err.message) || "Could not create the account.";
          notice.classList.add("is-error");
          notice.hidden = false;
        }
      }
    };
    const finishBtn = $("#suFinish");
    if (finishBtn) finishBtn.addEventListener("click", finish);

    showStep(0);
  }

  /* ================================================================
     9. Account dashboard (server-backed: balances, activity, money
        movement, payments, support cases and settings)
     ================================================================ */
  const fmt = (c) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const esc = (s) => String(s == null ? "" : s).replace(/[<>&"']/g, (ch) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[ch]));
  const dshort = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };
  const dtime = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); };
  const setSt = (el, state, msg) => {
    if (!el) return;
    el.hidden = false;
    el.className = "form-status " + (state === "error" ? "is-error" : state === "ok" ? "is-ok" : "is-busy-state");
    el.textContent = msg;
  };
  const amtOk = (v) => /^\d+(\.\d{1,2})?$/.test(String(v || "").trim());

  let accountsCache = [];
  let txnShowAll = false;
  const acctLabel = (a) => `${a.name} \u2022\u2022\u2022\u2022${a.last4}`;

  const fillSelects = () => {
    const open = accountsCache.filter((a) => a.status === "open");
    const opts = open.map((a) => `<option value="${a.id}">${esc(acctLabel(a))} \u2014 ${fmt(a.balanceCents)}</option>`).join("");
    ["#depAccount", "#trFrom", "#trTo", "#payFrom"].forEach((sel) => { const el = $(sel); if (el) el.innerHTML = opts; });
    const to = $("#trTo");
    if (to && to.options.length > 1) to.selectedIndex = 1;
  };

  const renderAccounts = (accts) => {
    accountsCache = accts;
    const grid = $("#acctGrid");
    if (!grid) return;
    grid.setAttribute("aria-busy", "false");
    if (!accts.length) {
      grid.innerHTML = `<div class="acct-card"><span class="acct-label">No accounts yet</span></div>`;
      return;
    }
    grid.innerHTML = accts.map((a) => `
      <div class="acct-card">
        <span class="acct-tag ${a.status === "open" ? "is-open" : ""}">${a.status === "open" ? "Open" : esc(a.status)}</span>
        <span class="acct-label">${esc(a.name)}</span>
        <span class="acct-balance">${fmt(a.balanceCents)}</span>
        <span class="acct-meta">${esc(a.masked)} &middot; opened ${dshort(a.openedAt)}</span>
        <div class="acct-actions"><a class="btn btn-outline btn-small" href="#money">Move money</a></div>
      </div>`).join("");
    const total = accts.reduce((n, a) => n + a.balanceCents, 0);
    const rel = $("#relLine");
    if (rel) rel.textContent = `${accts.length} accounts \u00b7 ${fmt(total)} combined \u00b7 member since ${dshort(currentUser && currentUser.memberSince)}`;
    fillSelects();
  };

  const renderTxns = (rows) => {
    const box = $("#txnsList");
    if (!box) return;
    if (!rows.length) {
      box.innerHTML = `<p class="muted">No activity yet \u2014 add a deposit under <a href="#money">Move money</a> to get started.</p>`;
      return;
    }
    box.innerHTML = rows.map((t) => `
      <div class="txn-row">
        <span class="txn-ico ${t.amountCents >= 0 ? "pos" : ""}" aria-hidden="true">${t.amountCents >= 0 ? "\u2193" : "\u2191"}</span>
        <span class="txn-main"><strong>${esc(t.label)}</strong><span>${dtime(t.ts)}${t.memo ? ` \u00b7 ${esc(t.memo)}` : ""}${t.status && t.status !== "completed" ? ` \u00b7 <em class="txn-st st-${esc(t.status)}">${esc(t.status)}</em>` : ""}</span></span>
        <span class="txn-amt ${t.amountCents >= 0 ? "pos" : "neg"}">${t.amountCents >= 0 ? "+" : ""}${fmt(t.amountCents)}</span>
        <span class="txn-bal">${fmt(t.balanceAfterCents)} bal.</span>
      </div>`).join("");
  };

  const loadTxns = async () => {
    try {
      const d = await api(`/api/transactions?limit=${txnShowAll ? 200 : 8}`);
      renderTxns(d.transactions);
      const more = $("#txnsMore");
      if (more) {
        more.hidden = txnShowAll ? d.transactions.length < 1 : d.transactions.length < 8;
        more.textContent = txnShowAll ? "Show recent only" : "Show all";
      }
    } catch (e) {
      const box = $("#txnsList");
      if (box) box.innerHTML = `<p class="form-status is-error">${esc(e.message)}</p>`;
    }
  };

  const loadLimits = async () => {
    try {
      const l = await api("/api/limits");
      const note = $("#trLimitNote");
      if (note) note.textContent =
        `Daily limit ${fmt(l.transferDailyCents)} \u2014 ${fmt(l.transferUsedTodayCents)} used today \u00b7 max ${fmt(l.transferMaxCents)} per transfer.`;
    } catch { /* limits are advisory in the UI */ }
  };

  const refreshDash = async () => {
    try { const d = await api("/api/accounts"); renderAccounts(d.accounts); } catch { /* keep last */ }
    loadTxns();
    loadLimits();
  };

  const loadPayees = async () => {
    try {
      const d = await api("/api/payees");
      const list = $("#payeeList");
      const sel = $("#payPayee");
      if (list) {
        list.innerHTML = d.payees.length
          ? d.payees.map((p) => `
            <span class="payee-chip">${esc(p.name)} <span class="payee-det">${esc(p.detail)}</span>
              <button type="button" class="payee-x" data-pe-del="${p.id}" aria-label="Remove ${esc(p.name)}">&times;</button>
            </span>`).join("")
          : `<p class="muted">No payees yet \u2014 add one below to schedule a payment.</p>`;
      }
      if (sel) {
        sel.innerHTML = d.payees.map((p) => `<option value="${p.id}">${esc(p.name)} (${esc(p.detail)})</option>`).join("");
        sel.disabled = !d.payees.length;
      }
    } catch (e) {
      const list = $("#payeeList");
      if (list) list.innerHTML = `<p class="form-status is-error">${esc(e.message)}</p>`;
    }
  };

  const payChip = (s) => `<span class="status-chip st-${esc(s)}">${esc(s)}</span>`;
  const loadPayments = async () => {
    try {
      const d = await api("/api/payments");
      const box = $("#paymentsList");
      if (!box) return;
      box.innerHTML = d.payments.length
        ? d.payments.map((p) => `
          <div class="txn-row">
            <span class="txn-main"><strong>${esc(p.payeeName)}</strong><span>
              ${p.scheduledFor ? `scheduled for ${dshort(p.scheduledFor)}` : `created ${dtime(p.createdAt)}`} \u00b7 ${esc(p.accountType)}
              ${p.status === "failed" && p.failureReason ? ` \u00b7 ${esc(String(p.failureReason).replace(/_/g, " "))}` : ""}
            </span></span>
            ${p.status === "scheduled" ? `<button type="button" class="btn btn-outline btn-small" data-pay-cancel="${p.id}">Cancel</button>` : payChip(p.status)}
            <span class="txn-amt neg">${fmt(-p.amountCents)}</span>
          </div>`).join("")
        : `<p class="muted">No payments yet \u2014 add a payee and schedule one under Move money.</p>`;
    } catch (e) {
      const box = $("#paymentsList");
      if (box) box.innerHTML = `<p class="form-status is-error">${esc(e.message)}</p>`;
    }
  };

  const caseChip = (s) => `<span class="status-chip st-${esc(s)}">case ${esc(s)}</span>`;
  const loadCases = async () => {
    try {
      const d = await api("/api/support");
      const box = $("#casesList");
      if (!box) return;
      box.innerHTML = d.cases.length
        ? d.cases.map((c) => `
          <details class="case-card" ${c.status === "open" ? "open" : ""}>
            <summary>
              <span class="case-id">${esc(c.id)}</span>
              <strong>${esc(c.subject)}</strong>
              ${caseChip(c.status)}
              <span class="case-date">${dshort(c.createdAt)}</span>
            </summary>
            <div class="case-thread">
              ${c.messages.map((m) => `
                <div class="case-msg ${m.from === "operator" ? "from-op" : ""}">
                  <span class="case-who">${m.from === "operator" ? "Support" : "You"}</span>
                  <p>${esc(m.text)}</p>
                  <span class="case-when">${dtime(m.ts)}</span>
                </div>`).join("")}
            </div>
          </details>`).join("")
        : `<p class="muted">No cases yet \u2014 open one and the full message history appears here.</p>`;
    } catch (e) {
      const box = $("#casesList");
      if (box) box.innerHTML = `<p class="form-status is-error">${esc(e.message)}</p>`;
    }
  };

  const busy = (btn, on, label) => {
    if (!btn) return () => {};
    const original = btn.dataset.label || btn.textContent;
    btn.dataset.label = original;
    if (on) { btn.disabled = true; btn.textContent = label || "Working\\u2026"; }
    else { btn.disabled = false; btn.textContent = original; }
    return () => {};
  };

  const bindAccountForms = () => {
    if (window.__acctBound) return;
    window.__acctBound = true;

    /* ---- deposit ---- */
    const depForm = $("#depForm");
    if (depForm) depForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const amt = $("#depAmount"), st = $("#depStatus");
      amt.closest(".field").classList.remove("invalid");
      if (!amtOk(amt.value) || parseFloat(amt.value) <= 0) {
        amt.closest(".field").classList.add("invalid");
        amt.closest(".field").querySelector(".field-error").textContent = "Enter an amount like 250.00.";
        amt.focus();
        return;
      }
      const btn = depForm.querySelector("button[type=submit]");
      busy(btn, true, "Depositing\\u2026");
      try {
        const d = await api("/api/deposits", { method: "POST", body: {
          accountId: $("#depAccount").value, amount: amt.value.trim(), memo: $("#depMemo").value.trim(),
        }});
        setSt(st, "ok", `Deposit complete \u2014 new balance in ${d.account.name}: ${fmt(d.account.balanceCents)}.`);
        showToast("Deposit added.");
        depForm.reset();
        refreshDash();
      } catch (err) { setSt(st, "error", err.message); }
      busy(btn, false);
    });

    /* ---- transfer (step-up password authorization) ---- */
    const trForm = $("#trForm");
    if (trForm) trForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const amt = $("#trAmount"), pw = $("#trConfirm"), st = $("#trStatus");
      [amt, pw].forEach((el) => el.closest(".field").classList.remove("invalid"));
      const failField = (el, msg) => {
        const f = el.closest(".field");
        f.classList.add("invalid");
        f.querySelector(".field-error").textContent = msg;
        el.focus();
        return false;
      };
      if ($("#trFrom").value === $("#trTo").value) return failField($("#trTo"), "Choose two different accounts.");
      if (!amtOk(amt.value) || parseFloat(amt.value) <= 0) return failField(amt, "Enter an amount like 50.00.");
      if (!pw.value) return failField(pw, "Enter your password to authorize this transfer.");
      const btn = trForm.querySelector("button[type=submit]");
      busy(btn, true, "Transferring\\u2026");
      try {
        const d = await api("/api/transfers", { method: "POST", body: {
          fromId: $("#trFrom").value, toId: $("#trTo").value,
          amount: amt.value.trim(), confirmPassword: pw.value,
        }});
        setSt(st, "ok", `Sent ${fmt(d.transactions[0].amountCents * -1)} \u2014 ${d.from.name} \u2192 ${d.to.name}.`);
        showToast("Transfer complete.");
        trForm.reset();
        fillSelects();
        refreshDash();
      } catch (err) {
        if (err.code === "bad_confirmation") failField(pw, err.message);
        setSt(st, "error", err.message);
      }
      busy(btn, false);
    });

    /* ---- payees ---- */
    const peForm = $("#payeeForm");
    if (peForm) peForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const st = $("#payeeStatus");
      const name = $("#peName"), det = $("#peDetail");
      [name, det].forEach((el) => el.closest(".field") && el.closest(".field").classList.remove("invalid"));
      if (name.value.trim().length < 2) { name.focus(); setSt(st, "error", "Enter the payee\\u2019s name."); return; }
      if (det.value.trim().length < 2) { det.focus(); setSt(st, "error", "Enter an email or account last-4 for the payee."); return; }
      const btn = peForm.querySelector("button[type=submit]");
      busy(btn, true, "Adding\\u2026");
      try {
        await api("/api/payees", { method: "POST", body: { name: name.value.trim(), detail: det.value.trim() } });
        setSt(st, "ok", "Payee added.");
        peForm.reset();
        loadPayees();
      } catch (err) { setSt(st, "error", err.message); }
      busy(btn, false);
    });
    const peList = $("#payeeList");
    if (peList) peList.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-pe-del]");
      if (!b) return;
      b.disabled = true;
      try { await api(`/api/payees/${b.dataset.peDel}`, { method: "DELETE" }); loadPayees(); }
      catch (err) { b.disabled = false; setSt($("#payeeStatus"), "error", err.message); }
    });

    /* ---- payment ---- */
    const payForm = $("#payForm");
    if (payForm) {
      const dateEl = $("#payDate");
      if (dateEl) dateEl.min = new Date().toISOString().slice(0, 10);
      payForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const amt = $("#payAmount"), st = $("#payStatus");
        amt.closest(".field").classList.remove("invalid");
        if (!amtOk(amt.value) || parseFloat(amt.value) <= 0) {
          amt.closest(".field").classList.add("invalid");
          amt.closest(".field").querySelector(".field-error").textContent = "Enter an amount like 75.00.";
          amt.focus();
          return;
        }
        const sel = $("#payPayee");
        if (sel.disabled || !sel.value) { setSt(st, "error", "Add a payee first."); return; }
        const btn = payForm.querySelector("button[type=submit]");
        busy(btn, true, "Scheduling\\u2026");
        try {
          const d = await api("/api/payments", { method: "POST", body: {
            payeeId: sel.value, accountId: $("#payFrom").value,
            amount: amt.value.trim(), scheduledFor: dateEl && dateEl.value ? dateEl.value : null,
          }});
          setSt(st, "ok", d.payment.status === "scheduled"
            ? `Payment to ${d.payment.payeeName} scheduled for ${dshort(d.payment.scheduledFor)}.`
            : `Payment to ${d.payment.payeeName} sent \u2014 new balance ${fmt(d.account.balanceCents)}.`);
          showToast("Payment recorded.");
          payForm.reset();
          refreshDash();
          loadPayments();
        } catch (err) { setSt(st, "error", err.message); }
        busy(btn, false);
      });
    }
    const payList = $("#paymentsList");
    if (payList) payList.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-pay-cancel]");
      if (!b) return;
      b.disabled = true;
      try {
        await api(`/api/payments/${b.dataset.payCancel}`, { method: "DELETE" });
        showToast("Scheduled payment cancelled.");
        loadPayments();
      } catch (err) { b.disabled = false; showToast(err.message); }
    });

    /* ---- support cases ---- */
    const caseForm = $("#caseForm");
    if (caseForm) caseForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const subj = $("#csSubject"), msg = $("#csMessage"), st = $("#csStatus");
      [subj, msg].forEach((el) => el.closest(".field").classList.remove("invalid"));
      const failF = (el, m) => {
        const f = el.closest(".field");
        f.classList.add("invalid");
        f.querySelector(".field-error").textContent = m;
        el.focus();
        return false;
      };
      if (subj.value.trim().length < 3) return failF(subj, "Give your case a short subject.");
      if (msg.value.trim().length < 5) return failF(msg, "Tell us a little more (at least 5 characters).");
      const btn = caseForm.querySelector("button[type=submit]");
      busy(btn, true, "Submitting\\u2026");
      try {
        const d = await api("/api/support", { method: "POST", body: {
          category: "account", subject: subj.value.trim(), message: msg.value.trim(),
        }});
        setSt(st, "ok", `Case ${d.case.id} opened \u2014 replies appear in this list.`);
        showToast(`Case ${d.case.id} opened.`);
        caseForm.reset();
        loadCases();
      } catch (err) { setSt(st, "error", err.message); }
      busy(btn, false);
    });

    /* ---- profile ---- */
    const pfForm = $("#pfForm");
    if (pfForm) pfForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#pfEmail"), phone = $("#pfPhone"), st = $("#pfStatus");
      [email, phone].forEach((el) => el.closest(".field").classList.remove("invalid"));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
        const f = email.closest(".field");
        f.classList.add("invalid");
        f.querySelector(".field-error").textContent = "Enter a valid email address.";
        email.focus();
        return;
      }
      const btn = pfForm.querySelector("button[type=submit]");
      busy(btn, true, "Saving\\u2026");
      try {
        const d = await api("/api/me", { method: "PATCH", body: { email: email.value.trim(), phone: phone.value.trim() } });
        currentUser = d.user;
        setSt(st, "ok", "Profile saved.");
        $$("[data-email-badge]").forEach((el) => { el.textContent = d.user.email; });
        renderHeaderAccount();
      } catch (err) { setSt(st, "error", err.message); }
      busy(btn, false);
    });

    /* ---- change password ---- */
    const pwForm = $("#pwForm");
    if (pwForm) pwForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const cur = $("#pwCurrent"), next = $("#pwNext"), next2 = $("#pwNext2"), st = $("#pwStatus");
      [cur, next, next2].forEach((el) => el.closest(".field").classList.remove("invalid"));
      const failF = (el, m) => {
        const f = el.closest(".field");
        f.classList.add("invalid");
        f.querySelector(".field-error").textContent = m;
        el.focus();
        return false;
      };
      if (!cur.value) return failF(cur, "Enter your current password.");
      if (next.value.length < 8) return failF(next, "New password must be at least 8 characters.");
      if (next.value !== next2.value) return failF(next2, "Passwords do not match.");
      const btn = pwForm.querySelector("button[type=submit]");
      busy(btn, true, "Updating\\u2026");
      try {
        const d = await api("/api/auth/change-password", { method: "POST", body: { current: cur.value, next: next.value } });
        setSt(st, "ok", d.revokedOtherSessions > 0
          ? `Password updated \u2014 ${d.revokedOtherSessions} other session${d.revokedOtherSessions === 1 ? "" : "s"} signed out.`
          : "Password updated.");
        pwForm.reset();
      } catch (err) { setSt(st, "error", err.message); }
      busy(btn, false);
    });

    /* ---- sign out others ---- */
    const soAll = $("#signoutAll");
    if (soAll) soAll.addEventListener("click", async () => {
      soAll.disabled = true;
      try {
        const d = await api("/api/auth/logout-others", { method: "POST" });
        showToast(d.revoked > 0 ? `Signed out ${d.revoked} other device${d.revoked === 1 ? "" : "s"}.` : "No other devices were signed in.");
      } catch (err) { showToast(err.message); }
      soAll.disabled = false;
    });

    /* ---- header sign out on the account page ---- */
    const so = $("#acctSignout");
    if (so) so.addEventListener("click", async () => {
      so.disabled = true;
      try { await api("/api/auth/logout", { method: "POST" }); } catch { /* best effort */ }
      window.location.href = "index.html";
    });

    /* ---- show all activity ---- */
    const more = $("#txnsMore");
    if (more) more.addEventListener("click", () => { txnShowAll = !txnShowAll; loadTxns(); });
  };

  const initAccountPage = async () => {
    if (!currentUser) { window.location.replace("sign-in.html?next=account"); return; }
    $$("[data-greeting]").forEach((el) => { el.textContent = `Welcome, ${firstName(currentUser)}`; });
    $$("[data-username-badge]").forEach((el) => { el.textContent = currentUser.username || ""; });
    $$("[data-email-badge]").forEach((el) => { el.textContent = currentUser.email || "\u2014"; });
    const pfEmail = $("#pfEmail"); if (pfEmail) pfEmail.value = currentUser.email || "";
    const pfPhone = $("#pfPhone"); if (pfPhone) pfPhone.value = currentUser.phone || "";
    bindAccountForms();
    try {
      const d = await api("/api/accounts");
      renderAccounts(d.accounts);
    } catch (e) {
      const grid = $("#acctGrid");
      if (grid) { grid.setAttribute("aria-busy", "false"); grid.innerHTML = `<p class="form-status is-error">${esc(e.message)}</p>`; }
    }
    loadTxns();
    loadLimits();
    loadPayees();
    loadPayments();
    loadCases();
  };

  /* ================================================================
     10. Search page + empty 404 search
     ================================================================ */
  const runSearch = (q, resultsEl, statusEl) => {
    if (!resultsEl) return;
    const query = (q || "").trim().toLowerCase();
    resultsEl.innerHTML = "";
    if (!query) {
      if (statusEl) statusEl.textContent = "Enter a word or phrase to search the site.";
      return;
    }
    if (statusEl) statusEl.textContent = "Searching…";
    resultsEl.classList.add("is-loading");
    window.setTimeout(() => {
      const hits = (window.SITE_INDEX || []).filter((p) =>
        (p.title + " " + p.desc + " " + (p.kw || "")).toLowerCase().includes(query)
      );
      resultsEl.classList.remove("is-loading");
      if (statusEl) {
        statusEl.textContent = hits.length
          ? `${hits.length} result${hits.length === 1 ? "" : "s"} for “${q.trim()}”`
          : `No results for “${q.trim()}” — try checking, cards, mortgage or support.`;
      }
      hits.forEach((p) => {
        const a = document.createElement("a");
        a.className = "search-hit";
        a.href = p.url;
        a.innerHTML = `<strong>${p.title}</strong><span>${p.desc}</span>`;
        resultsEl.appendChild(a);
      });
    }, 350);
  };

  const searchPage = $("#searchPage");
  if (searchPage) {
    const input = $("#searchInput");
    const results = $("#searchResults");
    const status = $("#searchStatus");
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    if (input) input.value = q;
    runSearch(q, results, status);
    const form = $("#searchForm");
    if (form) form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value;
      history.replaceState(null, "", "search.html" + (v ? `?q=${encodeURIComponent(v)}` : ""));
      runSearch(v, results, status);
    });
  }

  /* ================================================================
     10b. Support forms → notification events (console or queue)
     ================================================================ */
  const formStatus = (el, state, msg) => {
    if (!el) return;
    el.hidden = false;
    el.classList.toggle("is-error", state === "error");
    el.classList.toggle("is-ok", state === "ok");
    el.textContent = msg;
  };
  const invalidField = (input, msg) => {
    const f = input.closest(".field");
    if (f) {
      f.classList.add("invalid");
      const err = f.querySelector(".field-error");
      if (err) err.textContent = msg;
    }
    input.focus();
    return false;
  };
  const clearField = (input) => {
    const f = input.closest(".field");
    if (f) f.classList.remove("invalid");
  };
  const deliver = async (type, payload, statusEl, okMsg, btn) => {
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Sending…"; }
    const res = window.SiteNotify
      ? await window.SiteNotify.send(type, payload)
      : { status: "queued" };
    if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || "Send"; }
    if (res.status === "sent") {
      formStatus(statusEl, "ok", okMsg.sent);
    } else {
      formStatus(statusEl, "ok", okMsg.queued);
    }
    return res;
  };
  const emailOK = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

  const meetingForm = $("#meetingForm");
  if (meetingForm) {
    meetingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#mtName"), email = $("#mtEmail");
      [name, email].forEach(clearField);
      if (name.value.trim().length < 2) return invalidField(name, "Enter your name.");
      if (!emailOK(email.value)) return invalidField(email, "Enter a valid email address.");
      await deliver("meeting", {
        name: name.value.trim(), email: email.value.trim(),
        topic: $("#mtTopic").value, when: $("#mtWhen").value,
        note: $("#mtNote").value.trim()
      }, $("#mtStatus"), {
        sent: "Request sent to the support console — keep an eye on your inbox for confirmation.",
        queued: "The support console is offline right now — your request is saved on this device and will be delivered as soon as it's back."
      }, meetingForm.querySelector("button[type=submit]"));
      meetingForm.reset();
    });
    ["mtName", "mtEmail"].forEach((id) => $("#" + id) && $("#" + id).addEventListener("input", (e) => clearField(e.target)));
  }

  const feedbackForm = $("#feedbackForm");
  if (feedbackForm) {
    feedbackForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#fbName"), email = $("#fbEmail"), msg = $("#fbMsg");
      [name, email, msg].forEach(clearField);
      if (name.value.trim().length < 2) return invalidField(name, "Enter your name.");
      if (email.value.trim() && !emailOK(email.value)) return invalidField(email, "Enter a valid email address.");
      if (msg.value.trim().length < 5) return invalidField(msg, "Tell us a little more (at least 5 characters).");
      const btn = feedbackForm.querySelector("button[type=submit]");
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Sending\u2026"; }
      try {
        const subject = msg.value.trim().slice(0, 60);
        const d = await api("/api/support", { method: "POST", body: {
          category: $("#fbCat").value || "feedback",
          subject,
          message: msg.value.trim(),
          name: name.value.trim(),
          email: email.value.trim() || undefined,
        }});
        formStatus($("#fbStatus"), "ok", currentUser
          ? `Case ${d.case.id} opened \u2014 track it under Support cases in your account hub.`
          : `Case ${d.case.id} opened \u2014 keep this case number for follow-up.`);
        feedbackForm.reset();
      } catch (err) {
        formStatus($("#fbStatus"), "error", err.message);
      }
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || "Send"; }
    });
    ["fbName", "fbEmail", "fbMsg"].forEach((id) => $("#" + id) && $("#" + id).addEventListener("input", (e) => clearField(e.target)));
  }

  /* ================================================================
     11. Header account + boot
     ================================================================ */
  /* ================================================================
     12. Password reset page (request link → console delivery → set new)
     ================================================================ */
  const rsReqForm = $("#resetReqForm");
  if (rsReqForm) {
    const params = new URLSearchParams(location.search);
    const preU = (params.get("u") || "").trim();
    const preT = (params.get("t") || "").trim();
    if (preU) {
      const uEl = $("#rsUsername");
      if (uEl) uEl.value = preU;
      if (preT) {
        $("#resetRequest").hidden = true;
        $("#resetSet").hidden = false;
        const who = $("#rsWho"); if (who) who.textContent = preU;
        const tEl = $("#rsToken"); if (tEl) tEl.value = preT;
      }
    }
    rsReqForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const uEl = $("#rsUsername"), st = $("#rsReqStatus"), btn = $("#rsRequest");
      const f = uEl.closest(".field");
      f.classList.remove("invalid");
      if (!uEl.value.trim()) {
        f.classList.add("invalid");
        f.querySelector(".field-error").textContent = "Enter your username.";
        uEl.focus();
        return;
      }
      btn.disabled = true;
      btn.textContent = "Sending\u2026";
      try {
        const d = await api("/api/auth/forgot", { method: "POST", body: { username: uEl.value.trim() } });
        st.hidden = false;
        st.className = "signin-status is-ok";
        st.textContent = d.message;
        /* reveal the set panel so the operator-delivered code can be pasted
           (the request panel stays visible so the honest delivery note remains) */
        $("#resetSet").hidden = false;
        const who = $("#rsWho"); if (who) who.textContent = uEl.value.trim();
      } catch (err) {
        st.hidden = false;
        st.className = "signin-status is-error";
        st.textContent = err.message;
      }
      btn.disabled = false;
      btn.textContent = "Send reset request";
    });
  }
  const rsSetForm = $("#resetSetForm");
  if (rsSetForm) {
    const rsToggle = $("#rsPwToggle");
    if (rsToggle) rsToggle.addEventListener("click", () => {
      const p = $("#rsNewPass");
      const showing = p.type === "text";
      p.type = showing ? "password" : "text";
      rsToggle.textContent = showing ? "Show" : "Hide";
      rsToggle.setAttribute("aria-pressed", String(!showing));
    });
    rsSetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const tok = $("#rsToken"), p1 = $("#rsNewPass"), p2 = $("#rsNewPass2"), st = $("#rsSetStatus");
      [tok, p1, p2].forEach((el) => el.closest(".field").classList.remove("invalid"));
      const failF = (el, m) => {
        const f = el.closest(".field");
        f.classList.add("invalid");
        f.querySelector(".field-error").textContent = m;
        el.focus();
        return false;
      };
      const uname = ($("#rsWho").textContent || "").trim();
      if (!tok.value.trim()) return failF(tok, "Paste the code from your reset link.");
      if (p1.value.length < 8) return failF(p1, "New password must be at least 8 characters.");
      if (p1.value !== p2.value) return failF(p2, "Passwords do not match.");
      const btn = $("#rsSubmit");
      btn.disabled = true;
      btn.textContent = "Setting password\u2026";
      try {
        await api("/api/auth/reset", { method: "POST", body: { username: uname, token: tok.value.trim(), password: p1.value } });
        st.hidden = false;
        st.className = "signin-status is-ok";
        st.textContent = "Password updated. You can sign in now.";
        rsSetForm.reset();
        window.setTimeout(() => { window.location.href = "sign-in.html"; }, 1200);
      } catch (err) {
        st.hidden = false;
        st.className = "signin-status is-error";
        st.textContent = err.message;
      }
      btn.disabled = false;
      btn.textContent = "Set new password";
    });
  }

  document.documentElement.classList.add("chrome-ready");
  const bootSession = async () => {
    await fetchSession();
    renderHeaderAccount();
    if (document.body.dataset.page === "account") await initAccountPage();
  };
  bootSession();
})();
