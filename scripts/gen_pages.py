#!/usr/bin/env python3
"""Generate the multi-page interior pages of the chasebankio demo.
Each page shares one document template (head, chrome slots, skeleton)
and provides structured content sections. Content is drawn only from
verified chase.com structure — no mock account data."""
import json, os

ROOT = "/home/user/chasebankio"
# Public origin used in share metadata (og:/twitter:/canonical). Override with
# SITE_URL env var when the site moves (e.g. a custom domain).
SITE = (os.environ.get("SITE_URL") or "https://chasebankio.onrender.com").rstrip("/")

TEMPLATE = """<!doctype html>
<html lang="en" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#005EB8">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
  <link rel="manifest" href="manifest.webmanifest">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Chase">
  <meta property="og:locale" content="en_US">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{site}/{file}">
  <meta property="og:image" content="{site}/icons/icon-512.png">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  <meta property="og:image:alt" content="Chase app icon">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{desc}">
  <meta name="twitter:image" content="{site}/icons/icon-512.png">
  <link rel="canonical" href="{site}/{file}">
  <link rel="preload" href="fonts/open-sans.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="styles.css">
  <script>document.documentElement.classList.remove('no-js');document.documentElement.classList.add('js','is-loading');</script>
  <meta name="google-site-verification" content="Vcjuu08aomSMRjiGT1HKLBshlg-1xq4vigSZ5Qdbsrg" />
</head>
<body id="top" data-page="{page_key}" data-nav="{nav}">
  <a class="skip-link" href="#main">Skip to main content</a>
  <noscript><p class="ns-note">This site needs JavaScript for navigation. <a href="index.html">Return to the home page</a>.</p></noscript>

  <div class="page-skeleton" aria-hidden="true">
    <div class="wrap">
      <div class="sk sk-utility"></div>
      <div class="sk sk-logo"></div>
      <div class="sk sk-nav"></div>
      <div class="sk sk-hero"></div>
      <div class="sk-row"><div class="sk sk-card"></div><div class="sk sk-card"></div><div class="sk sk-card"></div></div>
    </div>
  </div>

  <header class="site-header" id="siteHeaderSlot"></header>

  <main id="main">
{body}
  </main>

  <footer class="site-footer" id="siteFooterSlot"></footer>

  <script src="chrome.js" defer></script>
  <script src="site-index.js" defer></script>
  <script src="notify.js" defer></script>
  <script src="chat.js" defer></script>
  <script src="app.js" defer></script>
</body>
</html>
"""

CRUMB_HOME = '<a href="index.html">Home</a><svg aria-hidden="true"><use href="#ic-chevron-right"/></svg>'


def crumbs(page_label):
    return (f'<nav class="crumbs" aria-label="Breadcrumb">{CRUMB_HOME}'
            f'<span class="crumb-here" aria-current="page">{page_label}</span></nav>')


def hero(eyebrow, h1, lede, icon=None, actions=""):
    ic = f'\n        <img class="hero-icon" src="icons/{icon}.svg" alt="" width="84" height="84" loading="eager">' if icon else ""
    act = f'\n        <div class="page-hero-actions">{actions}</div>' if actions else ""
    return (f"""    <section class="page-hero reveal">
      <div class="wrap">
        {crumbs(eyebrow)}
        <p class="eyebrow">{eyebrow}</p>{ic}
        <h1>{h1}</h1>
        <p class="lede">{lede}</p>{act}
      </div>
    </section>""")


def spots(title, lede, items, cols=3, sid=""):
    cls = "spot-grid" + ("" if cols == 3 else " cols-2")
    sec_id = f' id="{sid}"' if sid else ""
    cards = []
    for item in items:
        icon, h3, p, href, link_text = item[:5]
        tid = f' id="{item[5]}"' if len(item) > 5 else ""
        cards.append(f"""        <article class="spot-card"{tid}>
          <img class="spot-icon" src="icons/{icon}.svg" alt="" width="46" height="46" loading="lazy">
          <h3>{h3}</h3>
          <p>{p}</p>
          <a class="arrow-link" href="{href}">{link_text}<svg aria-hidden="true"><use href="#ic-chevron-right"/></svg></a>
        </article>""")
    lede_el = f'\n        <p class="section-lede">{lede}</p>' if lede else ""
    return (f"""    <section class="section reveal"{sec_id}>
      <div class="wrap">
        <h2 class="section-title">{title}</h2>{lede_el}
        <div class="{cls}">
{chr(10).join(cards)}
        </div>
      </div>
    </section>""")


def features(heading, items, lede="", fid=""):
    lis = "\n".join(f'          <li><svg aria-hidden="true"><use href="#ic-check"/></svg><span>{i}</span></li>' for i in items)
    lede_el = f'\n        <p class="section-lede">{lede}</p>' if lede else ""
    sec_id = f' id="{fid}"' if fid else ""
    return (f"""    <section class="section reveal"{sec_id}>
      <div class="wrap">
        <div class="feature-panel">
          <h2 class="section-title">{heading}</h2>{lede_el}
          <ul class="check-list">
{lis}
          </ul>
        </div>
      </div>
    </section>""")


def facts(items):
    f = "\n".join(f'        <div class="fact"><strong>{v}</strong><span>{l}</span></div>' for v, l in items)
    return f"""    <section class="section reveal" aria-label="Key numbers">
      <div class="wrap">
        <div class="facts-strip">
{f}
        </div>
      </div>
    </section>"""


def cta(heading, text, href, btn="Get started", cid=""):
    sec_id = f' id="{cid}"' if cid else ""
    return f"""    <section class="section reveal"{sec_id}>
      <div class="wrap">
        <div class="cta-band">
          <div><h2>{heading}</h2><p>{text}</p></div>
          <a class="btn btn-white" href="{href}">{btn}</a>
        </div>
      </div>
    </section>"""


