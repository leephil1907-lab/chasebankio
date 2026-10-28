/* ============================================================
   chrome.js — shared site chrome (header, side menu, sign-in
   overlay, footer, icon sprite) injected into every page.
   Single source of truth so navigation, logo placement and
   footer content stay identical across the whole site.
   ============================================================ */
(() => {
  "use strict";

  /* ---------------- Navigation model (local-first) ---------------- */
  const NAV = [
    { id: "checking", label: "Checking", href: "checking.html", mega: [
      ["Open a checking account", "checking.html"],
      ["Chase Total Checking®", "checking.html#total"],
      ["Chase Secure Banking℠", "checking.html#secure"],
      ["Chase Private Client™", "checking.html#private"]
    ]},
    { id: "savings", label: "Savings & CDs", href: "savings.html", mega: [
      ["Open a savings account", "savings.html"],
      ["Savings accounts", "savings.html#accounts"],
      ["Certificates of Deposit", "savings.html#cds"],
      ["See interest rates", "https://www.chase.com/personal/savings/bank-cd"]
    ]},
    { id: "cards", label: "Credit cards", href: "credit-cards.html", mega: [
      ["Explore credit cards", "credit-cards.html"],
      ["Rewards credit cards", "credit-cards.html#rewards"],
      ["Cash back credit cards", "credit-cards.html#cashback"],
      ["Free credit score", "credit-cards.html#score"]
    ]},
    { id: "home", label: "Home loans", href: "home-loans.html", mega: [
      ["Buy a home", "home-loans.html#buy"],
      ["Refinance", "home-loans.html#refi"],
      ["Home equity line of credit (HELOC)", "home-loans.html#heloc"],
      ["Mortgage preapproval", "home-loans.html#preapproval"],
      ["Today's mortgage rates", "https://www.chase.com/personal/mortgage/mortgage-rates"],
      ["Mortgage calculator", "https://www.chase.com/personal/mortgage/calculators-resources/mortgage-calculator"]
    ]},
    { id: "auto", label: "Auto", href: "auto.html", mega: [
      ["Chase Auto", "auto.html"],
      ["Apply for auto financing", "auto.html#apply"],
      ["Payment calculator", "https://www.chase.com/personal/auto/payment-calculator"],
      ["Chase Auto Education Center", "auto.html#learn"]
    ]},
    { id: "investing", label: "Investing by J.P. Morgan", href: "investing.html", mega: [
      ["Invest on your own", "investing.html"],
      ["Work with an advisor", "investing.html#advisor"],
      ["Current offers", "investing.html#offers"],
      ["Investment education", "investing.html#learn"],
      ["Wealth Management Branch", "https://jpmorganwealthmanagement.chase.com/advisor"]
    ]},
    { id: "education", label: "Education & goals", href: "education.html", mega: [
      ["Banking Education Center", "education.html"],
      ["Student Center", "education.html#students"],
      ["Online & mobile banking", "education.html#online"],
      ["Zelle®", "https://www.chase.com/personal/zelle"]
    ]},
    { id: "travel", label: "Travel", href: "travel.html", mega: [
      ["Explore Chase Travel", "travel.html"],
      ["Travel credit cards", "travel.html#cards"],
      ["Book with points", "travel.html#points"]
    ]}
  ];

  const currentFile = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const activeNavId = (() => {
    const map = {
      "checking.html": "checking", "savings.html": "savings", "credit-cards.html": "cards",
      "home-loans.html": "home", "auto.html": "auto", "investing.html": "investing",
      "education.html": "education", "travel.html": "travel", "business.html": null
    };
    return map[currentFile] ?? null;
  })();

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const link = (label, href) => {
    const ext = /^https?:/i.test(href);
    return `<a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`;
  };

  /* ---------------- Icon sprite ---------------- */
  const SPRITE = `
  <svg class="icon-sprite" aria-hidden="true" focusable="false" style="display:none" xmlns="http://www.w3.org/2000/svg">
    <symbol id="ic-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3.5 7h17M3.5 12h17M3.5 17h17"/></symbol>
    <symbol id="ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></symbol>
    <symbol id="ic-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></symbol>
    <symbol id="ic-chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></symbol>
    <symbol id="ic-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M15.8 15.8L21 21"/></symbol>
    <symbol id="ic-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></symbol>
    <symbol id="ic-ehl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.2L12 3.8l9 7.4"/><path d="M5.4 10v10h13.2V10"/><path d="M8.6 13.4h6.8M8.6 16.6h6.8"/></symbol>
    <symbol id="s-fb" viewBox="0 0 24 24"><path fill="currentColor" d="M13.4 21v-7.2h2.4l.37-2.8H13.4V9.2c0-.81.22-1.36 1.38-1.36h1.47V5.34c-.25-.03-1.13-.11-2.15-.11-2.12 0-3.57 1.3-3.57 3.68v2.07H8v2.8h2.53V21z"/></symbol>
    <symbol id="s-ig" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.6"/><circle cx="12" cy="12" r="4"/><circle cx="17.1" cy="6.9" r="1.05" fill="currentColor" stroke="none"/></symbol>
    <symbol id="s-x" viewBox="0 0 24 24"><path fill="currentColor" d="M17.6 3h3.1l-6.8 7.8L21.8 21h-6.3l-4.9-6.4L4.9 21H1.8l7.3-8.4L1.5 3h6.4l4.4 5.9zm-1.1 16.1h1.7L6.9 4.8H5.1z"/></symbol>
    <symbol id="s-yt" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2.6" y="5.6" width="18.8" height="12.8" rx="3.4"/><path d="M10.3 9.4l5.2 2.6-5.2 2.6z" fill="currentColor" stroke="none"/></symbol>
    <symbol id="s-li" viewBox="0 0 24 24"><path fill="currentColor" d="M6.5 8.9H3.7V21h2.8zM5.1 3.4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zM20.5 13.7c0-3.2-1.7-4.8-4-4.8-1.8 0-2.7 1-3.1 1.7V8.9h-2.8c0 .8 0 12.1 0 12.1h2.8v-6.8c0-.4 0-.7.1-1 .3-.7.9-1.4 1.9-1.4 1.4 0 1.9 1 1.9 2.6V21h3.2z"/></symbol>
    <symbol id="s-pin" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.5C6.8 2.5 4 6.1 4 9.4c0 2 .8 3.8 2.4 4.4.3.1.5 0 .6-.3l.2-1c.1-.3 0-.4-.2-.7-.5-.6-.8-1.4-.8-2.5 0-3.2 2.4-6 6.2-6 3.4 0 5.3 2 5.3 4.8 0 3.6-1.6 6.6-3.9 6.6-1.3 0-2.3-1.1-2-2.4l.8-3.2c.3-1.1.9-2.2 2.4-2.2 1.8 0 3.1 1.8 3.1 4.4 0 2.6-1.1 4.7-3.1 4.7-1 0-1.9-.5-2.2-1.2l-.6 2.4c-.2.9-.8 2-1.2 2.7.9.3 1.9.4 2.9.4 5.2 0 8-3.6 8-6.9 0-4.5-3.5-7.9-9-7.9z"/></symbol>
  </svg>`;

  /* ---------------- Header ---------------- */
  const navHTML = NAV.map((item) => `
        <div class="nav-item${activeNavId === item.id ? " nav-active" : ""}">
          <button class="nav-trigger" aria-expanded="false" aria-controls="mega-${item.id}">${item.label}</button>
          <div class="mega" id="mega-${item.id}">
            ${item.mega.map(([l, h]) => link(l, h)).join("\n            ")}
          </div>
        </div>`).join("");

  const HEADER = `${SPRITE}
    <div class="progress-bar" aria-hidden="true"></div>
    <div class="utility-bar">
      <div class="wrap utility-inner">
        <nav class="utility-tabs" aria-label="Audience">
          <a href="index.html" class="active" aria-current="true">Personal</a>
          <a href="business.html">Business</a>
          <a href="business.html#commercial">Commercial</a>
        </nav>
        <nav class="utility-links" aria-label="Connect with us">
          <a href="support.html#meeting">Schedule a meeting</a>
          <details class="util-menu">
            <summary>Customer service <svg class="chev" aria-hidden="true"><use href="#ic-chevron"/></svg></summary>
            <div class="util-menu-panel">
              <a href="support.html">Contact us</a>
              <a href="support.html#feedback">Chase complaints and feedback</a>
              <a href="support.html#security">Report fraud</a>
            </div>
          </details>
          <a href="https://www.chase.com/espanol" lang="es" target="_blank" rel="noopener">Espa&ntilde;ol</a>
          <a class="utility-search" href="search.html" aria-label="Search this site"><svg class="icon" aria-hidden="true"><use href="#ic-search"/></svg></a>
        </nav>
      </div>
    </div>

    <div class="logo-row">
      <div class="wrap logo-inner">
        <button class="icon-btn menu-btn" id="menuToggle" aria-expanded="false" aria-controls="mobileMenu" aria-label="Open side menu">
          <svg class="icon" aria-hidden="true"><use href="#ic-menu"/></svg>
        </button>
        <a class="brand" href="index.html" aria-label="Chase logo, links to Chase home">
          <img src="logo.svg" alt="Chase" width="126" height="24">
        </a>
        <div class="header-account" id="headerAccount">
          <button class="btn btn-signin" id="signinToggle" aria-expanded="false" aria-controls="signinOverlay">Sign in<span class="sr-only">, opens overlay</span></button>
        </div>
      </div>
    </div>

    <nav class="primary-nav" aria-label="Primary navigation">
      <div class="wrap nav-inner">${navHTML}
      </div>
    </nav>`;

  /* ---------------- Side menu ---------------- */
  const drawerGroups = NAV.map((item) => `
      <details class="mm-group"${activeNavId === item.id ? " open" : ""}><summary>${item.label} <svg class="chev-r" aria-hidden="true"><use href="#ic-chevron-right"/></svg></summary>
        <ul>${item.mega.map(([l, h]) => `\n          <li>${link(l, h)}</li>`).join("")}
        </ul>
      </details>`).join("");

  const DRAWER = `
  <div class="menu-backdrop" id="menuBackdrop" hidden></div>
  <aside class="mobile-menu" id="mobileMenu" hidden aria-label="Side menu">
    <div class="mm-head">
      <img class="mm-logo" src="logo.svg" alt="Chase" width="126" height="24">
      <button class="icon-btn" id="menuClose" aria-label="Close menu"><svg class="icon" aria-hidden="true"><use href="#ic-close"/></svg></button>
    </div>
    <div class="mm-scroll">
      <form class="mm-search" action="search.html" method="get" role="search">
        <svg class="icon" aria-hidden="true"><use href="#ic-search"/></svg>
        <input type="search" name="q" placeholder="Search" aria-label="Search this site">
      </form>${drawerGroups}

      <p class="mm-label">Connect with us</p>
      <ul class="mm-plain">
        <li><a href="support.html#meeting">Schedule a meeting</a></li>
        <li><a href="support.html">Customer service <svg class="chev-r" aria-hidden="true"><use href="#ic-chevron-right"/></svg></a></li>
        <li><a href="https://www.chase.com/locator" target="_blank" rel="noopener">Find a Chase branch</a></li>
      </ul>

      <p class="mm-label">Other products</p>
      <ul class="mm-plain">
        <li><a href="business.html">Business</a></li>
        <li><a href="business.html#commercial">Commercial</a></li>
        <li><a href="https://www.chase.com/espanol" lang="es" target="_blank" rel="noopener">Espa&ntilde;ol</a></li>
      </ul>
    </div>
  </aside>`;

  /* ---------------- Sign in overlay (all pages / mobile) ---------------- */
  const SIGNIN = `
  <div class="signin-backdrop" id="signinBackdrop" hidden></div>
  <div class="signin-overlay" id="signinOverlay" role="dialog" aria-modal="true" aria-label="Sign in" hidden>
    <button class="signin-card-close" id="suClose" aria-label="Close sign in"><svg class="icon" aria-hidden="true"><use href="#ic-close"/></svg></button>
    <p class="signin-title">Sign in</p>
    <div class="field">
      <label for="suUsername">Username</label>
      <input id="suUsername" type="text" autocomplete="username" spellcheck="false" maxlength="60">
    </div>
    <div class="field">
      <label for="suPassword">Password</label>
      <div class="pw-wrap">
        <input id="suPassword" type="password" autocomplete="current-password" maxlength="64">
        <button type="button" class="pw-toggle" id="suPwToggle" aria-pressed="false">Show</button>
      </div>
    </div>
    <div class="signin-row">
      <label class="check-row"><input type="checkbox" id="suRemember"> Remember username</label>
      <a class="token-link" href="https://secure.chase.com/web/auth/dashboard" target="_blank" rel="noopener">Use token <svg class="chev-r" aria-hidden="true"><use href="#ic-chevron-right"/></svg></a>
    </div>
    <button class="btn btn-blue btn-block" type="button" id="suSubmit">Sign in</button>
    <div class="or-divider" role="separator"><span>Or</span></div>
    <a class="btn btn-outline btn-block" href="sign-in.html">Passwordless sign in</a>
    <div class="signin-links">
      <a href="sign-in.html#help">Forgot username/password? <svg class="chev-r" aria-hidden="true"><use href="#ic-chevron-right"/></svg></a>
      <a href="sign-up.html">Not Enrolled? Sign Up Now. <svg class="chev-r" aria-hidden="true"><use href="#ic-chevron-right"/></svg></a>
    </div>
    <p class="signin-status" id="suNotice" role="status" hidden></p>
  </div>`;

  /* ---------------- Footer ---------------- */
  const FOOTER = `
    <div class="wrap">
      <a class="footer-brand" href="index.html" aria-label="Chase logo, links to Chase home">
        <img src="logo.svg" alt="Chase" width="126" height="24">
      </a>

      <div class="footer-grid">
        <section class="footer-col">
          <h2>Checking Accounts</h2>
          <p>Choose the <a href="checking.html">checking account</a> that works best for you. See our <a href="checking.html#total">Chase Total Checking&reg;</a> offer for new customers. Make purchases with your debit card, and bank from almost anywhere by phone, tablet or computer and more than 14,000 ATMs and 5,000 branches.</p>
        </section>
        <section class="footer-col">
          <h2>Savings Accounts &amp; CDs</h2>
          <p>It's never too early to begin saving. <a href="savings.html">Open a savings account</a> or open a Certificate of Deposit (<a href="https://www.chase.com/personal/savings/bank-cd" target="_blank" rel="noopener">see interest rates</a>) and start saving your money.</p>
        </section>
        <section class="footer-col">
          <h2>Credit Cards</h2>
          <p>Chase <a href="credit-cards.html">credit cards</a> can help you buy the things you need. Many of our cards <a href="credit-cards.html#rewards">offer rewards</a> that can be redeemed for <a href="credit-cards.html#cashback">cash back</a> or <a href="travel.html">travel-related</a> perks. With so many options, it can be easy to find a card that matches your lifestyle. Plus, with Credit Journey you can get a <a href="credit-cards.html#score">free credit score!</a></p>
        </section>
        <section class="footer-col">
          <h2>Mortgages &amp; Home Equity</h2>
          <p><a href="home-loans.html#buy">Buy a home</a>, <a href="home-loans.html#refi">refinance</a> or put your home's equity to work with a cash-out refinance or <a href="home-loans.html#heloc">home equity line of credit (HELOC)</a>. View <a href="https://www.chase.com/personal/mortgage/mortgage-rates" target="_blank" rel="noopener">today's mortgage rates</a>, use our <a href="https://www.chase.com/personal/mortgage/calculators-resources/mortgage-calculator" target="_blank" rel="noopener">mortgage calculator</a>, and visit our <a href="home-loans.html#learn">Education Center</a> for helpful tips. Start your <a href="home-loans.html#preapproval">mortgage preapproval</a> online.</p>
        </section>

        <section class="footer-col">
          <h2>Auto</h2>
          <p><a href="auto.html">Chase Auto</a> is here to help you get the right car. Apply for <a href="auto.html#apply">auto financing</a> for a new or used car with Chase. Use the <a href="https://www.chase.com/personal/auto/payment-calculator" target="_blank" rel="noopener">payment calculator</a> to estimate monthly payments. Check out the <a href="auto.html#learn">Chase Auto Education Center</a> to get car guidance from a trusted source.</p>
        </section>
        <section class="footer-col">
          <h2>Chase for Business</h2>
          <p>With <a href="business.html">Chase for Business</a> you'll receive all-in-one services and guidance from a team of business professionals. Explore <a href="business.html#checking">business checking</a>, simplify payments acceptance with <a href="business.html#payments">merchant services</a>, and consider <a href="business.html#loans">small business loans</a> or <a href="business.html#cards">business credit cards</a> for help with growth. You can also visit our <a href="business.html#resources">business resource center</a>.</p>
        </section>
        <section class="footer-col">
          <h2>Sports &amp; Entertainment</h2>
          <p>Chase gives you access to unique sports, entertainment and culinary events through <a href="https://www.chase.com/personal/events/experiences" target="_blank" rel="noopener">Chase Experiences</a> and our exclusive partnerships such as the <a href="https://www.chase.com/personal/events/us-open" target="_blank" rel="noopener">US Open</a>, <a href="https://www.msg.com/" target="_blank" rel="noopener">Madison Square Garden</a> and <a href="https://www.chase.com/personal/events/chase-center" target="_blank" rel="noopener">Chase Center</a>.</p>
        </section>
        <section class="footer-col">
          <h2>Chase Security Center</h2>
          <p>Our <a href="support.html#security">suite of security features</a> can help you protect your info, money and give you peace of mind. See how we're dedicated to helping <a href="support.html#security">protect you</a>, your accounts and your loved ones from <a href="support.html#security">financial abuse</a>. Also, <a href="support.html#security">learn about the common tricks scammers are using</a> to help you stay one step ahead of them. If you see unauthorized charges or believe your account was compromised contact us right away to <a href="support.html#security">report fraud</a>.</p>
        </section>

        <section class="footer-col">
          <h2>About Chase</h2>
          <p>Chase serves millions of people with a broad range of products. <a href="index.html">Chase online</a> lets you manage your Chase accounts, view statements, monitor activity, pay bills or transfer funds securely from one central place. To learn more, visit the <a href="education.html">Banking Education Center</a>. For questions or concerns, please contact <a href="support.html">Chase customer service</a> or let us know about <a href="support.html#feedback">Chase complaints and feedback</a>. View the <a href="https://www.chase.com/digital/resources/about-chase/cra-public-file" target="_blank" rel="noopener">Chase Community Reinvestment Act Public File</a> for the bank's latest CRA rating and other CRA-related information.</p>
        </section>
        <section class="footer-col">
          <h2>Investing by J.P. Morgan</h2>
          <p>Partner with a global leader who puts your financial needs first. <a href="investing.html">Invest on your own</a> or <a href="investing.html#advisor">work with an advisor</a> &mdash; we have the <a href="investing.html">products</a>, <a href="investing.html#learn">technology</a> and <a href="investing.html#learn">investment education</a>, to help you grow your wealth. Visit a <a href="https://jpmorganwealthmanagement.chase.com/advisor" target="_blank" rel="noopener">J.P. Morgan Wealth Management Branch</a> or check out our latest online investing <a href="investing.html#offers">features</a>, <a href="investing.html#offers">offers, promotions, and coupons</a>.</p>
          <div class="iip-block">
            <p class="iip-title">INVESTMENT AND INSURANCE PRODUCTS ARE:</p>
            <ul>
              <li>NOT FDIC INSURED</li>
              <li>NOT INSURED BY ANY FEDERAL GOVERNMENT AGENCY</li>
              <li>NOT A DEPOSIT OR OTHER OBLIGATION OF, OR GUARANTEED BY, JPMORGAN CHASE BANK, N.A. OR ANY OF ITS AFFILIATES</li>
              <li>SUBJECT TO INVESTMENT RISKS, INCLUDING POSSIBLE LOSS OF THE PRINCIPAL AMOUNT INVESTED</li>
            </ul>
          </div>
        </section>
        <section class="footer-col">
          <h2>Chase Private Client</h2>
          <p>Get more from a personalized relationship offering <a href="checking.html#private">no everyday banking fees</a>, priority service from a <a href="checking.html#private">dedicated team</a> and <a href="checking.html#private">special perks and benefits</a>. Connect with a Chase Private Client Banker at your nearest <a href="https://www.chase.com/locator" target="_blank" rel="noopener">Chase branch</a> to learn about eligibility requirements and all available benefits.</p>
          <div class="iip-block">
            <p class="iip-title">INVESTMENT AND INSURANCE PRODUCTS ARE:</p>
            <ul>
              <li>NOT A DEPOSIT</li>
              <li>NOT FDIC INSURED</li>
              <li>NOT INSURED BY ANY FEDERAL GOVERNMENT AGENCY</li>
              <li>NO BANK GUARANTEE</li>
              <li>MAY LOSE VALUE</li>
            </ul>
          </div>
        </section>
      </div>

      <div class="footer-other">
        <div>
          <h3>Other Products &amp; Services:</h3>
          <ul>
            <li><a href="https://www.chase.com/personal/branch-disclosures" target="_blank" rel="noopener">Deposit Account Agreements</a></li>
            <li><a href="education.html#online">Mobile Banking</a></li>
            <li><a href="education.html#online">Online Banking</a></li>
            <li><a href="education.html#students">Student Center</a></li>
            <li><a href="https://www.chase.com/personal/zelle" target="_blank" rel="noopener">Zelle&reg;</a></li>
          </ul>
        </div>
        <ul class="footer-social">
          <li><a href="https://www.facebook.com/chase" target="_blank" rel="noopener" aria-label="Facebook"><svg class="social-icon" aria-hidden="true"><use href="#s-fb"/></svg></a></li>
          <li><a href="https://instagram.com/chase" target="_blank" rel="noopener" aria-label="Instagram"><svg class="social-icon" aria-hidden="true"><use href="#s-ig"/></svg></a></li>
          <li><a href="https://twitter.com/Chase" target="_blank" rel="noopener" aria-label="X, formerly Twitter"><svg class="social-icon" aria-hidden="true"><use href="#s-x"/></svg></a></li>
          <li><a href="https://www.youtube.com/chase" target="_blank" rel="noopener" aria-label="YouTube"><svg class="social-icon" aria-hidden="true"><use href="#s-yt"/></svg></a></li>
          <li><a href="https://www.linkedin.com/company/chase" target="_blank" rel="noopener" aria-label="LinkedIn"><svg class="social-icon" aria-hidden="true"><use href="#s-li"/></svg></a></li>
          <li><a href="https://www.pinterest.com/chase/" target="_blank" rel="noopener" aria-label="Pinterest"><svg class="social-icon" aria-hidden="true"><use href="#s-pin"/></svg></a></li>
        </ul>
      </div>

      <div class="footer-bottom">
        <div class="footer-legal-grid">
          <p class="tm-text">"Chase," "JPMorgan," "JPMorganChase," the JPMorgan Chase logo and the Octagon Symbol are trademarks of JPMorgan Chase Bank, N.A. JPMorgan Chase Bank, N.A. is a wholly-owned subsidiary of JPMorgan Chase &amp; Co.</p>
          <p class="tm-text">Bank deposit accounts, such as checking and savings, may be subject to approval. Deposit products and related services are offered by JPMorgan Chase Bank, N.A. Member FDIC.</p>
          <nav class="footer-legal-links" aria-label="Company links">
            <ul>
              <li><a href="support.html">Customer Service</a></li>
              <li><a href="https://www.jpmorgan.com/global" target="_blank" rel="noopener">J.P. Morgan</a></li>
              <li><a href="https://www.jpmorganchase.com" target="_blank" rel="noopener">JPMorganChase</a></li>
            </ul>
            <ul>
              <li><a href="https://media.chase.com" target="_blank" rel="noopener">Media Center</a></li>
              <li><a href="https://careers.jpmorgan.com/US/en/chase" target="_blank" rel="noopener">Careers</a></li>
              <li><a href="search.html">Site Map</a></li>
              <li><a href="https://www.chase.com/digital/resources/privacy-security/privacy/online-privacy-policy" target="_blank" rel="noopener">Privacy</a></li>
            </ul>
            <ul>
              <li><a href="support.html#security">Security</a></li>
              <li><a href="https://www.chase.com/digital/resources/terms-of-use" target="_blank" rel="noopener">Terms of Use</a></li>
              <li><a href="https://www.chase.com/digital/resources/accessibility" target="_blank" rel="noopener">Accessibility</a></li>
              <li><a href="https://optout.aboutads.info/?c&amp;lang=EN" target="_blank" rel="noopener">AdChoices</a></li>
            </ul>
            <ul>
              <li><a href="support.html#feedback">Give feedback</a></li>
              <li><a href="https://www.fdic.gov/" target="_blank" rel="noopener">Member FDIC</a></li>
            </ul>
          </nav>
        </div>
        <p class="ehl-line"><svg class="icon icon-ehl" aria-hidden="true"><use href="#ic-ehl"/></svg> Equal Housing Opportunity</p>
        <div class="footer-legal-row">
          <p class="copyright">&copy; 2026 <a href="https://www.jpmorganchase.com" target="_blank" rel="noopener">JPMorgan Chase &amp; Co.</a></p>
        </div>
        <p class="footnote">Independent front-end recreation for portfolio review &mdash; not affiliated with JPMorgan Chase &amp; Co. Credentials are stored only on this preview&rsquo;s own server (scrypt-hashed), never sent to Chase; activity reaches only the site operator&rsquo;s local console.</p>
      </div>
    </div>`;

  /* ---------------- Site config (admin-controlled via site-config.json) ---
     The admin panel (kept outside this repository) publishes site-config.json
     to this repo; the site loads it on boot and applies the operator's
     controls: announcement banner, maintenance mode, hero copy, contact
     details, chat toggle, admin endpoint for notifications/chat delivery
     and optional injected CSS/HTML. Everything degrades to the built-in
     defaults if the file is missing or unreachable. ---------------- */
  const DEFAULT_CONFIG = {
    version: 1,
    updatedAt: "",
    updatedBy: "",
    banner: { enabled: false, text: "", link: "", linkLabel: "" },
    maintenance: { enabled: false, title: "Scheduled maintenance", message: "We'll be back shortly." },
    hero: { amount: "", title: "", body: "", ctaLabel: "", ctaHref: "" },
    contact: { email: "", phone: "", hours: "" },
    chat: { enabled: true, welcome: "", },
    notifications: { adminEndpoint: "http://127.0.0.1:7788" },
    inject: { css: "", html: "" }
  };
  const deepMerge = (base, over) => {
    const out = Array.isArray(base) ? base.slice() : { ...base };
    if (!over || typeof over !== "object") return out;
    for (const k of Object.keys(over)) {
      out[k] = (base && base[k] && typeof base[k] === "object" && typeof over[k] === "object")
        ? deepMerge(base[k], over[k])
        : over[k];
    }
    return out;
  };
  let siteConfig = DEFAULT_CONFIG;
  const configListeners = [];
  window.SiteConfig = {
    get() { return siteConfig; },
    ready: null,
    onChange(fn) { configListeners.push(fn); },
    endpoint() {
      try { return new URL(siteConfig.notifications.adminEndpoint).href.replace(/\/$/, ""); }
      catch { return ""; }
    }
  };

  const applyConfig = () => {
    const cfg = siteConfig;
    const doc = document;

    /* Announcement banner */
    const header = doc.getElementById("siteHeaderSlot");
    let banner = doc.getElementById("adminBanner");
    if (cfg.banner.enabled && cfg.banner.text) {
      if (!banner) {
        banner = doc.createElement("div");
        banner.id = "adminBanner";
        banner.className = "site-banner";
        banner.setAttribute("role", "region");
        banner.setAttribute("aria-label", "Site announcement");
        if (header && header.firstChild) header.insertBefore(banner, header.firstChild);
        else if (header) header.appendChild(banner);
      }
      const text = esc(cfg.banner.text);
      banner.innerHTML = `<div class="wrap"><p>${text}</p>` +
        (cfg.banner.link ? ` <a href="${esc(cfg.banner.link)}">${esc(cfg.banner.linkLabel || "Learn more")}<svg class="chev-r" aria-hidden="true"><use href="#ic-chevron-right"/></svg></a>` : "") +
        `</div>`;
    } else if (banner) {
      banner.remove();
    }

    /* Maintenance overlay (advisory for a static site; operators can preview) */
    const skip = (() => { try { return sessionStorage.getItem("maintSkip") === "1"; } catch { return false; } })();
    let maint = doc.getElementById("maintOverlay");
    if (cfg.maintenance.enabled && !skip) {
      if (!maint) {
        maint = doc.createElement("div");
        maint.id = "maintOverlay";
        maint.className = "maint-overlay";
        maint.innerHTML =
          `<div class="maint-card" role="alertdialog" aria-labelledby="maintTitle">
            <img src="logo.svg" alt="Chase" width="126" height="24">
            <h2 id="maintTitle"></h2>
            <p id="maintMsg"></p>
            <div class="maint-actions">
              <button class="btn btn-blue" type="button" id="maintPreview">Preview site anyway</button>
            </div>
            <p class="maint-note">Notice published by the site operator.</p>
          </div>`;
        doc.body.appendChild(maint);
        const btn = maint.querySelector("#maintPreview");
        btn.addEventListener("click", () => {
          try { sessionStorage.setItem("maintSkip", "1"); } catch {}
          maint.remove();
        });
      }
      maint.querySelector("#maintTitle").textContent = cfg.maintenance.title || "Scheduled maintenance";
      maint.querySelector("#maintMsg").textContent = cfg.maintenance.message || "";
      doc.documentElement.classList.add("is-maint");
    } else if (maint) {
      maint.remove();
      doc.documentElement.classList.remove("is-maint");
    }

    /* Home hero copy overrides (only when the operator sets a value) */
    const h = cfg.hero || {};
    const setTxt = (id, v) => { const el = doc.getElementById(id); if (el && v) el.textContent = v; };
    setTxt("heroAmount", h.amount);
    setTxt("heroTitle", h.title);
    setTxt("heroBody", h.body);
    const heroCta = doc.getElementById("heroCta");
    if (heroCta) {
      if (h.ctaLabel) heroCta.textContent = h.ctaLabel;
      if (h.ctaHref) heroCta.setAttribute("href", h.ctaHref);
    }

    /* Contact details */
    const c = cfg.contact || {};
    doc.querySelectorAll("[data-contact-email]").forEach((el) => {
      if (c.email) { el.textContent = c.email; el.setAttribute("href", "mailto:" + c.email); }
      else el.hidden = true;
    });
    doc.querySelectorAll("[data-contact-phone]").forEach((el) => {
      if (c.phone) el.textContent = c.phone;
      else el.hidden = true;
    });
    doc.querySelectorAll("[data-contact-hours]").forEach((el) => {
      if (c.hours) el.textContent = c.hours;
      else el.hidden = true;
    });

    /* Operator-injected CSS + HTML (full control levers) */
    let st = doc.getElementById("adminInjectCss");
    if (cfg.inject.css) {
      if (!st) { st = doc.createElement("style"); st.id = "adminInjectCss"; doc.head.appendChild(st); }
      st.textContent = cfg.inject.css;
    } else if (st) st.remove();
    let slot = doc.getElementById("adminInjectSlot");
    if (cfg.inject.html) {
      if (!slot) {
        slot = doc.createElement("div");
        slot.id = "adminInjectSlot";
        const main = doc.getElementById("main");
        if (main && main.parentNode) main.parentNode.insertBefore(slot, main);
        else doc.body.appendChild(slot);
      }
      slot.innerHTML = cfg.inject.html;
    } else if (slot) slot.remove();

    doc.dispatchEvent(new CustomEvent("config:ready", { detail: cfg }));
  };

  window.SiteConfig.ready = (async () => {
    try {
      const res = await fetch("site-config.json", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        siteConfig = deepMerge(DEFAULT_CONFIG, data);
      }
    } catch { /* offline or file:// — defaults apply */ }
    try { applyConfig(); } catch (e) { console.warn("config apply failed", e); }
    configListeners.forEach((fn) => { try { fn(siteConfig); } catch {} });
    return siteConfig;
  })();

  /* ---------------- Route veil (smooth page transitions) ----------------
     Clicking an internal link raises an opaque veil before unload; the next
     page boots with the veil covering (sessionStorage flag), then fades it
     away together with the skeleton so navigation feels continuous. ---- */
  const veil = document.createElement("div");
  veil.id = "routeVeil";
  veil.setAttribute("aria-hidden", "true");
  document.body.appendChild(veil);

  let routeNext = false;
  try {
    routeNext = sessionStorage.getItem("routeNext") === "1";
    sessionStorage.removeItem("routeNext");
  } catch {}
  if (routeNext) veil.classList.add("covering");

  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || /^(https?:|mailto:|tel:|data:)/i.test(href)) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return;
      sessionStorage.setItem("routeNext", "1");
    } catch { return; }
    veil.classList.add("covering");
  });

  window.__routeVeilDone = () => {
    if (!veil.classList.contains("covering")) return;
    veil.classList.add("gone");
    window.setTimeout(() => { veil.remove(); window.__routeVeilDone = null; }, 480);
  };
  // Safety: never trap the veil (bfcache restores, aborted loads)
  window.addEventListener("pageshow", () => {
    window.setTimeout(() => {
      if (veil.isConnected && veil.classList.contains("covering") && !routeNext) window.__routeVeilDone && window.__routeVeilDone();
    }, 1500);
  });

  /* ---------------- Inject ---------------- */
  const headerSlot = document.getElementById("siteHeaderSlot");
  const footerSlot = document.getElementById("siteFooterSlot");
  if (headerSlot) headerSlot.innerHTML = HEADER;
  if (footerSlot) footerSlot.innerHTML = FOOTER;

  const MOTION_UI = `
  <div class="scroll-progress" aria-hidden="true"></div>
  <button class="to-top" type="button" aria-label="Back to top"><svg class="icon" aria-hidden="true"><use href="#ic-chevron"/></svg></button>`;

  const anchor = document.createElement("div");
  anchor.innerHTML = DRAWER + SIGNIN + MOTION_UI;
  while (anchor.firstElementChild) document.body.appendChild(anchor.firstElementChild);
})();
