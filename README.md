# Harborline banking UI prototype

A responsive, static front-end experience exploring personal banking, business services, card comparisons, a loan payment estimator, support content, and a mobile-friendly navigation system.

## Files

- `index.html` — page structure, content, metadata and accessible navigation landmarks.
- `styles.css` — responsive layout, components, visual system and reduced-motion support.
- `app.js` — product filters, card filters, business needs selector, loan estimator and informational dialogs.
- `favicon.svg` — original Harborline brand icon.

## Run locally

No build step or package installation is required. Serve this directory with any static web server, or open `index.html` directly in a modern browser.

For example, with Python installed:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Important scope and safety

Harborline is a fictional demonstration brand, not a bank and not affiliated with Chase or JPMorgan Chase. Product terms and figures are illustrative. This static site has no backend, real authentication, account opening, payment processing, or connection to financial accounts. Do not enter real credentials or financial information.

## Deployment

Deploy the repository root as a static site on a host such as GitHub Pages, Netlify, or Cloudflare Pages. The site uses relative asset paths, so it can be hosted at a domain root or under a repository path.