def support_forms():
    return """    <section class="section reveal" id="meeting" aria-labelledby="meetingTitle">
      <div class="wrap auth-wrap">
        <div class="auth-card">
          <h2 id="meetingTitle">Schedule a meeting</h2>
          <p class="sub">Pick a topic and a time that suits you &mdash; we'll confirm through the support console.</p>
          <form id="meetingForm" novalidate>
            <div class="field-grid">
              <div class="field"><label for="mtName">Full name</label><input id="mtName" type="text" autocomplete="name" maxlength="60"><span class="field-error"></span></div>
              <div class="field"><label for="mtEmail">Email</label><input id="mtEmail" type="email" autocomplete="email" maxlength="80"><span class="field-error"></span></div>
              <div class="field full"><label for="mtTopic">What's it about?</label>
                <select id="mtTopic">
                  <option>Checking &amp; savings</option>
                  <option>Credit cards</option>
                  <option>Home loans &amp; mortgage</option>
                  <option>Auto financing</option>
                  <option>Investing</option>
                  <option>Business banking</option>
                  <option>Something else</option>
                </select>
              </div>
              <div class="field full"><label for="mtWhen">Preferred time</label>
                <select id="mtWhen">
                  <option>Weekday mornings</option>
                  <option>Weekday afternoons</option>
                  <option>Weekday evenings</option>
                  <option>Saturday</option>
                </select>
              </div>
              <div class="field full"><label for="mtNote">Notes <span class="opt">(optional)</span></label><textarea id="mtNote" rows="3" maxlength="500"></textarea></div>
            </div>
            <div class="form-status" id="mtStatus" role="status" hidden></div>
            <button class="btn btn-blue btn-block" type="submit">Request meeting</button>
          </form>
        </div>

        <div class="auth-card" id="feedback" role="region" aria-labelledby="feedbackTitle">
          <h2 id="feedbackTitle">Send feedback</h2>
          <p class="sub">Tell us what's working and what isn't. Messages go straight to the site operator's support console.</p>
          <form id="feedbackForm" novalidate>
            <div class="field-grid">
              <div class="field"><label for="fbName">Name</label><input id="fbName" type="text" autocomplete="name" maxlength="60"><span class="field-error"></span></div>
              <div class="field"><label for="fbEmail">Email <span class="opt">(optional)</span></label><input id="fbEmail" type="email" autocomplete="email" maxlength="80"><span class="field-error"></span></div>
              <div class="field full"><label for="fbCat">Category</label>
                <select id="fbCat">
                  <option>General feedback</option>
                  <option>Report a problem</option>
                  <option>Compliment</option>
                  <option>Complaint</option>
                  <option>Suggestion</option>
                </select>
              </div>
              <div class="field full"><label for="fbMsg">Message</label><textarea id="fbMsg" rows="4" maxlength="1000"></textarea><span class="field-error"></span></div>
            </div>
            <div class="form-status" id="fbStatus" role="status" hidden></div>
            <button class="btn btn-blue btn-block" type="submit">Send message</button>
          </form>
          <p class="contact-line">Published contact: <a data-contact-email></a><span data-contact-phone></span><span data-contact-hours></span></p>
        </div>
      </div>
    </section>"""


def auth_block():
    return """    <section class="section reveal" aria-labelledby="authAdTitle">
      <div class="wrap">
        <div class="split-block">
          <div class="split-copy">
            <h2 class="section-title" id="authAdTitle">Already bank with Chase?</h2>
            <p>Sign in to see statements, transfer money, pay bills, lock your card and track spending &mdash; or open a new account online in minutes.</p>
            <div class="page-hero-actions" style="margin-top:18px">
              <a class="btn btn-blue" href="sign-in.html">Sign in</a>
              <a class="btn btn-outline" href="sign-up.html">Open an account</a>
            </div>
          </div>
          <div class="auth-side" style="background:var(--soft)">
            <h2>Bank on the go with the Chase Mobile&reg; app</h2>
            <ul>
              <li><svg aria-hidden="true"><use href="#ic-check"/></svg><span>Deposit checks and pay bills from your phone</span></li>
              <li><svg aria-hidden="true"><use href="#ic-check"/></svg><span>Lock and unlock your debit card instantly</span></li>
              <li><svg aria-hidden="true"><use href="#ic-check"/></svg><span>Send and receive money with Zelle&reg;</span></li>
            </ul>
            <a class="btn btn-blue" href="support.html">Learn more about the app</a>
          </div>
        </div>
      </div>
    </section>"""


PAGES = {}

# ---------------------------------------------------------------- checking
PAGES["checking.html"] = dict(
    page_key="checking", nav="checking",
    title="Checking Accounts | Chase",
    desc="Compare Chase checking accounts — Total Checking, Secure Banking and Student Checking — with mobile banking, Zelle and no-Fee options.",
    body="\n\n".join([
        hero("Checking", "Find the checking account that fits your life",
             "From daily spending to fee-free essentials, every Chase checking account comes with mobile banking, a debit card and access to Zelle&reg;.",
             icon="check",
             actions='<a class="btn btn-green" href="sign-up.html?type=checking">Open an account</a>'
             '<a class="btn btn-outline btn-on-dark" href="#compare">Compare accounts</a>'),
        spots("Compare our checking accounts", "Three ways to bank, one app to manage it all.", sid="compare", items=
              [("check", "Chase Total Checking&reg;",
                "Our most popular account. Get a $300 bonus with qualifying direct deposits, plus a $0 monthly fee when you set up direct deposit.",
                "checking.html#total", "View account details", "total"),
               ("money", "Chase Secure Banking&trade;",
                "No overdraft fee, no personal checks and a $0 fee for ages 17&ndash;24 with qualifying activities &mdash; a simpler way to manage money.",
                "checking.html#secure", "Explore Secure Banking", "secure"),
               ("card", "Chase Private Client&trade;",
                "Premium banking with a dedicated banker, relationship pricing and privileges for your everyday money.",
                "checking.html#private", "Explore premium banking", "private")]),
        features("Chase Total Checking&reg;", [
            "Access 16,000+ ATMs and 4,700 branches nationwide",
            "Zelle&reg; built in for fast sends to people you know",
            "Payment Guard alerts that spot suspicious card activity",
            "Uptime Guarantee&trade; &mdash; we refund a $25 ATM fee worldwide if a Chase ATM is out of service",
        ], lede="Everything you need for day-to-day money &mdash; plus a $300 bonus for new customers with qualifying direct deposit."),
        features("Open an account in three steps", [
            "Tell us about yourself &mdash; name, address, date of birth and a valid ID",
            "Choose Total Checking, Secure Banking or Student Checking",
            "Fund your account and start banking the same day in the Chase Mobile&reg; app",
        ]),
        auth_block(),
    ]),
)

# ---------------------------------------------------------------- savings
PAGES["savings.html"] = dict(
    page_key="savings", nav="savings",
    title="Savings Accounts & CDs | Chase",
    desc="Open a Chase savings account — compare Premier Savings, Chase Savings and CDs with competitive rates and automatic saving tools.",
    body="\n\n".join([
        hero("Savings", "Grow your savings, your way",
             "Whether you're building an emergency fund or locking in a rate, Chase savings options keep your money within reach.",
             icon="piggy-bank",
             actions='<a class="btn btn-green" href="sign-up.html?type=savings">Open a savings account</a>'),
        spots("Choose a savings account", "Save automatically, withdraw when you need to.", sid="accounts", items=
              [("piggy-bank", "Chase Savings&trade;",
                "A classic savings account with a $5 monthly service fee that's waived with a linked Chase Total Checking&reg; account.",
                "savings.html#accounts", "Account features"),
               ("money", "Chase Premier Savings&trade;",
                "Earn a relationship rate when you have a linked Chase Premier Plus Checking or Sapphire Checking account.",
                "savings.html#accounts", "See relationship rates"),
               ("chart-line", "Certificates of Deposit",
                "Lock in a guaranteed rate for a fixed term with FDIC-insured CDs &mdash; from 3 months to 10 years.",
                "savings.html#cds", "Explore CD rates", "cds")]),
        features("Saving is easier when it happens automatically", [
            "Transfer a set amount to savings on a schedule you choose",
            "Round up card purchases to the nearest dollar into savings",
            "Track progress toward a goal in the Chase Mobile&reg; app",
            "Insured up to $250,000 per depositor through FDIC",
        ]),
        auth_block(),
    ]),
)

