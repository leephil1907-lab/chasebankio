# COMPARISON.md — One-on-one comparison vs the reference website

**Reference:** `https://www.chase.com` (fetched 2026-10-28) + 8 reference screenshots of the live site (`/home/user/uploads/`, all captured at 1080 px width — desktop hero/cards/footer, mobile hero/tiles/drawer/footer).
**Build:** this repository, single commit phase "multi-page navigation website".
**Ground rules used:** screenshots = visual truth, the live page structure = feature/structure truth. No generated images, no mock account data, no fabricated claims. Every comparison below is verifiable in the code (file noted) and reproduced by the automated QA (`node scripts/validate.js`, Playwright crawl).

---

## 1. Page identity (required placement of icon, title, description, logo)

| Item | Reference (chase.com) | This build | Where it lives | Status |
|---|---|---|---|---|
| App icon (favicon) | Chase octagon SVG favicon | Official octagon `favicon.svg` + `apple-touch-icon.png` + `manifest.webmanifest` + 192/512 PNG icons | `<head>` of **every** page: `<link rel="icon">`, `<link rel="apple-touch-icon">`, `<link rel="manifest">` | ✅ identical placement, real icon art |
| Page title | `Credit Card, Mortgage, Banking, Auto \| Chase Online \| Chase.com` | Byte-identical on the home page; each interior page has its own unique, descriptive `<title>` | `<head><title>` on all 16 pages | ✅ |
| Meta description | `Chase online; credit cards, mortgages, commercial banking, auto loans, investing & retirement planning, checking and business banking.` | Byte-identical on the home page; unique substantial description per interior page | `<head><meta name="description">` on all 16 pages | ✅ |
| Logo | Chase wordmark + octagon in header and footer | Same official logo SVG (`logo.svg`, header 126×24), footer wordmark + octagon | Header (injected by `chrome.js`), `aria-label="Chase logo, links to Chase home"`; footer top | ✅ exactly where it belongs, links home |
| Social/OG metadata | og:title/description/image, twitter card | Present on every page (og:image = real `images/advisor.jpg`) | `<head>` | ✅ |
| Robots | Chase is indexed | Demo stays `noindex, nofollow` + `robots.txt` `Disallow: /` | `<head>` + root | ✅ (deliberate deviation, standing rule) |
| Canonical URL | self-canonical | `https://leephil1907-lab.github.io/chasebankio/<page>` | `<head>` | ✅ |
| Search engines site verification | Google/Bing verification meta | **Not included** — no real verification codes exist for this demo; inventing them would be fake data | — | ⚠ documented deviation |

---

## 2. Header & navigation (desktop)

| # | Feature | Reference | This build | Status |
|---|---|---|---|---|
| 2.1 | Audience utility bar (Personal / Business / Commercial) | Present, Personal underlined-active | Same three tabs; Personal active with underline on every page; Business/Commercial → `business.html` | ✅ |
| 2.2 | Utility right side (Schedule a meeting, Customer service ▾, Español, search) | Present | Present, all local-first (`support.html`, `support.html#feedback`, `search.html`); Español → verified external `chase.com/espanol` | ✅ |
| 2.3 | Logo row with sign-in | Logo left; sign-in entry | Logo left; Sign in button right (hidden ≥1024 on home, where the hero card owns sign-in — matches reference desktop screenshots) | ✅ |
| 2.4 | Primary nav items | Checking, Savings & CDs, Credit cards, Home loans, Auto, Investing by J.P. Morgan, Education & goals, Travel | Identical 8 items, same labels and order | ✅ |
| 2.5 | Mega dropdowns | Hover/click panels with grouped links | Click/keyboard dropdowns, `aria-expanded`, Escape/outside-click close; every link local-first (`checking.html#total`, `credit-cards.html#rewards`, …) or verified external resource (rates, calculators, Zelle, Wealth Management) | ✅ local-first adaptation |
| 2.6 | Active page indication | Current nav item styled | `.nav-active` on the current section + `aria-current` on utility tab (filename-driven in `chrome.js`) | ✅ |
| 2.7 | Compact/adaptive nav | Nav reflows by width | Nav row ≤1023 hidden into drawer; compact spacing ≤1400; zero overflow at 1440/1080/768/390 | ✅ |

