# Chase.com multi-page recreation — `chasebankio`

A high-fidelity, reference-matched front-end recreation of **Chase.com** rebuilt from scratch as a fully static **multi-page website** (16 pages) with a shared header/footer chrome, desktop mega-navigation, mobile drawer, loading skeleton, designed 404, client-side search and complete browser-local sign-in / sign-up flows. The homepage follows the supplied write-up one-to-one, the palette was pixel-sampled from the supplied reference screenshots, and all brand iconography comes from the reference site's own public SVG assets — **no generated or stock imagery**.

> This is a front-end design demonstration for portfolio review. It is **not affiliated with, endorsed by, or connected to JPMorgan Chase & Co.** Sign-in and sign-up complete as a **session that lives only in your browser tab** (`sessionStorage`) — credentials are never transmitted anywhere, nothing is collected, the site ships `noindex` + `robots.txt` disallow, and every non-local link leads to a verified official chase.com resource.

## Pages (coherent navigation flow)

| Page | Role |
| --- | --- |
| `index.html` | Homepage — hero, 11 choices, offer triplet, editorial tiles (reference-matched) |
| `checking.html` `savings.html` `credit-cards.html` `home-loans.html` `auto.html` `investing.html` `education.html` `travel.html` | Product sections with hero, comparison spots, feature lists, CTA + in-page anchors used by mega-menu links |
| `business.html` `support.html` | Business hub (6 destinations incl. commercial) and support hub (meeting / security / feedback) |
| `search.html?q=` | Client-side search over every page (header icon, drawer box, 404 and footer Site Map all route here) |
| `sign-in.html` (+`#help`) `sign-up.html` | Full sign-in (password + passwordless + remember) and 3-step sign-up wizard |
| `account.html` | Signed-in hub — session guard, header welcome chip, honest placeholder balances (**no mock data**), sign out |
| `404.html` | Designed not-found page (GitHub Pages serves it for unknown paths) |

Every internal link and every cross-page `#anchor` is machine-checked; external links are limited to verified-200 chase.com resources (rates, calculators, locator, Zelle, Español, secure token sign-in).

## Navigation behaviours

- **Loading skeleton** — shimmer blocks hold the layout from first paint until chrome + page are ready (~420 ms), with a top **progress bar** on every internal navigation; back/forward cache restores never trap the skeleton.
- **Desktop** — utility bar (Personal active), 8-item primary nav with keyboard-accessible mega dropdowns, active-page state.
- **Mobile (<1024)** — hamburger → slide-in drawer with search, all nav groups and connect links; sign-in opens a centered dialog.
- **Auth** — three sign-in entry points (hero card, header dialog, `sign-in.html`) + `sign-up.html` wizard all validate client-side, create a local session and land on `account.html`; signed-out visits bounce to sign-in; header renders `Welcome, … / My account / Sign out` while signed in.

## Reference-matched homepage (unchanged)

1. Utility bar — Personal / Business / Commercial · Schedule a meeting · Customer service · Español · search
2. Logo row — official Chase logo; mobile ☰ / logo / **Sign in**
3. Primary nav — Checking … Travel with dropdowns
4. Blue hero — *Enjoy $400* · New Chase checking customers · green **Open an account** · embedded desktop sign-in card
5. **Choose what's right for you** — all 11 services, always visible
6. Offer cards — Credit Cards / Secure Banking℠ / Auto (blue headers, white real icons, blue CTAs)
7. Editorial tiles — real advisor photo, Freedom $200 (pure CSS/SVG card), $1,000 investing graphic
8. Full footer — 11 column paragraphs, investment-risk blocks, Other Products, socials, legal grid, EHO, © 2026, one discreet non-affiliation line

## Real reference assets (no generated imagery)

| Asset | Source |
| --- | --- |
| `logo.svg`, `favicon.svg` | Official Chase header/footer logo SVG (octagon extracted for favicon) |
| `icons/*.svg` (19) | Official Chase spot illustrations (`mds_ill_*_linear_gry/wht`) |
| `apple-touch-icon.png`, `icons/icon-192/512.png` | Rasterized from the official octagon favicon (blue tile, white mark) |
| `images/advisor.jpg` | Official reference photo used by the advisor tile |
| Freedom card, $1,000 bonus | Pure HTML/CSS/SVG (no bitmap) |
| Palette | Sampled: `#005EB8`, `#0060F0`, `#138842`, `#131313`, `#353535`, `#E9E9E9`, `#F1F1F0`, `#565a5d` |
| Type | Open Sans — self-hosted variable `woff2` |

