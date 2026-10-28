# Chase.com homepage recreation — `chasebankio`

A high-fidelity, reference-matched front-end recreation of the **Chase.com** homepage, rebuilt from scratch as a fully static site. The structure follows the supplied homepage write-up one-to-one, the palette was pixel-sampled from the supplied reference screenshots, and all brand iconography comes from the reference site's own public SVG assets — **no generated or stock imagery**.

> This is a front-end design demonstration for portfolio review. It is **not affiliated with, endorsed by, or connected to JPMorgan Chase & Co.** Sign-in is never functional and no data is collected; the page ships `noindex` and links lead to the official chase.com destinations.

## Reference-matched structure (desktop + mobile)

1. Utility bar — Personal / Business / Commercial tabs · Schedule a meeting · Customer service · Español · search
2. Logo row — official Chase logo; mobile shows ☰ / logo / **Sign in** (opens overlay)
3. Primary nav — Checking … Travel with hover/click dropdowns
4. Blue hero — *Enjoy $400* · New Chase checking customers · green **Open an account** · embedded sign-in card on desktop (overlay on mobile)
5. **Choose what's right for you** — all 11 services as an always-visible grid (no paging, nothing cut off)
6. Offer cards — Chase Credit Cards / Chase Secure Banking℠ / Chase Auto with blue headers, real white icons, blue CTAs
7. Editorial tiles — advisor (real reference photo), Freedom Unlimited $200 bonus (pure CSS/SVG card art), $1,000 investing (text graphic), green CTAs, hairline separators
8. Full footer — all 11 column paragraphs with inline links, investment-risk blocks, Other Products & Services, social icons, trademark/deposit text, legal link grid, Equal Housing Opportunity, © 2026

## Real reference assets (no generated imagery)

| Asset | Source |
| --- | --- |
| `logo.svg`, `favicon.svg` | Official Chase header/footer logo SVG (octagon extracted for favicon) |
| `icons/*.svg` (14) | Official Chase spot illustrations (`mds_ill_*_linear_gry`) + white variants for blue card headers |
| `images/advisor.jpg` | Official reference photo used by the advisor tile |
| Freedom Unlimited card, $1,000 bonus | Built with pure HTML/CSS/SVG (crisp at any density, no bitmap) |
| Palette | Sampled from reference screenshots: `#005EB8`, `#0060F0`, `#138842`, `#131313`, `#353535` |
| Type | Open Sans — self-hosted variable `woff2` (48 KB), the reference typeface |

## Quality gates

- **Zero hidden/cut content**: no scroll-reveal gating, no carousels, no footer accordions — every section is visible at every breakpoint (verified at 1440 / 1080 / 768 / 390)
- **No horizontal overflow** at any tested viewport
- **Headless-browser QA**: no console errors, no failed requests
- **Zero-dependency build check**: `npm run build` validates local references, unique ids, metadata, alt text, JS syntax and CSS balance (0 errors)

## Run locally

```bash
python -m http.server 8080   # open http://localhost:8080
```

## Validate

```bash
npm run build    # alias: npm test
```

## Files

- `index.html` — full page structure, metadata, JSON-LD, UI glyph sprite
- `styles.css` — design system, responsive layouts (desktop/tablet/mobile), motion, reduced-motion support
- `app.js` — side menu, sign-in overlay, mega menus, preview-safe sign-in handling
- `scripts/validate.js` — build validation (plain Node, no dependencies)
- `fonts/`, `icons/`, `images/`, `logo.svg`, `favicon.svg` — self-contained assets (no external requests)
