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
