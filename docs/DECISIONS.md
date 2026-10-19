# VISIQ Design Decisions

Six decisions that shaped this build, each with what would be revisited.

## 1. Vanilla JavaScript, no framework, no bundler

The site is plain HTML, CSS, and ES modules. Node is used only for dev
tooling (Vitest, TypeScript typecheck, font subsetting).

Why. A portfolio site should run by opening `index.html` in any server.
No build step means no surprise breakage between the machine it was built on
and the machine a recruiter opens it on.

What would be revisited. If the gallery grew past a few dozen simulations,
a tiny build step for concatenation might be worth it. Not today.

## 2. p5.js instance mode for every 2D sketch

Each sketch exposes `window.initSketch({containerId, controlsContainerId})`
and an object with `destroy()`. SimBase (`assets/sim-base.js`) owns mount and
destroy.

Why. Instance mode keeps multiple sketches from colliding on globals, and
the mount/destroy contract makes teardown explicit and testable (the 20
open-close leak test).

What would be revisited. Nothing so far; the contract has held through
three 3D rewrites.


## 3. Vendored three.js 0.186.1, loaded only by 3D sketches

three.js is vendored at `assets/vendor/three/` with license, URL, and SHA-384
in `docs/SOURCES.md`. Each 3D sketch imports it by dynamic `import()`, so the
gallery never pays its 417 KB gzip cost.

Why. No runtime CDN for the 3D engine, pinned to a release at least 14 days
old, per the security rules.

What would be revisited. A newer three.js release if AgX tone mapping or a
needed shader feature lands in one.

## 4. Fonts: Fraunces, IBM Plex Sans, JetBrains Mono

Self-hosted as subset .woff2 files. Fraunces for headings, IBM Plex Sans for
UI, JetBrains Mono for readouts. No Inter, no system-ui.

Why. The font pairing is decided and the files are already in the repo.
Inter is the default signal of "AI-generated" and is banned.

What would be revisited. Adding a wider unicode range if simulations need
symbols the subsets do not cover.

## 5. One dominant surface family, one sharp accent, no emoji

Dark obsidian background, warm-amber accent (`#e8a04c`), thin hairline
borders, small instrument-like corner radius, one spacing scale. Custom inline
SVG icons with accessible names. No emoji, no em dashes, no gradients, no
glassmorphism.

Why. The design rules are strict because the site should look like a
scientific instrument, not a portfolio template.

What would be revisited. Adding a second accent color if a category genuinely
needs its own identity that amber does not carry.

## 6. Local-only persistence, no backend

Everything is stored in `localStorage`/`sessionStorage` on the user's device.
No analytics, no telemetry, no third-party cookies. The only third-party
request is p5.js from cdnjs.

Why. A static site cannot run a backend honestly without a server, and the
security rules say not to fake one.

What would be revisited. If cloud saving or accounts are ever added, a real
auth provider with server-side authorization would be required first.

## 7. Known-answer tests before shipping any hero

Every 3D hero ships with tests that state a tolerance: the solar system
against NASA/JPL elements, the black hole against Schwarzschild geometry, the
seasons model against declination and day length at real dates.

Why. A wrong simulation is worse than a missing one, and every number in
`evidence/` has a reproducing command.

What would be revisited. Adding a test for each new hero before it leaves
the backlog.