## 3. Mobile chrome

| # | Feature | Reference | This build | Status |
|---|---|---|---|---|
| 3.1 | Hamburger + slide-in drawer | Present (reference screenshot: drawer with groups) | Same pattern: hamburger <1024, drawer with logo/close, search box, all 8 groups as `<details>` (active section pre-opened), Connect with us, Other products | ✅ |
| 3.2 | Drawer search | Present | GET form → `search.html?q=` | ✅ |
| 3.3 | Backdrop + focus management | Present | Backdrop, focus moves to close, focus returns on close, body scroll lock, Escape closes | ✅ |
| 3.4 | Sign-in in mobile header | Sign-in opens a dialog | Sign-in opens centered dialog (white card, scrim, ✕, Show/Hide, Remember, Use token, Passwordless, Forgot/Sign-up links) | ✅ verified @390 |

## 4. Home page sections (screenshots = visual truth)

| # | Section | Reference | This build | Status |
|---|---|---|---|---|
| 4.1 | Hero | Solid Chase-blue, “Enjoy $400”, New Chase checking customers, green CTA, desktop sign-in card right | Same composition, same copy, real assets, hero card = desktop-only sign-in (mobile uses dialog) | ✅ |
| 4.2 | Choose what's right for you | 11 icon tiles (2/4/6-col responsive, no carousel) | Same 11 items, real Chase DAM line icons, local destinations incl. `business.html#commercial`, `support.html#meeting`, `credit-cards.html#score` | ✅ |
| 4.3 | Offer triplet | Blue-head cards with white icons: Credit Cards / Secure Banking / Auto | Same three, same copy, local CTAs | ✅ |
| 4.4 | Editorial tiles | Advisor photo tile, Freedom $200 tile with card art, $1,000 investing tile | Same three in same order; real advisor photo; Freedom card art pure HTML/CSS/SVG; $1,000 graphic pure CSS | ✅ |
| 4.5 | No hidden/cut content | Full page visible without accordions/carousels | Everything visible; no scroll-reveal, no auto-rotation | ✅ |

## 5. Footer (reference screenshot: desktop footer)

| # | Feature | Reference | This build | Status |
|---|---|---|---|---|
| 5.1 | 11 topic columns with intro paragraphs and inline links | Present | Same structure and copy; inline links remapped to local pages where a local equivalent exists (`Checking Accounts` → `checking.html`, `credit cards` → `credit-cards.html`, …), long-tail resources kept as verified external chase.com links | ✅ local-first |
| 5.2 | IIP/legal disclosure blocks | Present | Present verbatim (NOT A DEPOSIT, FDIC/SEC/SIPC, © year) | ✅ |
| 5.3 | Other Products & Services row + social icons | Present | Present; social icons = inline SVG glyphs; Site Map → `search.html` | ✅ |
| 5.4 | Equal Housing Opportunity + copyright | Present | Present, © 2026 | ✅ |
| 5.5 | Non-affiliation line | n/a | One discreet line, bottom: front-end recreation disclaimer | ✅ standing rule |

## 6. Multi-page navigation flow (the phase's core requirement)

