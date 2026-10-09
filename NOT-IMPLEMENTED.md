# NOT IMPLEMENTED — honest status

This file lists product-plan features that are **not** built in this repo. It
exists so nothing claims to be done that isn't. (Written 2026-10-09.)

## Context: which product plan?

Several requested items belong to a **different application** ("Calculam" — a
calculator with a Command Center, a paper-tape, receipt export, an AI
interpretation endpoint, Indian digit grouping / number words). This repo is
**VISIQ**, a static p5.js science-simulation gallery. There is no calculator,
no tape, and no AI endpoint here, so those items are listed as N/A, not
"planned."

## Not implemented in VISIQ

| Feature | Status | Note |
| --- | --- | --- |
| Global time scrubbing (drag a timeline across all sims) | **Not implemented** | Only one sketch (mitosis) has a stage slider. `pendulum-chaos.js` has a Fork-the-Timeline ghost, not a scrub bar. |
| Variable sliders (generic parameter sliders on every sim) | **Not implemented** | Some sims expose their own controls; there is no shared slider system. |
| "Time travel" (snapshot/restore of sim state) | **Not implemented** | Fork-the-Timeline in the double pendulum is a divergence overlay, not a state rewind. |
| Indian digit grouping (lakh/crore) & number words | **N/A** | No numeric text formatting surface that needs it. |
| Receipt export | **N/A** | No calculator / tape. |
| AI interpretation endpoint | **N/A** | No server; no `/api`; static site only. |
| Tape-first layout redesign | **N/A** | No tape. |

## Implemented this session (real, test-backed)

- Font subset rebuild (`scripts/subset-fonts.py`) adding `π √ ⇄ ‰ ≈ →` where
  each font actually has them; `tests/font-glyphs.test.js` proves the CSS
  `unicode-range` never claims a glyph the shipped `.woff2` lacks.
- `vercel.json` (SPA rewrite excluding `/api/*`) + security headers.
- Real 1200×630 OG/Twitter image, favicon SVG+PNG, PWA manifest, 192/512/
  maskable icons, apple-touch-icon.
- Service worker (`sw.js`) with app-shell precache + offline navigation
  fallback. **Offline not browser-verified — needs a human check.**
- Global error boundary (`assets/error-boundary.js`, vanilla JS — the app is
  not React, so this is the equivalent, not a React `componentDidCatch`).
- CSP / X-Frame-Options / referrer policy via `<meta>` (GitHub Pages can't set
  response headers) and a Netlify-style `_headers` file.

## Explicitly not verified (no browser available)

- Visual rendering of the OG image, icons, and favicon (PNG dimensions were
  checked with sharp; pixels were not inspected by a human).
- Service worker offline behavior end-to-end (code reviewed + syntax-checked
  only).
- CSP not breaking the p5.js CDN load (CSP allows `cdnjs.cloudflare.com`; a
  real browser must confirm no console CSP violations).