## Quality gates

- **Build**: `npm run build` — 16 pages, 265+ local references, unique ids, per-page metadata (title/description/canonical/OG/icon/manifest), landmarks, alt text, JS syntax, CSS balance, all internal links **and cross-page anchors** resolve (0 errors, 0 warnings)
- **Behavioural crawl (Playwright)**: 15 pages × 4 viewports (1440/1080/768/390) — zero horizontal overflow, zero console errors, zero failed requests, skeleton always dismisses; drawer/dropdown navigation, progress bar, search, 404, sign-up→account→sign-out, sign-in (page + dialog), account guard
- **Visual**: reviewed against reference screenshots at desktop and mobile; no hidden/cut content, no carousels/accordions

## Run locally

```bash
python -m http.server 8080   # open http://localhost:8080
```

## Validate

```bash
npm run build    # alias: npm test
```

## Files

- `index.html` + 15 content pages — static documents with `#siteHeaderSlot` / `#siteFooterSlot` injection points and a `.page-skeleton`
- `chrome.js` — single source of truth for header, mega-nav model, drawer, sign-in dialog, footer, icon sprite
- `app.js` — skeleton/progress control, dialogs, auth flows (local session), sign-up wizard, search, toasts
- `site-index.js` — search index shared by `search.html`
- `styles.css` — design system + responsive layouts (desktop/tablet/mobile), reduced-motion support
- `scripts/gen_pages.py` — regenerates the 15 interior pages from structured content (idempotent)
- `scripts/validate.js` — zero-dependency build validation
- `manifest.webmanifest`, `favicon.svg`, `apple-touch-icon.png`, `robots.txt`
- `COMPARISON.md` — one-on-one comparison against the reference website (features, components, UX/UI, icon/title/description/logo placement)
- `fonts/`, `icons/`, `images/`, `logo.svg` — self-contained assets (no external requests)

---

## Operator console, notifications & chat (latest phase)

The site now ships with three operator-facing capabilities, split between the
repository and a console that lives **outside** it:

### `site-config.json` — the site's control file
Published by the admin console (git commit + push), loaded by every page at
boot. Controls: **announcement banner**, **maintenance overlay** (with an
operator “Preview anyway” escape), **home hero copy**, **contact details**
(shown on the support page), **chat on/off + welcome text**, the
**notification endpoint**, and **operator-injected CSS/HTML** for full
override power. Missing/unreachable file ⇒ built-in defaults, zero breakage.

### `notify.js` — honest event delivery
Feedback, meeting requests, sign-ups and sign-ins are POSTed to the console
endpoint. If the console is offline the event queues in the browser
(`chase_notify_outbox`) and auto-flushes on the next load / every 45 s while
browsing. UI copy always states which of the two happened — nothing ever
claims to have been sent when it was only queued.

### `chat.js` — support chat widget
- Rule-based assistant answering checking/savings/cards/mortgages/auto/
  investing/business/travel/security/sign-in questions with local links,
  clearly labelled “Automated assistant”.
- **Talk to a human**: contact + transcript handed to the console; while the
  console runs, admin replies appear live (status pill: Assistant online /
  Support online / replies pending); offline ⇒ queued on-device, honestly.
- Disabled entirely via `site-config.json → chat.enabled`.

### Admin console — `/home/user/chase-admin/` (NOT in this repo)
Password-gated operator panel: dashboard (live counts + repo HEAD), content
publishing to this repo, messages inbox, live-chat supervision with replies,
pluggable email (webhook ⇒ real sends; otherwise honest mailto drafts),
settings (GitHub token held **in memory only**) and a full audit log.
See `chase-admin/README.md` for run instructions.

### Evidence
- `npm run build` **PASS 0/0** — 16 pages, 297 refs, config JSON validated.
- Playwright crawl **PASS** — 15 pages × 4 viewports, zero errors/overflow,
  all flows (auth, drawer, search, 404, chat) green.