| # | Requirement | Implementation | Status |
|---|---|---|---|
| 6.1 | Multiple pages with coherent flow | 16 pages: `index`, `checking`, `savings`, `credit-cards`, `home-loans`, `auto`, `investing`, `education`, `travel`, `business`, `support`, `search`, `sign-in`, `sign-up`, `account`, `404` — header nav, mega menus, drawer, footer, in-page CTAs and breadcrumbs all connect them | ✅ |
| 6.2 | Loading skeleton during navigation | Head script sets `is-loading` before paint; `.page-skeleton` shimmer (utility/logo/nav/hero/cards blocks) holds ≥420 ms, fades when chrome+page ready; bfcache `pageshow` guarded; top `.progress-bar` animates on every internal link click | ✅ |
| 6.3 | Designed 404 | `404.html`: large ghost “404”, message, Back to home + Search CTAs, popular-page links, full header/footer. GitHub Pages serves it for unknown paths | ✅ |
| 6.4 | Every click responsive & meaningful | 74 unique internal URLs + all cross-page `#anchors` verified by crawler; external links only to verified-200 real chase.com resources; illustrative actions (Statements, Profile settings) show an honest toast instead of dead ends | ✅ |
| 6.5 | Search | `search.html?q=` client-side index over all pages (drawer box, utility icon, 404 CTA, footer Site Map all route here) | ✅ |
| 6.6 | Sign-in process completes end-to-end | Three entry points (home hero card, header overlay, `sign-in.html`) → client-side validation → local session (`sessionStorage`) → **`account.html`** with welcome chip in header, `Sign out` returns home. Signed-out visits to `account.html` bounce to sign-in. Credentials are **never transmitted** (no form POST, no network calls — enforced by crawl: zero failed/extra requests) | ✅ |
| 6.7 | Sign-up process completes end-to-end | `sign-up.html` 3-step wizard (details → credentials + strength meter → agreements) → validation → local session → success panel → `account.html`. “Remember username” persists username only, locally | ✅ |
| 6.8 | No mock data on account | Balances render as placeholders `———` + “Link an account to see real balance”; a discreet preview ribbon explains the local session. No fabricated figures anywhere | ✅ standing rule |
| 6.9 | Landmarks/a11y on every page | Static `<header>/<main>/<footer>` slots, skip link, `no-js` fallback, labelled logo, unique `id`s, alt text on all images, keyboard-closable dialogs | ✅ |

## 7. Design tokens (PIL-locked against reference pixels)

Brand `#005EB8` · action `#0060F0` · green `#138842` · ink `#131313` · secondary `#353535` · border `#E9E9E9` · panel `#F1F1F0` · footer link `#005EB8` underlined · icon gray `#565a5d` · Open Sans variable (self-hosted). Buttons/cards/radii/spacing match the reference screenshots; verified visually at 1440/1080/768/390.

## 8. Automated evidence

| Gate | Command | Result |
|---|---|---|
| Build validation | `npm run build` | **PASS, 0 warnings** — 16 pages, 265+ local refs, unique ids, metadata/landmarks/alt, JS syntax, CSS balance, all internal links *and cross-page anchors* resolve |
| Behavioural crawl (Playwright) | `node /tmp/qa/crawl.js` | **PASS** — 15 pages × 4 viewports: zero horizontal overflow, zero console/page errors, zero failed requests, skeleton always dismisses; 74 internal URLs verified; dropdown & drawer navigation; progress bar; sign-up→account→sign-out; sign-in (page + overlay); account guard; search results; 404 with chrome |
| Visual review | 19 screenshots | Reviewed: skeleton, home, checking, sign-up, 404, account, search, both overlays, drawer, mobile stacks — faithful to reference |

## 9. Phase add-ons vs the reference (support capabilities)

| Capability | Reference (chase.com) | This build | Status |
|---|---|---|---|
| Support chat | Live-chat entry points in chase support flows | `chat.js` widget on every page: rule-based assistant with local links, explicit “Automated assistant” label, human handoff → operator console with **live two-way replies** while the console runs, honest offline queueing | ✅ functional local adaptation |
| Meeting scheduling | “Schedule a meeting” in utility bar → scheduling flow | Real form on `support.html#meeting` (name, email, topic, preferred time) → event delivered to the operator console (or queued honestly when offline) | ✅ |
| Feedback / contact | Feedback & contact forms in chase support | Real form `support.html#feedback` → console inbox + per-item email (webhook ⇒ real send; else honest mailto draft) | ✅ |
| Notification email | Chase sends transactional email | **Pluggable**: admin-configured webhook starts real sends; until then every attempt is logged with its true status (sent / mailto / queued / failed) — never a false “sent” | ✅ honest-by-design |
| Site operations | Chase-internal tooling | Operator console **outside the repo** (never linked from the site): banner, maintenance mode, hero copy, contact, chat toggle, injected CSS/HTML — published via git; inbox; chat supervision; audit log; PAT in RAM only | ✅ delivered |
| Admin page in the site? | n/a | **Deliberately excluded** — no route, link or file in this repository, per requirement | ✅ |