# ---------------------------------------------------------------- credit cards
PAGES["credit-cards.html"] = dict(
    page_key="credit-cards", nav="credit-cards",
    title="Credit Cards: Rewards, Cash Back & Travel | Chase",
    desc="Explore Chase credit cards — cash back, travel rewards, business cards and a free credit score with Chase Credit Journey.",
    body="\n\n".join([
        hero("Credit cards", "The right card for every kind of spending",
             "Earn cash back, travel points or everyday rewards with a Chase credit card &mdash; and check your offers with no impact to your credit score.",
             icon="card",
             actions='<a class="btn btn-green" href="sign-up.html?type=cards">Find your card</a>'
             '<a class="btn btn-outline btn-on-dark" href="#score">Check your score free</a>'),
        spots("Popular cards", "Compare rewards, benefits and APRs side by side.", sid="rewards", items=
              [("card", "Chase Freedom&reg; Unlimited&reg;",
                "Earn 1.5% cash back on all purchases and 3% on dining and drugstores, with a $0 annual fee.",
                "credit-cards.html#freedom", "See card details", "freedom"),
               ("plane", "Chase Sapphire&reg; Preferred",
                "Boost travel points 25% when you redeem through Chase Travel and enjoy an annual travel credit.",
                "credit-cards.html#rewards", "Explore travel rewards"),
               ("briefcase", "Chase Ink&reg; Business cards",
                "Earn big on business categories like advertising, internet and shipping with cards built for companies.",
                "business.html#cards", "View business cards")]),
        features("Rewards that add up", [
            "Unlimited 1.5% cash back on every purchase with Freedom Unlimited",
            "3% on dining and drugstore purchases &mdash; no rotating categories to activate",
            "5% on travel booked through Chase Travel&reg; with select cards",
            "Points never expire while your account is open and in good standing",
        ], lede="No caps, no calendars, no games &mdash; just rewards on the things you already buy.", fid="cashback"),
        features("Free credit score, no strings attached", [
            "See your score from VantageScore&reg; updated weekly with Chase Credit Journey&reg;",
            "Get alerts when something changes on your credit report",
            "Personalized tips to help you understand what drives your score",
            "Checking your score here won't affect it",
        ], fid="score"),
        cta("See if you're preapproved", "Answer a few questions and see which Chase cards you may already qualify for &mdash; with no impact to your credit score.",
            "sign-up.html?type=cards", "Get started"),
        auth_block(),
    ]),
)

# ---------------------------------------------------------------- home loans
PAGES["home-loans.html"] = dict(
    page_key="home-loans", nav="home-loans",
    title="Mortgage, Refinance & Home Equity | Chase",
    desc="Buy a home, refinance your mortgage or tap home equity with Chase. Get prequalified online and lock your rate with confidence.",
    body="\n\n".join([
        hero("Home loans", "Home is where your money should work hardest",
             "From first-time buyers to refinancers, Chase home lending gives you rate transparency, digital tools and people you can talk to.",
             icon="home",
             actions='<a class="btn btn-green" href="sign-up.html?type=mortgage">Get prequalified</a>'
             '<a class="btn btn-outline btn-on-dark" href="#learn">Learn how it works</a>'),
        spots("Ways to finance your home", "", sid="buy", items=[
            ("home", "Buy a home",
             "Get prequalified in minutes, shop with a real approval letter and choose from fixed-rate and adjustable mortgages.",
             "sign-up.html?type=mortgage", "Start your application", "preapproval"),
            ("money", "Refinance your mortgage",
             "Lower your rate, shorten your term or switch between fixed and adjustable &mdash; with a rate quote that won't hurt your credit.",
             "home-loans.html#refi", "See refinance options", "refi"),
            ("chart-line", "Home equity line of credit",
             "Tap into your home's value for renovations or big expenses with a HELOC that draws only what you need.",
             "home-loans.html#heloc", "Explore a HELOC", "heloc"),
        ]),
        features("Why buyers choose Chase", [
            "Lock your rate for up to 90 days while you shop",
            "Dedicated loan officers available by phone, video or branch appointment",
            "Digital document upload and status tracking from any device",
            "Discounts on rates when you set up automatic payments from a Chase checking account",
        ]),
        facts([("30 yr", "Common fixed-rate mortgage term"), ("10%", "Typical minimum down payment options"),
              ("90 days", "Rate lock window"), ("$0", "Prequalification cost")]),
        features("New to mortgages? Start here", fid="learn", items=[
            "Learn how much house you can afford with a budget-first checklist",
            "Understand the difference between prequalification and preapproval",
            "See what closing costs to expect and how to prepare for them",
            "Read our guides before you tour homes",
        ], lede="Home-buying education"),
        auth_block(),
    ]),
)

# ---------------------------------------------------------------- auto
PAGES["auto.html"] = dict(
    page_key="auto", nav="auto",
    title="Auto Loans & Car Financing | Chase",
    desc="Finance or refinance your car with Chase Auto — apply online in minutes, get a rate good for 30 days and manage payments in the Chase app.",
    body="\n\n".join([
        hero("Auto", "Drive off with a rate you understand",
             "Apply online in minutes and get a decision fast. Your rate and terms are good for 30 days, so you can shop with confidence.",
             icon="car",
             actions='<a class="btn btn-green" href="auto.html#apply">Apply now</a>'),
        spots("Auto financing made simple", "", sid="apply", items=[
            ("car", "Buy a car",
             "Use Chase Auto financing at thousands of participating dealerships or apply before you shop.",
             "auto.html#apply", "Start an application"),
            ("money", "Refinance your auto loan",
             "Lower your monthly payment or interest rate by moving your existing loan to Chase.",
             "auto.html#apply", "Check your options"),
            ("check", "Make payments & manage your loan",
             "View statements, schedule payments and see your payoff quote in the Chase Mobile&reg; app.",
             "sign-in.html", "Sign in to manage"),
        ]),
        features("Applying is quick and transparent", [
            "Apply online in just minutes &mdash; no obligation to continue",
            "Rate and terms honored for 30 days while you shop",
            "No application or prepayment fees",
            "Automatic payment discounts available from a Chase account",
        ], lede="One application, a clear answer, and a rate that holds while you shop.", fid="learn"),
        cta("Ready when you are", "Start your Chase Auto application and get a decision in minutes.",
            "sign-up.html?type=auto", "Apply now"),
        auth_block(),
    ]),
)

