(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const desktopMQ = window.matchMedia("(min-width: 1024px)");

  /* ---------------- Side menu (drawer) ---------------- */
  const menuToggle = $("#menuToggle");
  const menuClose = $("#menuClose");
  const mobileMenu = $("#mobileMenu");
  const menuBackdrop = $("#menuBackdrop");
  let lastFocused = null;

  const openMenu = () => {
    lastFocused = document.activeElement;
    mobileMenu.hidden = false;
    menuBackdrop.hidden = false;
    void mobileMenu.offsetWidth; // reflow so the transition runs
    mobileMenu.classList.add("open");
    menuBackdrop.classList.add("visible");
    document.body.classList.add("no-scroll");
    menuToggle.setAttribute("aria-expanded", "true");
    window.setTimeout(() => menuClose && menuClose.focus(), 140);
  };

  const closeMenu = () => {
    if (!mobileMenu.classList.contains("open")) return;
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

  if (menuToggle && mobileMenu && menuBackdrop) {
    menuToggle.addEventListener("click", openMenu);
    if (menuClose) menuClose.addEventListener("click", closeMenu);
    menuBackdrop.addEventListener("click", closeMenu);
    $$("a", mobileMenu).forEach((a) => a.addEventListener("click", closeMenu));
  }

  /* ---------------- Sign in: overlay (small screens) / focus (desktop) ---------------- */
  const signinToggle = $("#signinToggle");
  const signinCard = $("#signinCard");
  const signinClose = $("#signinClose");
  const signinBackdrop = $("#signinBackdrop");
  const usernameInput = $("#username");
  const passwordInput = $("#password");
  const pwToggle = $("#pwToggle");
  const signinSubmit = $("#signinSubmit");
  const signinNotice = $("#signinNotice");
  const passwordlessBtn = $("#passwordlessBtn");

  const openSignin = () => {
    document.body.classList.add("signin-open");
    if (signinBackdrop) {
      signinBackdrop.hidden = false;
      void signinBackdrop.offsetWidth;
      signinBackdrop.classList.add("visible");
    }
    signinToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("no-scroll");
    window.setTimeout(() => usernameInput && usernameInput.focus(), 80);
  };

  const closeSignin = () => {
    document.body.classList.remove("signin-open", "no-scroll");
    if (signinBackdrop) {
      signinBackdrop.classList.remove("visible");
      window.setTimeout(() => { signinBackdrop.hidden = true; }, 250);
    }
    signinToggle.setAttribute("aria-expanded", "false");
    signinToggle.focus();
  };

  if (signinToggle && signinCard) {
    signinToggle.addEventListener("click", () => {
      if (desktopMQ.matches) {
        // Card is already embedded in the hero on desktop — move focus to it.
        usernameInput && usernameInput.focus();
        signinCard.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        document.body.classList.contains("signin-open") ? closeSignin() : openSignin();
      }
    });
    if (signinClose) signinClose.addEventListener("click", closeSignin);
    if (signinBackdrop) signinBackdrop.addEventListener("click", closeSignin);
  }

  // Leaving the small-screen breakpoint returns the card to the hero.
  const handleBreakpoint = () => {
    if (desktopMQ.matches) {
      document.body.classList.remove("signin-open", "no-scroll");
      if (signinBackdrop) {
        signinBackdrop.classList.remove("visible");
        signinBackdrop.hidden = true;
      }
      closeMenu();
    }
  };
  if (typeof desktopMQ.addEventListener === "function") {
    desktopMQ.addEventListener("change", handleBreakpoint);
  } else if (typeof desktopMQ.addListener === "function") {
    desktopMQ.addListener(handleBreakpoint);
  }

  if (pwToggle && passwordInput) {
    pwToggle.addEventListener("click", () => {
      const showing = passwordInput.type === "text";
      passwordInput.type = showing ? "password" : "text";
      pwToggle.textContent = showing ? "Show" : "Hide";
      pwToggle.setAttribute("aria-pressed", String(!showing));
    });
  }

  // Preview-safe sign-in: never transmits or stores credentials.
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
  if (passwordlessBtn) passwordlessBtn.addEventListener("click", () => {
    if (signinNotice) signinNotice.hidden = false;
  });

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
    item.addEventListener("focusout", (e) => {
      if (!item.contains(e.relatedTarget)) {
        item.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  });

  /* ---------------- Utility "Customer service" menu ---------------- */
  const utilMenus = $$(".util-menu");
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-item")) closeAllNav(null);
    utilMenus.forEach((d) => {
      if (!d.contains(e.target)) d.removeAttribute("open");
    });
  });

  /* ---------------- Escape closes everything ---------------- */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeAllNav(null);
    utilMenus.forEach((d) => d.removeAttribute("open"));
    if (document.body.classList.contains("signin-open")) closeSignin();
    closeMenu();
  });
})();
