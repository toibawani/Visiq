# Security policy — VISIQ

VISIQ is a static site. There is no database, no user server, and no
backend. These are the static-site equivalents of the usual security rules,
and they are the ones the site actually lives by.

## No secrets

There are no API keys, tokens, signing secrets, or `.env` files in the
repository or in the client bundle. A scan of the working tree and git
history for keys, tokens, and private keys returns nothing.

The one credential-related file is `assets/auth.js`, which is a local-only
authentication demo: it stores email and **plaintext password** in
`localStorage` under `visiq_users`, and the session under `visiq_session` /
`visiq_user_email`. It gates nothing on the open web — every simulation and
the gallery open without logging in. Plaintext password storage is a known
defect and is documented in `docs/AUDIT-FINAL.md`.

## Vendored libraries only

No new runtime CDN scripts and no new runtime npm dependencies are added in
this build. The only third-party runtime fetch is p5.js from
`cdnjs.cloudflare.com` (loaded by `index.html`, allowed by CSP), which
pre-dates this pass.

Vendored code is pinned, at least 14 days old, with license, URL, and SHA in
`docs/SOURCES.md`:

- three.js 0.186.1 (MIT), vendored at `assets/vendor/three/`, published
  2026-09-24, SHA-384 fingerprints recorded in `docs/SOURCES.md`.
- p5.js 1.7.0 from cdnjs (LGPL), loaded by `index.html`.

Dev dependencies (Vitest, live-server, TypeScript, @types/p5) were checked
with `npm audit`: 11 vulnerabilities, all in dev-only transitive deps of
`live-server` (`braces`, `chokidar`, `micromatch`, `decode-uri-component`,
`morgan`, `uuid`). None are in the client bundle.

## Content Security Policy

The CSP is set both as a `<meta>` tag in `index.html` and as a real header
in `_headers` and `vercel.json`:

```
default-src 'self'; img-src 'self' data: blob:; media-src 'self';
font-src 'self' data:; style-src 'self' 'unsafe-inline';
script-src 'self' 'unsafe-inline' 'unsafe-eval'
https://cdnjs.cloudflare.com; connect-src 'self';
frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

`unsafe-inline` is required for the inline theme-resolve script and inline
styles; `unsafe-eval` is required by p5.js's function constructor. Neither
was loosened to make something work — both are pre-existing and documented.
There are no blob workers or wasm modules, so `wasm-unsafe-eval` is not
needed.

## Security headers

Real response headers (via `_headers` / `vercel.json`):

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` (as above)

`Strict-Transport-Security` is not set because the site is hosted on
GitHub Pages, which manages HSTS on its own domains.

## Untrusted input

Everything from URL params, localStorage, share links, and tour/scenario
JSON is treated as untrusted. URL query params are parsed with
`parseFloat`, clamped to `[min, max]`, and `NaN`/non-finite values are
rejected (`assets/sim-base.js`, `initParameters`). Rendering uses
`textContent` only — no `innerHTML`, no `eval`.

## Data stored on the device

All persistence is same-origin `localStorage` / `sessionStorage`. Nothing
is sent to a third-party server. Keys in use:

- `visiq_theme` — chosen theme (dark/light)
- `visiq_muted`, `visiq_audio_muted` — audio mute state
- `visiq_stats` — per-device stats history
- `visiq_users`, `visiq_session`, `visiq_user_email` — local auth demo
  (plaintext passwords — see above)
- per-sim pinned controls, streaks, achievements, onboarding dismissal

No analytics, no telemetry, no fingerprinting, no third-party cookies.

## Third-party requests

The site makes exactly one third-party request: p5.js from cdnjs.
Share links to Twitter/Reddit open only when the user clicks them. No
other external host is contacted.

## Reporting

If you find a security issue, email toibawani14@gmail.com. There is no
bug bounty and no paid response commitment — this is a student portfolio
project, not a service.
