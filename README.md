# Chase.com homepage recreation — `chasebankio`

A pixel-conscious, high-fidelity front-end recreation of the **Chase.com** homepage, rebuilt from scratch as a fully static site with modern performance practices, complete metadata and an automated build validation step.

> **Important:** This is a front-end design demonstration for portfolio/educational use. It is **not affiliated with, endorsed by, or connected to JPMorgan Chase & Co.** All imagery is original. Sign-in is a visual demo only — no credentials are ever stored or transmitted. The page ships with `noindex` and an on-page disclaimer.

## Highlights

- **Faithful visual system** — Chase blue (`#005EB8`), action blue (`#0060F0`), ink (`#101820`), the Open Sans type stack, sticky header with mega-menu navigation, hero offer band, circular "Choose what's right for you" carousel, offer card grids and the full multi-column footer with compliance/FDIC strip.
- **Speed-first delivery** — single self-hosted variable font (48 KB `woff2`), preloaded critical font + LCP image, hero image eager/`fetchpriority=high`, all other imagery `loading="lazy"` with explicit `width`/`height` (zero CLS), `defer`red JS, zero third-party requests, progressive JPEGs (~880 KB total imagery).
- **Smooth interaction** — CSS transitions throughout, IntersectionObserver reveal cascades, scroll-snap carousel, sliding drawer menu, animated sign-in panel, full `prefers-reduced-motion` support.
- **Complete metadata** — title/description mirroring the reference, Open Graph + Twitter cards, canonical, theme-color, JSON-LD (`WebSite` + `Organization`), robots guard and SVG favicon.
- **Accessibility** — skip link, semantic landmarks, labelled controls, `aria-expanded` menus, keyboard carousel, focus-visible styles, reduced-motion fallbacks and a no-JS fallback stylesheet.
- **Zero-dependency build check** — `npm run build` validates asset references, unique ids, hash targets, required metadata, alt text, JS syntax and CSS balance without installing a single package.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, metadata, JSON-LD, inline SVG icon sprite, all content |
| `styles.css` | Design tokens, components, responsive layout, motion, reduced-motion support |
| `app.js` | Sign-in demo, mega menus, drawer, carousel, reveal observer, footer accordions |
| `favicon.svg` | Original octagonal brand mark |
| `scripts/validate.js` | Build validation (plain Node, no dependencies) |
| `fonts/open-sans.woff2` | Self-hosted Open Sans variable font (400–800) |
| `images/` | Original generated marketing imagery (optimized JPEG) |

## Run locally

No build step or package installation is required to view the site:

```bash
python -m http.server 8080
# open http://localhost:8080
```

## Validate / build

```bash
npm run build   # alias: npm test — runs scripts/validate.js
```

The validation must pass with **0 errors** before the project is considered shippable.

## Deploy

Deploy the repository root as a static site (GitHub Pages, Netlify, Cloudflare Pages). All asset paths are relative, so it works at a domain root or a sub-path.
