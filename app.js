(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Sticky header shadow ---------------- */
  const header = $("#siteHeader");
  if (header) {
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------- Sign in panel ---------------- */
  const signinToggle = $("#signinToggle");
  const signinPanel = $("#signinPanel");
  const pwToggle = $("#pwToggle");
  const passwordInput = $("#password");
  const usernameInput = $("#username");
  const signinSubmit = $("#signinSubmit");
  const signinNotice = $("#signinNotice");
  const passwordlessBtn = $("#passwordlessBtn");

  const closeSignin = () => {
    if (!signinPanel || signinPanel.hidden) return;
    signinPanel.hidden = true;
    signinToggle.setAttribute("aria-expanded", "false");
  };

  const openSignin = () => {
    signinPanel.hidden = false;
    signinToggle.setAttribute("aria-expanded", "true");
    window.setTimeout(() => usernameInput && usernameInput.focus(), 60);
  };

  if (signinToggle && signinPanel) {
    signinToggle.addEventListener("click", () => {
      signinPanel.hidden ? openSignin() : closeSignin();
    });

    document.addEventListener("click", (e) => {
      if (signinPanel.hidden) return;
      if (!signinPanel.contains(e.target) && e.target !== signinToggle) closeSignin();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeSignin();
    });
  }

  if (pwToggle && passwordInput) {
    pwToggle.addEventListener("click", () => {
      const showing = passwordInput.type === "text";
      passwordInput.type = showing ? "password" : "text";
      pwToggle.textContent = showing ? "Show" : "Hide";
      pwToggle.setAttribute("aria-pressed", String(!showing));
    });
  }

  // Demo-only sign-in: never transmits, stores or keeps credentials.
  const demoSignin = () => {
    if (usernameInput) usernameInput.value = "";
    if (passwordInput) {
      passwordInput.value = "";
      passwordInput.type = "password";
    }
    if (pwToggle) {
      pwToggle.textContent = "Show";
      pwToggle.setAttribute("aria-pressed", "false");
    }
    if (signinNotice) signinNotice.hidden = false;
  };

  if (signinSubmit) signinSubmit.addEventListener("click", demoSignin);
  if (passwordInput) {
    passwordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") demoSignin();
    });
  }
  if (passwordlessBtn) {
    passwordlessBtn.addEventListener("click", () => {
      if (signinNotice) signinNotice.hidden = false;
    });
  }

  /* ---------------- Desktop nav mega menus ---------------- */
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

    item.addEventListener("mouseenter", () => closeAllNav(item));
    item.addEventListener("mouseleave", () => {
      // Let CSS hover keep it visible; sync state when pointer leaves.
      if (!item.contains(document.activeElement)) {
        item.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });
    item.addEventListener("focusout", (e) => {
      if (!item.contains(e.relatedTarget)) {
        item.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-item")) closeAllNav(null);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllNav(null);
  });

  /* ---------------- Mobile / full menu drawer ---------------- */
  const menuToggle = $("#menuToggle");
  const menuClose = $("#menuClose");
  const mobileMenu = $("#mobileMenu");
  const menuBackdrop = $("#menuBackdrop");
  let lastFocused = null;

  const openMenu = () => {
    lastFocused = document.activeElement;
    mobileMenu.hidden = false;
    menuBackdrop.hidden = false;
    // Force reflow so the transition runs
    void mobileMenu.offsetWidth;
    mobileMenu.classList.add("open");
    menuBackdrop.classList.add("visible");
    document.body.classList.add("no-scroll");
    menuToggle.setAttribute("aria-expanded", "true");
    window.setTimeout(() => menuClose && menuClose.focus(), 120);
  };

  const closeMenu = () => {
    mobileMenu.classList.remove("open");
    menuBackdrop.classList.remove("visible");
    document.body.classList.remove("no-scroll");
    menuToggle.setAttribute("aria-expanded", "false");
    window.setTimeout(() => {
      mobileMenu.hidden = true;
      menuBackdrop.hidden = true;
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }, 320);
  };

  if (menuToggle && mobileMenu && menuBackdrop) {
    menuToggle.addEventListener("click", openMenu);
    if (menuClose) menuClose.addEventListener("click", closeMenu);
    menuBackdrop.addEventListener("click", closeMenu);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileMenu.classList.contains("open")) closeMenu();
    });
    // Close drawer after navigating
    $$("a", mobileMenu).forEach((a) => a.addEventListener("click", closeMenu));
  }

  /* ---------------- Choices carousel ---------------- */
  const track = $("#choicesTrack");
  const prevBtn = $("#choicesPrev");
  const nextBtn = $("#choicesNext");

  if (track && prevBtn && nextBtn) {
    const updateButtons = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      prevBtn.disabled = track.scrollLeft <= 4;
      nextBtn.disabled = track.scrollLeft >= maxScroll - 4;
    };
    const scrollByAmount = (dir) => {
      track.scrollBy({
        left: dir * Math.max(track.clientWidth * 0.8, 240),
        behavior: reducedMotion ? "auto" : "smooth"
      });
    };
    prevBtn.addEventListener("click", () => scrollByAmount(-1));
    nextBtn.addEventListener("click", () => scrollByAmount(1));
    track.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons);
    // Keyboard support when the track is focused
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); scrollByAmount(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); scrollByAmount(-1); }
    });
    updateButtons();
  }

  /* ---------------- Reveal on scroll ---------------- */
  const revealEls = $$(".reveal");
  if (revealEls.length) {
    if ("IntersectionObserver" in window && !reducedMotion) {
      // Stagger siblings for a polished cascade
      const groups = new Map();
      revealEls.forEach((el) => {
        const parent = el.parentElement;
        const idx = groups.get(parent) || 0;
        el.style.setProperty("--d", `${Math.min(idx * 0.09, 0.45)}s`);
        groups.set(parent, idx + 1);
      });
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add("in"));
    }
  }

  /* ---------------- Footer accordions (mobile only) ---------------- */
  const footerCols = $$(".footer-col");
  const mobileMQ = window.matchMedia("(max-width: 767px)");

  const syncFooter = () => {
    footerCols.forEach((col) => {
      if (mobileMQ.matches) {
        col.removeAttribute("open");
      } else {
        col.setAttribute("open", "");
      }
    });
  };

  footerCols.forEach((col) => {
    const summary = $("summary", col);
    if (!summary) return;
    summary.addEventListener("click", (e) => {
      // Columns stay expanded on desktop; toggling only happens on mobile.
      if (!mobileMQ.matches) e.preventDefault();
    });
  });

  syncFooter();
  if (typeof mobileMQ.addEventListener === "function") {
    mobileMQ.addEventListener("change", syncFooter);
  } else if (typeof mobileMQ.addListener === "function") {
    mobileMQ.addListener(syncFooter);
  }
})();