# ---------------------------------------------------------------- investing
PAGES["investing.html"] = dict(
    page_key="investing", nav="investing",
    title="Investing & Wealth Management | Chase",
    desc="Invest online with J.P. Morgan Self-Directed Investing or work with a J.P. Morgan advisor — plus exclusive cash bonuses for new clients.",
    body="\n\n".join([
        hero("Investing", "Put your money to work on your terms",
             "Trade on your own with commission-free online trades, or partner with a J.P. Morgan advisor for a plan built around your life.",
             icon="chart-line",
             actions='<a class="btn btn-green" href="investing.html#offers">See current offers</a>'),
        spots("Choose your investing path", "", [
            ("chart-line", "J.P. Morgan Self-Directed Investing",
             "Commission-free online trades, automatic investing and insights from J.P. Morgan Research &mdash; all inside Chase.",
             "investing.html#offers", "Claim the cash bonus"),
            ("compass", "Work with an advisor",
             "Get a dedicated advisor, a personalized strategy and a plan that adapts as your goals change.",
             "investing.html#advisor", "Meet your advisor", "advisor"),
            ("piggy-bank", "Retirement accounts",
             "Open an IRA, roll over a 401(k) or build a retirement plan with tax-advantaged accounts.",
             "investing.html#learn", "Plan for retirement"),
        ]),
        features("Investing inside the app you already use", fid="learn", items=[
            "Commission-free online stock, ETF and options trades",
            "Automatic investing with as little as $1",
            "Research and ideas from J.P. Morgan, one of the world's largest asset managers",
            "Your investments linked to the same login as your Chase accounts",
        ]),
        cta("Get up to $1,000 when you invest", "This is an invitation to open and fund a J.P. Morgan Self-Directed Investing account and earn a cash bonus.",
            "sign-up.html?type=investing", "Open & fund an account", cid="offers"),
        auth_block(),
    ]),
)

# ---------------------------------------------------------------- education
PAGES["education.html"] = dict(
    page_key="education", nav="personal",
    title="Financial Education & Learning | Chase",
    desc="Build money skills with Chase financial education — guides for students, families and online learning on budgeting, credit and saving.",
    body="\n\n".join([
        hero("Education", "Money skills for every stage of life",
             "Free articles, videos and tools that make banking, credit and investing easier to understand &mdash; no jargon required.",
             icon="books",
             actions='<a class="btn btn-green" href="search.html?q=savings">Browse topics</a>'),
        spots("Learn at your pace", "", [
            ("people-message", "For students",
             "Checking for students, first credit cards and how to build a budget that survives college.",
             "education.html#students", "Student hub", "students"),
            ("chart-line", "For investors",
             "Start with the basics: what diversification means, how compounding works and why fees matter.",
             "investing.html#learn", "Investing basics"),
            ("books", "Online learning",
             "Short, practical lessons on saving, borrowing and protecting your money.",
             "education.html#online", "Start a lesson", "online"),
        ]),
        features("Popular guides", [
            "How to build an emergency fund from zero",
            "Credit scores explained &mdash; and the five factors behind yours",
            "Renting vs. buying: how to run the numbers",
            "Teaching kids about money at every age",
        ]),
        auth_block(),
    ]),
)

# ---------------------------------------------------------------- travel
PAGES["travel.html"] = dict(
    page_key="travel", nav="travel",
    title="Travel Rewards Cards & Benefits | Chase",
    desc="Turn everyday spending into travel with Chase travel credit cards — earn points, transfer to airline partners and book through Chase Travel.",
    body="\n\n".join([
        hero("Travel", "Go further with points that travel well",
             "Earn Ultimate Rewards&reg; on everyday purchases, then redeem for flights, hotels, experiences and more.",
             icon="plane",
             actions='<a class="btn btn-green" href="credit-cards.html#rewards">Compare travel cards</a>'),
        spots("Travel starts with the right card", "", sid="cards", items=[
            ("plane", "Sapphire Preferred",
             "Earn bonus points on travel and dining, plus a 25% boost when you redeem through Chase Travel.",
             "travel.html#cards", "See Sapphire benefits"),
            ("card", "Ink Business Preferred",
             "Earn on travel, advertising and shipping &mdash; built for business trips and business spend.",
             "business.html#cards", "View business travel cards"),
            ("check", "Points, your way",
             "Transfer points 1:1 to leading airline and hotel partners, or book directly with a single click.",
             "travel.html#points", "How points work", "points"),
        ]),
        features("Travel benefits that matter at the airport", [
            "Trip cancellation/interruption insurance on eligible cards",
            "No foreign transaction fees when you pay abroad",
            "Airport lounge access and travel credits on premium cards",
            "24/7 fraud monitoring that travels with you",
        ]),
        auth_block(),
    ]),
)

# ---------------------------------------------------------------- business
PAGES["business.html"] = dict(
    page_key="business", nav="business",
    title="Business Banking, Loans & Cards | Chase for Business",
    desc="Chase for Business — business checking, payment solutions, business loans and credit cards with local bankers and 24/7 support.",
    body="\n\n".join([
        hero("Business", "Banking built for how business really works",
             "From your first sale to your first hire, Chase for Business gives you accounts, credit and advice in one place.",
             icon="briefcase",
             actions='<a class="btn btn-green" href="sign-up.html?type=business">Open a business account</a>'),
        spots("Everything your business needs", "", items=[
            ("briefcase", "Business checking",
             "Choose from three business checking accounts with digital payments, invoicing and QuickAccept&trade; card acceptance.",
             "business.html#checking", "Compare accounts", "checking"),
            ("money", "Payment solutions",
             "Accept cards in person, online and on the go &mdash; deposits land in your Chase account automatically.",
             "business.html#payments", "Take payments", "payments"),
            ("card", "Business credit cards",
             "Separate spending, earn rewards on business categories and give employees cards with their own limits.",
             "business.html#cards", "View business cards", "cards"),
            ("chart-line", "Business loans & lines of credit",
             "Fund equipment, inventory or cash flow with lending options from SBA loans to lines of credit.",
             "business.html#loans", "Explore funding", "loans"),
            ("books", "Resources for owners",
             "Guides, webinars and a dedicated Business Specialist to talk through your next move.",
             "business.html#resources", "See resources", "resources"),
            ("building", "Commercial banking",
             "Treasury management and tailored solutions for larger companies with more complex needs.",
             "business.html#commercial", "About commercial banking", "commercial"),
        ], cols=3),
        features("Banking that moves at business speed", [
            "QuickAccept&trade; lets you take card payments the day your account opens",
            "Send estimates and invoices that customers can pay by card or ACH",
            "Access to a local Business Specialist &mdash; not a call center script",
            "Extend your coverage with Business Online and the Chase Mobile&reg; app",
        ]),
        auth_block(),
    ]),
)