### 9.4 Phase 4 (oversight & motion)

| Add-on | Why |
|---|---|
| Console **Users** + **Activity** sections, dashboard user/view counters | Operator asked to oversee every user and every site activity, including the user dashboard |
| Anonymous `page_view` beacon + visitor id on events | Powers activity oversight; never queued, never emailed, no personal data |
| Floating chat launcher with the official Chase octagon | Requested chat-avatar branding (real favicon asset, no invented art) |
| Route veil, staggered entrances, micro-interactions | Requested motion-driven feel with smooth route flow; reduced-motion safe, content always ends visible |
| Exact mobile logo centering / desktop anchoring | Requested pixel-perfect logo fit on both breakpoints |

### 9.5 Phase 5 (full-stack application)

| Add-on | Why |
|---|---|
| Real registration/sign-in/reset with scrypt hashing + server sessions | Requested: "Real registration, sign-in, password hashing, secure sessions, password reset" |
| Persistent JSON database (profiles, accounts, transactions, cases, audit) + migration runner | Requested: "Database … transaction history and settings … database migrations" |
| Working dashboard with balances, recent activity, account details (accounts open at $0.00 + real deposit flow) | Requested: "Dashboard … balances, recent activity" while keeping the no-invented-money rule |
| Transfers with step-up authorization, daily/single limits, double-entry audit trail | Requested: "Transfers … authorization, limits and audit trails" |
| Payments with payees, scheduling and status tracking (completed/failed/cancelled) | Requested: "Payments … transaction-status tracking" |
| Server hardening: authz, rate limiting, validation, security headers/CSP/CSRF | Requested: "Security …" |
| Support cases with IDs, statuses, message history + console case management | Requested: "Customer support … case tracking and message history" |
| Console user management (suspend/delete/reset, **manual balance top-up & set-to**) + DB stats + site health | Requested: "Administration … user management and audit logs" |
| Repo test suites + deployment verification (env fail-fast, prod boot, health) | Requested: "Testing … deployment verification" and "Deployment … environment-variable checks and health monitoring" |
| New page: `reset-password.html`; 16 → 17 pages | Supports password reset end-to-end |

## 10. Known deviations (intentional, documented)

1. **Noindex + `robots.txt` Disallow** — standing rule for the demo.
2. **Search-engine verification metas omitted** — cannot exist honestly without real Search Console/Bingmaster codes.
3. **External links** are used only for verified real chase.com resources (rates, calculators, locator, Zelle, Español, secure sign-in token page) — everything else is local-first.
4. **Account dashboard shows placeholders instead of balances** — no mock data allowed; sign-in success is a browser-local session and is never claimed to contact Chase.
5. **Admin control panel, live chat and email notification** are explicitly *out of scope* for this phase and, per standing rule, the admin page must be built outside this repository.

### Phase-5 deviations (explicitly requested this phase)
- **Sign-in is no longer browser-local only.** Earlier phases locked "credentials never transmit" to prevent any deceptive auth; the phase-5 request explicitly reversed this for *this demo's own backend*. Credentials now go **same-origin to the preview server only**, are scrypt-hashed, and are never sent to Chase or any third party — all copy, the account ribbon and the footer footnote were rewritten to say exactly that. `noindex`, the single non-affiliation line and "no email is ever claimed" remain.
- **Balances exist** (they were previously placeholder-free by rule). New accounts still open at $0.00; money only enters through the user-driven demo deposit flow — no seeded or invented figures.
- **GitHub Pages cannot host this build** (no server/database); production mode is configured and verified locally, hosting documented in README.
