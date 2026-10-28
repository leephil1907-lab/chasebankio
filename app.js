(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  // Responsive navigation
  const menuToggle = $("#menuToggle");
  const primaryNav = $("#primaryNav");
  if (menuToggle && primaryNav) {
    menuToggle.addEventListener("click", () => {
      const expanded = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!expanded));
      menuToggle.setAttribute("aria-label", expanded ? "Open navigation" : "Close navigation");
      document.body.classList.toggle("menu-open", !expanded);
    });
    $$("a", primaryNav).forEach(link => link.addEventListener("click", () => {
      document.body.classList.remove("menu-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
    }));
  }

  // Product category filters
  $$("[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      const value = button.dataset.filter;
      $$("[data-filter]").forEach(item => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      $$(".product-card").forEach(card => {
        card.hidden = value !== "all" && card.dataset.category !== value;
      });
    });
    button.setAttribute("aria-pressed", String(button.classList.contains("active")));
  });

  // Sample card filters
  $$("[data-card-filter]").forEach(button => {
    button.addEventListener("click", () => {
      const value = button.dataset.cardFilter;
      $$("[data-card-filter]").forEach(item => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      $$(".credit-option").forEach(card => {
        card.hidden = value !== "all" && card.dataset.cardType !== value;
      });
    });
    button.setAttribute("aria-pressed", String(button.classList.contains("active")));
  });

  // Business needs selector updates the recommendation panel.
  const businessContent = {
    startup: {
      title: "Build a strong foundation.",
      text: "Start with a business account concept, separate your business activity and create a clearer view of cash flow.",
      items: ["Business checking overview", "Cash-flow planning basics", "Tools to organize expenses"]
    },
    payments: {
      title: "Make getting paid easier.",
      text: "Map how customers pay you, when funds arrive and which records help you reconcile sales.",
      items: ["Payment workflow checklist", "Settlement and reconciliation basics", "Customer invoice organization"]
    },
    credit: {
      title: "Plan borrowing with care.",
      text: "Understand common financing terms, estimate repayments and prepare the records a lender may ask to review.",
      items: ["Financing terminology guide", "Repayment estimate", "Document preparation checklist"]
    },
    all: {
      title: "Bring the moving parts together.",
      text: "Use a simple overview to organize day-to-day banking, payment workflows and future financing questions.",
      items: ["Business banking overview", "Payment workflow checklist", "Cash-flow planning basics"]
    }
  };
  $$("[data-need]").forEach(button => {
    button.addEventListener("click", () => {
      const data = businessContent[button.dataset.need];
      if (!data) return;
      $$("[data-need]").forEach(item => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      const title = $("#businessResultTitle");
      const text = $("#businessResultText");
      const list = $("#businessResultList");
      if (title) title.textContent = data.title;
      if (text) text.textContent = data.text;
      if (list) {
        list.replaceChildren(...data.items.map(label => {
          const li = document.createElement("li");
          li.textContent = label;
          return li;
        }));
      }
    });
    button.setAttribute("aria-pressed", String(button.classList.contains("active")));
  });

  // Loan payment estimator: fixed-rate amortization, excluding taxes and fees.
  const amount = $("#loanAmount");
  const apr = $("#loanApr");
  const term = $("#loanTerm");
  const amountOutput = $("#amountOutput");
  const monthlyOutput = $("#monthlyPayment");
  const summary = $("#paymentSummary");
  const money = value => new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 2
  }).format(value);

  function updatePayment() {
    if (!amount || !apr || !term || !monthlyOutput) return;
    const principal = Math.max(0, Number(amount.value) || 0);
    const annualRate = Math.min(35, Math.max(0, Number(apr.value) || 0));
    const months = Math.max(1, Number(term.value) || 1);
    const monthlyRate = annualRate / 1200;
    const payment = monthlyRate === 0
      ? principal / months
      : principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
    if (amountOutput) amountOutput.textContent = money(principal).replace(".00", "");
    monthlyOutput.textContent = money(Number.isFinite(payment) ? payment : 0);
    if (summary) summary.textContent = months + " monthly payments · before taxes and fees";
  }
  [amount, apr, term].filter(Boolean).forEach(input => {
    input.addEventListener("input", updatePayment);
    input.addEventListener("change", updatePayment);
  });
  const calculator = $("#loanCalculator");
  if (calculator) calculator.addEventListener("submit", event => {
    event.preventDefault();
    updatePayment();
  });
  updatePayment();

  // Clear, non-transactional information for demo-only actions.
  function showNotice(title, message) {
    let dialog = $("#siteNotice");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "siteNotice";
      dialog.className = "notice-dialog";
      dialog.innerHTML = '<div class="notice-dialog-inner"><button type="button" class="notice-close" aria-label="Close notice">×</button><p class="eyebrow">HARBORLINE PROTOTYPE</p><h2 class="notice-title"></h2><p class="notice-message"></p><button type="button" class="btn btn-primary notice-confirm">Continue exploring</button></div>';
      document.body.append(dialog);
      $(".notice-close", dialog).addEventListener("click", () => dialog.close());
      $(".notice-confirm", dialog).addEventListener("click", () => dialog.close());
      dialog.addEventListener("click", event => {
        if (event.target === dialog) dialog.close();
      });
    }
    $(".notice-title", dialog).textContent = title;
    $(".notice-message", dialog).textContent = message;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else window.alert(title + "\n\n" + message);
  }

  $$("[data-route]").forEach(button => {
    button.addEventListener("click", () => {
      const route = button.dataset.route;
      const messages = {
        signin: ["Demo sign-in", "This fictional experience has no real authentication. Do not enter a real password or financial details."],
        "open-account": ["Explore sample accounts", "Account opening is not available in this prototype. No application or financial account will be created."],
        dashboard: ["Sample dashboard", "This build is a public-facing interface prototype and is not connected to a bank account."]
      };
      const selected = messages[route];
      if (selected) showNotice(selected[0], selected[1]);
    });
  });

  $$("[data-card-details]").forEach(button => {
    button.addEventListener("click", () => {
      showNotice(button.dataset.cardDetails, "This is an illustrative card concept. The displayed benefits and fees are sample content, not an actual offer or application.");
    });
  });

  // Smooth in-page navigation, respecting reduced-motion preferences.
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = $(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start"
      });
      if (history.replaceState) history.replaceState(null, "", id);
    });
  });
})();