- Phase E2E **PASS (20 checks)** — bot Q&A, handoff → console → live admin
  reply into the open chat, forms → inbox, admin login/inbox/reply UI,
  real config publish to GitHub (`5c43881`), banner/maintenance rendering,
  chat toggle.
- Offline drill **PASS** — console down ⇒ honest queued wording; console back
  ⇒ outbox auto-drains, both events delivered.

## Phase 4 — oversight, motion & branding polish (latest)

- **Console oversight:** the operator console (outside this repo) gained **Users** (registered profiles + sign-in-only, joined to journeys) and **Activity** (every site event, filterable, incl. page views); the dashboard shows registered-user and page-view counters.
- **Page-view beacon:** `notify.js` assigns a stable anonymous visitor id (`localStorage.chase_visitor`, no personal data) and posts a best-effort `page_view` event per page — never queued, never triggers email; all events carry the visitor id.
- **Chat branding:** the floating chat launcher, panel header and message rows use the official Chase octagon (`favicon.svg`); no invented artwork.
- **Motion system:** cross-page route veil (white, z-520) + staggered section entrances + micro-interactions; `prefers-reduced-motion` respected and content always ends fully visible; z-index stack audited so drawers/dialogs/toasts/skeleton never overlap the chat layer.
- **Logo fit:** header logo exactly centered on mobile/tablet (`grid 1fr auto 1fr`), anchored left on desktop, rendered 126×24 with no distortion.
- **Honesty copy:** the account ribbon states credentials never leave the browser and that usage events reach only the operator's local console.
- **Evidence:** `phase4` QA (23 checks: console users/activity, avatar, overlap, logo, veil, Español) + full e2e/crawl/offline suites green.


## Phase 5 — full-stack: real auth, database, ledger, payments & hardening (latest)

The static replica now runs as a **full-stack application**: one zero-dependency Node server serves the site **and** a JSON-backed database with real authentication, a money ledger, support case tracking and a hardened API.

### Running it
```bash
npm start            # site + API on :8123 (dev defaults, prints health URL)
npm run migrate      # apply pending database migrations (idempotent)
npm test             # validate + 98 API checks + 14 deployment checks
cp .env.example .env # production values — see comments in the file
```
Production boot **fails fast** unless `SESSION_SECRET`, `ADMIN_API_TOKEN` and `COOKIE_SECURE=1` are set; `FRAME_ANCESTORS`, `HSTS`, `TRUST_PROXY` and `ALLOWED_ORIGINS` are documented in `.env.example`. `GET /api/health` reports uptime, schema version and applied migrations.