# ---------------------------------------------------------------- support
PAGES["support.html"] = dict(
    page_key="support", nav="support",
    title="Help, Support & Security | Chase",
    desc="Get Chase support — schedule a meeting, find help topics, report fraud and learn how Chase protects your account.",
    body="\n\n".join([
        hero("Support", "How can we help today?",
             "Search help topics, meet with a banker, report something suspicious or send us your feedback.",
             icon="people-message",
             actions='<a class="btn btn-green" href="search.html?q=help">Search help topics</a>'),
        spots("Popular support actions", "", items=[
            ("check", "Schedule a meeting",
             "Book time with a banker at a branch near you or connect by phone or video.",
             "support.html#meeting", "Book a time"),
            ("shield", "Security & fraud",
             "Lock your card, report fraud and learn how we protect every sign-in.",
             "support.html#security", "Stay secure", "security"),
            ("people-message", "Send feedback",
             "Tell us what's working and what isn't &mdash; your feedback reaches the teams that build the site.",
             "support.html#feedback", "Share feedback"),
        ]),
        features("Quick answers", [
            "Locked out? Reset your username or password on the sign-in page",
            "Lost card? Lock it instantly in the Chase Mobile&reg; app, then call us",
            "Chase will never ask for your password by email, text or phone",
            "Statements, tax documents and statements live in your account hub",
        ]),
        support_forms(),
        cta("Not sure where to start?", "Search every page of the site, or open a chat with the automated assistant at the bottom of the screen.",
            "search.html", "Search the site"),
        auth_block(),
    ]),
)

# ---------------------------------------------------------------- sign-in page
PAGES["sign-in.html"] = dict(
    page_key="signin", nav="personal",
    title="Secure Sign In | Chase Online",
    desc="Sign in to Chase online banking — or choose passwordless sign-in.",
    body="\n\n".join([
        hero("Sign in", "Welcome back to Chase",
             "Sign in to view accounts, move money and manage cards."),
        f"""    <section class="section reveal">
      <div class="wrap auth-wrap">
        <div class="auth-card" id="signinPageCard" role="region" aria-label="Sign in form">
          <h2>Sign in to your account</h2>
          <p class="sub">Enter your username and password to continue.</p>
          <form id="signinPageForm" autocomplete="on">
            <div class="field">
              <label for="pgUsername">Username</label>
              <input id="pgUsername" name="username" type="text" autocomplete="username" spellcheck="false" maxlength="60" required>
            </div>
            <div class="field">
              <label for="pgPassword">Password</label>
              <div class="pw-wrap">
                <input id="pgPassword" name="password" type="password" autocomplete="current-password" maxlength="64" required>
                <button type="button" class="pw-toggle" id="pgPwToggle" aria-pressed="false">Show</button>
              </div>
            </div>
            <div class="signin-row">
              <label class="check-row"><input type="checkbox" id="pgRemember"> Remember username</label>
              <a class="token-link" href="https://secure.chase.com/web/auth/dashboard" target="_blank" rel="noopener">Use token <svg class="chev-r" aria-hidden="true"><use href="#ic-chevron-right"/></svg></a>
            </div>
            <div class="signin-status" id="pgNotice" role="status" hidden></div>
            <button class="btn btn-blue btn-block" type="button" id="pgSubmit">Sign in</button>
            <div class="or-divider" role="separator"><span>Or</span></div>
            <button class="btn btn-outline btn-block" type="button" id="pgPasswordless">Passwordless sign in</button>
            <div class="signin-links">
              <a id="help" href="reset-password.html">Forgot username/password? <svg class="chev-r" aria-hidden="true"><use href="#ic-chevron-right"/></svg></a>
              <a href="sign-up.html">Not Enrolled? Sign Up Now. <svg class="chev-r" aria-hidden="true"><use href="#ic-chevron-right"/></svg></a>
            </div>
          </form>
        </div>
        <aside class="auth-side">
          <h2>First time signing in here?</h2>
          <ul>
            <li><svg aria-hidden="true"><use href="#ic-check"/></svg><span>Enroll in under five minutes with your account details.</span></li>
            <li><svg aria-hidden="true"><use href="#ic-check"/></svg><span>Set a reminder and we'll remember your username on this browser.</span></li>
          </ul>
          <div class="page-hero-actions">
            <a class="btn btn-blue" href="sign-up.html">Enroll now</a>
            <a class="btn btn-outline" href="support.html">Contact support</a>
          </div>
        </aside>
      </div>
    </section>""",
    ]),
)

# ---------------------------------------------------------------- sign-up page
PAGES["sign-up.html"] = dict(
    page_key="signup", nav="personal",
    title="Enroll in Chase Online | Sign Up",
    desc="Create your Chase online profile in three steps — personal details, sign-in credentials and agreements.",
    body="\n\n".join([
        hero("Sign up", "Create your Chase profile",
             "Three short steps to enroll and start banking with Chase."),
        """    <section class="section reveal">
      <div class="wrap">
        <div class="auth-card" style="max-width:640px">
          <div class="signup-progress" aria-label="Sign-up progress">
            <span class="step-chip active"><span class="step-num">1</span> About you</span>
            <span class="step-chip"><span class="step-num">2</span> Credentials</span>
            <span class="step-chip"><span class="step-num">3</span> Agreements</span>
          </div>

          <div id="signupWizard">
            <div class="su-step" data-step="1">
              <h2>About you</h2>
              <p class="sub">We'll use this to create your profile.</p>
              <div class="field-grid">
                <div class="field"><label for="suFirst">First name</label><input id="suFirst" type="text" autocomplete="given-name" maxlength="40"><span class="field-error"></span></div>
                <div class="field"><label for="suLast">Last name</label><input id="suLast" type="text" autocomplete="family-name" maxlength="40"><span class="field-error"></span></div>
                <div class="field full"><label for="suEmail">Email address</label><input id="suEmail" type="email" autocomplete="email" maxlength="80"><span class="field-error"></span></div>
                <div class="field full"><label for="suDob">Date of birth</label><input id="suDob" type="date"><span class="field-error"></span></div>
              </div>
              <div class="step-actions"><span></span><button class="btn btn-blue" type="button" data-step-next>Continue</button></div>
            </div>

            <div class="su-step" data-step="2" hidden>
              <h2>Create sign-in credentials</h2>
              <p class="sub">Choose a username and password for this device.</p>
              <div class="field-grid">
                <div class="field full"><label for="suNewUser">Username</label><input id="suNewUser" type="text" autocomplete="username" spellcheck="false" maxlength="60"><span class="field-error"></span></div>
                <div class="field"><label for="suNewPass">Password</label>
                  <input id="suNewPass" type="password" autocomplete="new-password" maxlength="64">
                  <div class="pw-meter" aria-hidden="true"><span id="pwMeterFill"></span></div>
                  <span class="pw-meter-label" id="pwMeterLabel"></span>
                  <span class="field-error"></span>
                </div>
                <div class="field"><label for="suNewPass2">Confirm password</label><input id="suNewPass2" type="password" autocomplete="new-password" maxlength="64"><span class="field-error"></span></div>
              </div>
              <div class="step-actions"><button class="link-quiet" type="button" data-step-back>Back</button><button class="btn btn-blue" type="button" data-step-next>Continue</button></div>
            </div>

            <div class="su-step" data-step="3" hidden>
              <h2>Agreements</h2>
              <p class="sub">Review and accept to finish enrolling.</p>
              <label class="field-check terms-box">
                <input type="checkbox" id="suTerms">
                <span>I agree to the Chase Online Services Agreement, Privacy Policy and to receive account notices electronically.</span>
                <span class="field-error"></span>
              </label>
              <div class="signin-status" id="suNotice" role="status" hidden></div>
              <div class="step-actions"><button class="link-quiet" type="button" data-step-back>Back</button><button class="btn btn-blue" type="button" id="suFinish">Create account</button></div>
            </div>

            <div class="su-step success-panel" id="suSuccess" hidden>
              <div class="success-badge"><svg aria-hidden="true"><use href="#ic-check"/></svg></div>
              <h2>You're enrolled!</h2>
              <p>Your profile is ready and you are signed in. Open your account hub to see your accounts and get started.</p>
              <a class="btn btn-blue" href="account.html">Go to my account</a>
            </div>
          </div>
        </div>
      </div>
    </section>""",
    ]),
)

