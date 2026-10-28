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
     2. Session helpers (local-only preview auth)
     ================================================================ */
  const getSession = () => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch { return null; }
  };
  const setSession = (user) => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch {}
  };
  const clearSession = () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  };
  const firstName = (user) => (user && (user.name || user.username || "").trim().split(/\s+/)[0]) || "there";
  const validUsername = (v) => v.trim().length >= 3;
  const validPassword = (v) => v.length >= 8;

  const goAccount = () => { window.location.href = "account.html"; };

  /* ================================================================
     3. Header account state (signed in vs signed out)
     ================================================================ */
  const renderHeaderAccount = () => {
    const slot = $("#headerAccount");
    if (!slot) return;
    const user = getSession();
    if (user) {
      slot.innerHTML =
        `<span class="welcome-chip"><span class="avatar" aria-hidden="true">${firstName(user).charAt(0).toUpperCase()}</span>Welcome, ${firstName(user).replace(/[<>&"]/g, "")}</span>` +
        `<a class="header-link" href="account.html">My account</a>` +
        `<button class="btn btn-outline btn-small" id="signoutBtn" type="button">Sign out</button>`;
      const out = $("#signoutBtn");
      if (out) out.addEventListener("click", () => { clearSession(); window.location.href = "index.html"; });
    }
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

    const attempt = () => {
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
      if (remember && remember.checked) {
        try { localStorage.setItem(REMEMBER_KEY, user.value.trim()); } catch {}
      } else {
        try { localStorage.removeItem(REMEMBER_KEY); } catch {}
      }
      submit.classList.add("is-busy");
      submit.disabled = true;
      const label = submit.textContent;
      submit.textContent = "Signing in…";
      window.setTimeout(() => {
        submit.classList.remove("is-busy");
        submit.disabled = false;
        submit.textContent = label;
        setSession({ name: user.value.trim(), username: user.value.trim(), at: Date.now() });
        goAccount();
      }, 650);
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

    const finish = e => {
      e.preventDefault();
      if (!validateStep(2)) return;
      const u = $("#suNewUser").value.trim();
      const name = `${$("#suFirst").value.trim()} ${$("#suLast").value.trim()}`;
      const email = $("#suEmail").value.trim();
      const btn = $("#suFinish");
      btn.disabled = true;
      btn.textContent = "Creating account…";
      window.setTimeout(() => {
        setSession({ name, username: u, email, at: Date.now() });
        $$(".su-step", signup).forEach((s) => { s.hidden = true; });
        chips.forEach((c) => { c.classList.remove("active"); c.classList.add("done"); });
        const done = $("#suSuccess");
        done.hidden = false;
        done.setAttribute("tabindex", "-1");
        done.focus();
        document.querySelector(".signup-progress").hidden = true;
      }, 900);
    };
    const finishBtn = $("#suFinish");
    if (finishBtn) finishBtn.addEventListener("click", finish);

    showStep(0);
  }

  /* ================================================================
     9. Account page guard + welcome
     ================================================================ */
  if (document.body.dataset.page === "account") {
    const user = getSession();
    if (!user) {
      window.location.replace("sign-in.html?next=account");
    } else {
      $$("[data-greeting]").forEach((el) => { el.textContent = `Welcome, ${firstName(user)}`; });
      $$("[data-username-badge]").forEach((el) => { el.textContent = user.username || ""; });
      $$("[data-email-badge]").forEach((el) => { el.textContent = user.email || "—"; });
    }
  }

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
     11. Header account + boot
     ================================================================ */
  renderHeaderAccount();
  document.documentElement.classList.add("chrome-ready");
})();