### What is real now
- **Authentication** — registration, sign-in, logout, password reset (time-limited single-use tokens), change-password. Passwords hashed with **scrypt** (N=16384, per-user salt, constant-time compare); sessions are random 256-bit tokens stored **hashed**, in `HttpOnly; SameSite=Lax` cookies (Secure in production), sliding expiry, revocation on password change/suspension.
- **Database** (`data/db.json`, git-ignored) — profiles, accounts, transactions (integer cents), payees, payments, sessions, reset tokens, support cases, audit trail, settings. Migration runner in `migrations/`.
- **Dashboard** — account overview with real balances, masked numbers, recent activity with running balances, account details. Accounts open at **$0.00**; a clearly-labelled demo deposit flow creates funds through genuine usage (locked decision: no invented balances).
- **Transfers** — validated (own accounts, balance, $2,500 single / $5,000 daily caps), **step-up password authorization** on every transfer, double-entry ledger rows, audit-logged attempts including failures.
- **Payments** — payee management, immediate or scheduled payments, statuses `scheduled → completed | failed | cancelled`, lazy + interval processing of due payments, failure rows preserved for tracking.
- **Customer support** — case IDs (`CS-####`), status lifecycle `open → pending → resolved/closed`, full message history visible to the customer in their hub; the operator console replies and changes status (console proxies the site's token-protected admin API — the site DB stays single-writer).
- **Administration** — console `Users` tab manages real accounts (suspend/reactivate with session revocation, delete with cascade, issue reset links); `Support cases` tab threads/replies/status; dashboard shows DB stats + site-backend health. Console audit log records every management action.
- **Security** — server-side authorization on every route; CSRF posture (SameSite + Origin check + required `X-Requested-With` on mutations); per-route rate limits (login/register/forgot/transfers); strict input validation (lengths, formats, integer-cents money, whitelist bodies); security headers incl. dynamic-hash **CSP** (inline boot script hashed per page), nosniff, COOP/CORP, referrer/permissions policies, `frame-ancestors` (env-controlled — `*` for the sandbox preview, `'self'` example for production), optional HSTS; JSON bodies capped at 64 KB; traversal-proof static serving.
- **Navigation & forms** — crawl-verified menus/drawer/search/404 across 4 viewports; every form validates client- **and** server-side with loading states, error messages and success confirmations.
- **Testing** — `tests/api.test.js` (98 checks: auth flows, ledger integrity, limits, payments, cases, admin authz, headers, CSRF, rate limits, audit) and `tests/deploy.test.js` (env fail-fast, idempotent migrations, prod-mode boot with Secure cookies + HSTS + pinned frame-ancestors, health, 404). Browser suites: multi-page crawl, 20-check e2e, offline-queue, motion/branding (phase 4) and the 34-check full journey (`phase5`).

### Honesty rules carried forward (updated, not dropped)
- Never claim a send that didn't occur; reset links are honestly delivered via the operator console (no email service is pretended).
- Chat never implies a human before handoff; unreachable console ⇒ queued labels.
- Copy updated everywhere to the new truth: credentials are stored **only on this preview's own server, scrypt-hashed, never sent to Chase**; `noindex` and the single non-affiliation footnote remain.

### Deploying to Render — Free first, then Starter

The repo ships a **`render.yaml` Blueprint** (one web service: `npm run build` → `npm start`).

**Free preview (what you do in the dashboard):**
1. Push this repo to GitHub, then at <https://dashboard.render.com> → **New → Blueprint** → connect the repo. Render reads `render.yaml` and creates the service with generated secrets — no manual env entry.
2. Deploy (build runs the validation gate; first boot applies migrations and prints the health URL).
3. Verify: open the service URL → sign up → dashboard → deposit/transfer; then hit `/api/health` (should show `"status":"ok","nodeEnv":"production"`).

**Free-tier facts (by design, not bugs):**
- The filesystem is **ephemeral**: the user database lives only while the instance isn't redeployed/restarted/spun down (idle → sleeps after 15 min, wakes in ~1 min). Fine for *looking* at the site — if data resets, just sign up again.
- No console service yet (`CONSOLE_URL` is empty): support cases are stored and tracked; chat honestly shows its queued/offline labels; password-reset delivery needs the console (add it when you upgrade).
- One free instance (744 h/month ≈ fits the month). No card charge for the plan itself.

**Upgrade path to Starter (~$7/mo + disk):**
1. Change the plan to **Starter**, then **Attach → New Disk**: mount path **`/opt/render/project/data`** (exactly the `DATA_DIR` already in `render.yaml` — no env changes needed).
2. Set `ALLOWED_ORIGINS=https://<your-service>.onrender.com` if you ever see 403s on forms (Origin/Host check; normally Render's Host header already matches).
3. **Admin console (second free service)** — the console lives in its own private repo (`leephil1907-lab/chase-admin-console`) with its own `render.yaml`: connect it via Blueprint, then copy this service's `ADMIN_API_TOKEN` into the console service's env (the one manual secret). Login password is `ADMIN_PASSWORD` in that yaml (default `Ops-Render-2026!`). The site already points `CONSOLE_URL` + `site-config.json` at `https://chase-admin-console.onrender.com`, so events, live chat, case replies and reset links activate as soon as it's connected. Both free services share 750 instance-hours/month.
4. Optional: custom domain — regenerate with `SITE_URL=https://your-domain.tld python3 scripts/gen_pages.py` (share/canonical URLs come from that one constant) and edit the same URLs in `index.html`.

### Deployment (verified locally — host is your choice)
`NODE_ENV=production npm start` with the `.env` values → health endpoint green, migrations applied, strict headers. GitHub Pages can host only the static bundle (no database/API) — pick a Node host (Render, Railway, Fly, VPS + systemd) and set the env vars above.