# ---------------------------------------------------------------- account page
PAGES["account.html"] = dict(
    page_key="account", nav="personal",
    title="My Account | Chase",
    desc="Your account hub — balances, activity, transfers, payments, support cases and settings.",
    body="""    <section class="section reveal">
      <div class="wrap">
        <div class="account-head">
          <div>
            <h1 data-greeting>Welcome back</h1>
            <p class="sub">Signed in as <strong data-username-badge></strong> &middot; <span data-email-badge></span></p>
            <p class="acct-meta" id="relLine">Loading account summary&hellip;</p>
          </div>
          <div class="acct-actions">
            <a class="btn btn-outline" href="support.html">Support</a>
            <button class="btn btn-blue" type="button" id="acctSignout">Sign out</button>
          </div>
        </div>
        <div class="acct-grid" id="acctGrid" aria-live="polite" aria-busy="true">
          <div class="acct-card"><span class="acct-label">Loading accounts&hellip;</span></div>
        </div>
      </div>
    </section>

    <section class="section reveal" aria-labelledby="activityTitle" id="activity">
      <div class="wrap">
        <div class="section-head-row">
          <div>
            <h2 class="section-title" id="activityTitle">Recent activity</h2>
            <p class="section-lede">Every deposit, transfer and payment on your accounts, newest first.</p>
          </div>
          <button class="btn btn-outline btn-small" type="button" id="txnsMore" hidden>Show all</button>
        </div>
        <div class="txn-list" id="txnsList" aria-live="polite">
          <p class="muted">Loading activity&hellip;</p>
        </div>
      </div>
    </section>

    <section class="section reveal" aria-labelledby="moneyTitle" id="money">
      <div class="wrap">
        <h2 class="section-title" id="moneyTitle">Move money</h2>
        <p class="section-lede">Validated end-to-end by the server — every action is authorized, limited and audit-logged.</p>
        <div class="dash-grid dash-grid-4">
          <div class="dash-card">
            <h3>Deposit <span class="dash-tag">funding</span></h3>
            <p class="dash-sub">Add funds to one of your accounts. Accounts start at $0.00.</p>
            <form id="depForm" novalidate>
              <div class="field"><label for="depAccount">To account</label><select id="depAccount" required></select></div>
              <div class="field"><label for="depAmount">Amount (USD)</label><input id="depAmount" type="text" inputmode="decimal" placeholder="250.00" maxlength="12" autocomplete="off"><span class="field-error"></span></div>
              <div class="field"><label for="depMemo">Memo <span class="opt">(optional)</span></label><input id="depMemo" type="text" maxlength="120" placeholder="Paycheck, gift, opening deposit…"></div>
              <div class="form-status" id="depStatus" role="status" hidden></div>
              <button class="btn btn-blue btn-block" type="submit">Add deposit</button>
            </form>
          </div>

          <div class="dash-card">
            <h3>Transfer between accounts</h3>
            <p class="dash-sub">Re-enter your password to authorize &mdash; step-up protection on every transfer.</p>
            <form id="trForm" novalidate>
              <div class="field"><label for="trFrom">From</label><select id="trFrom" required></select></div>
              <div class="field"><label for="trTo">To</label><select id="trTo" required></select></div>
              <div class="field"><label for="trAmount">Amount (USD)</label><input id="trAmount" type="text" inputmode="decimal" placeholder="50.00" maxlength="12" autocomplete="off"><span class="field-error"></span></div>
              <div class="field"><label for="trConfirm">Confirm with your password</label><input id="trConfirm" type="password" autocomplete="current-password" maxlength="64"><span class="field-error"></span></div>
              <p class="dash-note" id="trLimitNote">&nbsp;</p>
              <div class="form-status" id="trStatus" role="status" hidden></div>
              <button class="btn btn-blue btn-block" type="submit">Review &amp; transfer</button>
            </form>
          </div>

          <div class="dash-card">
            <h3>Pay a bill or person</h3>
            <p class="dash-sub">Schedule or send a payment to a saved payee — with live status tracking.</p>
            <form id="payForm" novalidate>
              <div class="field"><label for="payPayee">Pay to</label><select id="payPayee" required></select></div>
              <div class="field"><label for="payFrom">From account</label><select id="payFrom" required></select></div>
              <div class="field"><label for="payAmount">Amount (USD)</label><input id="payAmount" type="text" inputmode="decimal" placeholder="75.00" maxlength="12" autocomplete="off"><span class="field-error"></span></div>
              <div class="field"><label for="payDate">Send date <span class="opt">(leave blank to send now)</span></label><input id="payDate" type="date"></div>
              <div class="form-status" id="payStatus" role="status" hidden></div>
              <button class="btn btn-blue btn-block" type="submit">Schedule payment</button>
            </form>
            <div class="payee-box">
              <h4>Manage payees</h4>
              <div id="payeeList" class="payee-list"><p class="muted">Loading payees&hellip;</p></div>
              <form id="payeeForm" class="payee-add" novalidate>
                <input id="peName" type="text" placeholder="Payee name" maxlength="60" aria-label="Payee name" autocomplete="off">
                <input id="peDetail" type="text" placeholder="Email or acct last-4" maxlength="40" aria-label="Payee email or account" autocomplete="off">
                <button class="btn btn-outline btn-small" type="submit">Add payee</button>
              </form>
              <div class="form-status" id="payeeStatus" role="status" hidden></div>
            </div>
          </div>

          <div class="dash-card" id="withdrawCard">
            <h3>Withdraw <span class="dash-tag">support approval</span></h3>
            <p class="dash-sub">Request funds out of your account. Support reviews the ticket in the chat &mdash; money moves only after approval.</p>
            <form id="wdForm" novalidate>
              <div class="field"><label for="wdAccount">From account</label><select id="wdAccount" required></select></div>
              <div class="field"><label for="wdAmount">Amount (USD)</label><input id="wdAmount" type="text" inputmode="decimal" placeholder="50.00" maxlength="12" autocomplete="off"><span class="field-error"></span></div>
              <div class="form-status" id="wdStatus" role="status" hidden></div>
              <button class="btn btn-blue btn-block" type="submit">Request withdrawal</button>
            </form>
            <div id="wdList" class="wd-list" aria-live="polite" hidden></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section reveal" aria-labelledby="paymentsTitle" id="payments">
      <div class="wrap">
        <h2 class="section-title" id="paymentsTitle">Payments</h2>
        <p class="section-lede">Scheduled, completed and failed payments with their current status.</p>
        <div class="txn-list" id="paymentsList" aria-live="polite">
          <p class="muted">Loading payments&hellip;</p>
        </div>
      </div>
    </section>

    <section class="section reveal" aria-labelledby="invoicesTitle" id="invoices">
      <div class="wrap">
        <h2 class="section-title" id="invoicesTitle">Invoices</h2>
        <p class="section-lede">Invoices sent to you by the operator &mdash; review the line items and pay one straight from your account.</p>
        <div class="txn-list" id="invoicesList" aria-live="polite">
          <p class="muted">Loading invoices&hellip;</p>
        </div>
      </div>
    </section>

    <section class="section reveal" aria-labelledby="casesTitle" id="cases">
      <div class="wrap">
        <h2 class="section-title" id="casesTitle">Support cases</h2>
        <p class="section-lede">Open a case and follow the full message history here.</p>
        <div class="dash-grid dash-grid-wide">
          <div class="dash-card">
            <h3>Open a new case</h3>
            <form id="caseForm" novalidate>
              <div class="field"><label for="csSubject">Subject</label><input id="csSubject" type="text" maxlength="120" autocomplete="off"><span class="field-error"></span></div>
              <div class="field"><label for="csMessage">What happened?</label><textarea id="csMessage" rows="4" maxlength="4000"></textarea><span class="field-error"></span></div>
              <div class="form-status" id="csStatus" role="status" hidden></div>
              <button class="btn btn-blue btn-block" type="submit">Submit case</button>
            </form>
          </div>
          <div class="dash-card">
            <h3>Your cases</h3>
            <div id="casesList" class="case-list" aria-live="polite"><p class="muted">Loading cases&hellip;</p></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section reveal" aria-labelledby="settingsTitle" id="settings">
      <div class="wrap">
        <h2 class="section-title" id="settingsTitle">Settings &amp; security</h2>
        <div class="dash-grid">
          <div class="dash-card">
            <h3>Profile</h3>
            <form id="pfForm" novalidate>
              <div class="field"><label for="pfEmail">Email address</label><input id="pfEmail" type="email" maxlength="80" autocomplete="email"><span class="field-error"></span></div>
              <div class="field"><label for="pfPhone">Phone <span class="opt">(optional)</span></label><input id="pfPhone" type="tel" maxlength="20" autocomplete="tel"><span class="field-error"></span></div>
              <div class="form-status" id="pfStatus" role="status" hidden></div>
              <button class="btn btn-blue btn-block" type="submit">Save profile</button>
            </form>
          </div>
          <div class="dash-card">
            <h3>Change password</h3>
            <form id="pwForm" novalidate>
              <div class="field"><label for="pwCurrent">Current password</label><input id="pwCurrent" type="password" autocomplete="current-password" maxlength="64"><span class="field-error"></span></div>
              <div class="field"><label for="pwNext">New password</label><input id="pwNext" type="password" autocomplete="new-password" maxlength="64"><span class="field-error"></span></div>
              <div class="field"><label for="pwNext2">Confirm new password</label><input id="pwNext2" type="password" autocomplete="new-password" maxlength="64"><span class="field-error"></span></div>
              <div class="form-status" id="pwStatus" role="status" hidden></div>
              <button class="btn btn-blue btn-block" type="submit">Update password</button>
            </form>
            <div class="dash-foot">
              <button class="link-quiet" type="button" id="signoutAll">Sign out of all other devices</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section reveal" aria-labelledby="quickTitle">
      <div class="wrap">
        <h2 class="section-title" id="quickTitle">Quick actions</h2>
        <p class="section-lede">Jump straight to the tools you use most.</p>
        <div class="quick-grid">
          <a class="quick-card" href="#money"><img src="icons/money.svg" alt="" width="40" height="40" loading="lazy"><span><strong>Pay &amp; transfer</strong><span>Deposit, transfer between accounts or pay a saved payee</span></span></a>
          <a class="quick-card" href="credit-cards.html#score"><img src="icons/credit-score.svg" alt="" width="40" height="40" loading="lazy"><span><strong>Credit score</strong><span>Check your score with Chase Credit Journey&reg; &mdash; free, no impact</span></span></a>
          <a class="quick-card" href="support.html#security"><img src="icons/shield.svg" alt="" width="40" height="40" loading="lazy"><span><strong>Card controls</strong><span>Lock your card, report fraud and review security settings</span></span></a>
          <a class="quick-card" href="investing.html#offers"><img src="icons/chart-line.svg" alt="" width="40" height="40" loading="lazy"><span><strong>Investing</strong><span>Self-directed trading and advisor access from the same login</span></span></a>
        </div>
      </div>
    </section>""",
)

# ---------------------------------------------------------------- 404 page
PAGES["404.html"] = dict(
    page_key="notfound", nav="none",
    title="Page Not Found (404) | Chase",
    desc="The page you're looking for isn't here. Search the site or head back to the Chase home page.",
    body="""
    <section class="err-wrap reveal">
      <div class="wrap">
        <p class="err-code" aria-hidden="true">404</p>
        <h1>We can't find that page</h1>
        <p class="err-lede">The link may be broken or the page may have moved. Try a search, or start again from the home page.</p>
        <div class="err-actions">
          <a class="btn btn-blue" href="index.html">Back to home</a>
          <a class="btn btn-outline" href="search.html">Search the site</a>
        </div>
        <nav class="err-links" aria-label="Popular pages">
          <a href="checking.html">Checking</a>
          <a href="credit-cards.html">Credit cards</a>
          <a href="home-loans.html">Home loans</a>
          <a href="business.html">Business</a>
          <a href="support.html">Support</a>
          <a href="sign-in.html">Sign in</a>
        </nav>
      </div>
    </section>""",
)

# ---------------------------------------------------------------- search page
PAGES["search.html"] = dict(
    page_key="search", nav="support",
    title="Search | Chase",
    desc="Search Chase — checking, savings, cards, mortgages, business banking, investing and support topics.",
    body="""
    <section class="search-hero reveal" id="searchPage">
      <div class="wrap">
        <h1>Search Chase</h1>
        <form class="search-box" id="searchForm" role="search" action="search.html" method="get">
          <label class="sr-only" for="searchInput">Search the site</label>
          <input id="searchInput" name="q" type="search" placeholder="Try &ldquo;checking&rdquo;, &ldquo;credit card&rdquo; or &ldquo;mortgage&rdquo;" autocomplete="off">
          <button class="btn btn-blue" type="submit">Search</button>
        </form>
      </div>
    </section>
    <section class="section reveal">
      <div class="wrap">
        <p class="search-status" id="searchStatus" role="status">Loading&hellip;</p>
        <div class="search-results" id="searchResults"></div>
      </div>
    </section>""",
)

# ---------------------------------------------------------------- password reset
PAGES["reset-password.html"] = dict(
    page_key="reset", nav="personal",
    title="Reset Password | Chase Online",
    desc="Reset your password with a time-limited, single-use link issued by the site.",
    body="""    <section class="page-hero reveal">
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><svg aria-hidden="true"><use href="#ic-chevron-right"/></svg><a href="sign-in.html">Sign in</a><svg aria-hidden="true"><use href="#ic-chevron-right"/></svg><span class="crumb-here" aria-current="page">Reset password</span></nav>
        <p class="eyebrow">Account access</p>
        <h1>Reset your password</h1>
        <p class="lede">Password reset links are issued by the site operator (no email is sent): time-limited and single-use.</p>
      </div>
    </section>

    <section class="section reveal">
      <div class="wrap auth-wrap">
        <div class="auth-card" id="resetCard" role="region" aria-label="Password reset form">
          <div id="resetRequest">
            <h2>Request a reset link</h2>
            <p class="sub">Enter your username. If an account exists, a reset link is issued to the operator console.</p>
            <form id="resetReqForm">
              <div class="field">
                <label for="rsUsername">Username</label>
                <input id="rsUsername" name="username" type="text" autocomplete="username" spellcheck="false" maxlength="30" required>
                <span class="field-error"></span>
              </div>
              <div class="signin-status" id="rsReqStatus" role="status" hidden></div>
              <button class="btn btn-blue btn-block" type="submit" id="rsRequest">Send reset request</button>
            </form>
          </div>
          <div id="resetSet" hidden>
            <h2>Choose a new password</h2>
            <p class="sub">Setting a password for <strong id="rsWho"></strong>.</p>
            <form id="resetSetForm">
              <div class="field">
                <label for="rsToken">Reset link code</label>
                <input id="rsToken" name="token" type="text" spellcheck="false" autocomplete="one-time-code" maxlength="100" required>
                <span class="field-error"></span>
              </div>
              <div class="field">
                <label for="rsNewPass">New password</label>
                <div class="pw-wrap">
                  <input id="rsNewPass" name="password" type="password" autocomplete="new-password" maxlength="64" required>
                  <button type="button" class="pw-toggle" id="rsPwToggle" aria-pressed="false">Show</button>
                </div>
                <span class="field-error"></span>
              </div>
              <div class="field">
                <label for="rsNewPass2">Confirm new password</label>
                <input id="rsNewPass2" name="password2" type="password" autocomplete="new-password" maxlength="64" required>
                <span class="field-error"></span>
              </div>
              <div class="signin-status" id="rsSetStatus" role="status" hidden></div>
              <button class="btn btn-blue btn-block" type="submit" id="rsSubmit">Set new password</button>
            </form>
          </div>
          <div class="signin-links">
            <a href="sign-in.html">Back to sign in <svg class="chev-r" aria-hidden="true"><use href="#ic-chevron-right"/></svg></a>
          </div>
        </div>
        <aside class="auth-side">
          <h2>How resets work here</h2>
          <ul>
            <li><svg aria-hidden="true"><use href="#ic-check"/></svg><span>Requests are verified server-side &mdash; links expire after 30 minutes and work once.</span></li>
            <li><svg aria-hidden="true"><use href="#ic-check"/></svg><span>Changing a password signs out every other device.</span></li>
            <li><svg aria-hidden="true"><use href="#ic-check"/></svg><span>Stored passwords are scrypt-hashed; nothing is ever sent to Chase.</span></li>
          </ul>
        </aside>
      </div>
    </section>""",
)

# ---------------------------------------------------------------- write files
def main():
    written = []
    for file, meta in PAGES.items():
        html = TEMPLATE.format(
            title=meta["title"], desc=meta["desc"], file=file, site=SITE,
            page_key=meta["page_key"], nav=meta["nav"], body=meta["body"],
        )
        with open(os.path.join(ROOT, file), "w", encoding="utf-8") as f:
            f.write(html)
        written.append(file)

    # SITE_INDEX for the client-side search page (shared via a tiny script)
    index = [
        {"url": "index.html", "title": "Chase home page",
         "desc": "Offers, cards, checking and ways to choose what's right for you.",
         "kw": "home freedom 400 checking bonus"},
        {"url": "checking.html", "title": "Checking accounts",
         "desc": "Compare Total Checking, Secure Banking and Student Checking with bonuses and benefits.",
         "kw": "checking direct deposit atm total secure student 300 bonus"},
        {"url": "savings.html", "title": "Savings accounts & CDs",
         "desc": "Chase Savings, Premier Savings and certificates of deposit with FDIC insurance.",
         "kw": "savings cd deposit emergency fund premier"},
        {"url": "credit-cards.html", "title": "Credit cards",
         "desc": "Cash back, travel rewards, business cards and free credit score with Credit Journey.",
         "kw": "credit card freedom unlimited sapphire cash back rewards score"},
        {"url": "home-loans.html", "title": "Home loans & mortgages",
         "desc": "Buy, refinance or tap home equity with prequalification and rate locks.",
         "kw": "mortgage refinance heloc home equity preapproval loan"},
        {"url": "auto.html", "title": "Auto loans",
         "desc": "Finance or refinance a car with a 30-day rate guarantee.",
         "kw": "auto car loan refinance vehicle financing"},
        {"url": "investing.html", "title": "Investing",
         "desc": "Self-directed investing, J.P. Morgan advisors and retirement accounts.",
         "kw": "invest retirement advisor jp morgan bonus brokerage ira"},
        {"url": "education.html", "title": "Financial education",
         "desc": "Guides and lessons on budgeting, credit, saving and investing.",
         "kw": "learn education budgeting credit basics students"},
        {"url": "travel.html", "title": "Travel rewards",
         "desc": "Turn points into flights, hotels and experiences with Chase travel cards.",
         "kw": "travel points ultimate rewards flights hotels sapphire"},
        {"url": "business.html", "title": "Business banking",
         "desc": "Business checking, payments, loans, cards and commercial banking.",
         "kw": "business commercial small business loan payments ink"},
        {"url": "support.html", "title": "Support & security",
         "desc": "Help topics, meeting scheduler, fraud reporting and feedback.",
         "kw": "help support contact fraud security meeting feedback"},
        {"url": "search.html", "title": "Search",
         "desc": "Search all pages of Chase.",
         "kw": "search find"},
        {"url": "sign-in.html", "title": "Sign in",
         "desc": "Sign in to your account or use passwordless sign-in.",
         "kw": "login signin password username enroll"},
        {"url": "sign-up.html", "title": "Sign up / enroll",
         "desc": "Create your local Chase profile in three steps.",
         "kw": "signup register enroll create account"},
        {"url": "account.html", "title": "My account hub",
         "desc": "Signed-in dashboard with quick actions and profile status.",
         "kw": "account dashboard session welcome"},
        {"url": "reset-password.html", "title": "Reset password",
         "desc": "Request a time-limited reset link and choose a new password.",
         "kw": "reset password forgot recovery forgot-password"},
    ]
    with open(os.path.join(ROOT, "site-index.js"), "w", encoding="utf-8") as f:
        f.write("/* Shared client-side search index */\nwindow.SITE_INDEX = ")
        f.write(json.dumps(index, indent=1))
        f.write(";\n")
    written.append("site-index.js")
    print("written:", ", ".join(written))


if __name__ == "__main__":
    main()
