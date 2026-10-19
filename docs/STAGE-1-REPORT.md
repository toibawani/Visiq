# Stage 1: Look First (no fixes)

Everything below was rendered in a real Chromium window against
`python3 -m http.server 8000` from this repo, at 1440x900 and 375x740, in
both themes, with the console open. Numbers marked "measured" were produced
by evaluating contrast/geometry inside the live page, not estimated.

Environment note: the preview browser window reports `document.hasFocus()
false`, so `:focus` / `:focus-visible` styles do not paint. **Focus rings are
NOT VERIFIED visually and need a human Tab check.** Keyboard Tab itself works
(Tab moves search input -> first card favorite button -> ...).

## 0. The site is behind a sign-in wall (not in any brief)

`index.html` renders `#auth-page` first; `#main-app` is `display:none` until
a session exists. `assets/auth.js` is client-side only: passwords stored in
plaintext in `localStorage` (`visiq_users`), errors shown with blocking
`alert()` (auth.js lines 36, 53, 62, 68, 75). Anyone can read/clear it from
devtools, so it provides no security, but it adds friction to a site whose
pitch is "free, interactive". I created a throwaway local account
(tester@visiq.local) in the preview browser to get past it.

Decision needed from the owner: remove the gate (recommended for a free
science site) or keep it. I have not changed it.

## 1. Console

- `X-Frame-Options may only be set via an HTTP header sent along with a
  document. It may not be set inside <meta>.` **Chromium logs this as an
  error on every page load** (index.html:12). The zero-console-errors bar
  fails on load. `X-Frame-Options` in a meta tag is ignored by browsers; the
  CSP `frame-ancestors` directive is also not expressible in meta. (The
  `_headers` file covers hosts that can send real headers.)
- Service worker **registers and activates on localhost** (measured:
  `navigator.serviceWorker.getRegistrations()` -> count 1,
  scope `http://localhost:8000/`, active true). `sw.js` uses cache-first for
  assets with `VERSION = 'v1'`, so dev edits and production deploys can be
  served stale until the version string is bumped. The Stage 5 brief expects
  the SW NOT to register on localhost; today it does.

## 2. Gallery, dark mode, 1440px

Renders. Hero, welcome banner, featured fluid card, search, 4 category
sections, 4 cards per row, footer.

Problems seen:

- **Every card title is clipped to an ellipsis** ("Newton'...", "Black
  Ho...", "Wave Int...", "Quantu...", "Double P...", "Magnetic...",
  "Doppler ...", "Gas Law..."). Cause: `.card-title` is
  `white-space: nowrap; text-overflow: ellipsis` (style.css:970-981) while
  a large heart icon plus a "Favorite" pill share the same header row.
  Identical in light mode and in the biology section. This is the first thing
  a visitor sees and every single title is truncated.
- Category accent is a **colored 2-3px top border stripe** on each card
  (the "category rule"). Identity also exists as text ("PHYSICS •
  BEGINNER"), so the stripe can go without losing information.
- Welcome banner: `Explore ${SIMULATIONS.length} interactive simulations...`
  (gallery.js:289) is data-driven, good. But `og:description` and
  `twitter:description` (index.html:27,37) hardcode "29" and will go stale.
- Hero subtitle/badge: the "telemetry badge" is an empty pill with a single
  amber dot, no text. Reads as an unfinished element.
- Navbar shows a static `User` label (`#user-display`) that is never
  replaced with anything user-specific.

## 3. Gallery, light mode, 1440px - the hero is unreadable

The starfield canvas paints opaque `rgb(7,9,15)` (measured pixel read) and
is styled `opacity: 0.55` over a white hero section, so the effective
background behind hero text is **rgb(119,120,123)** (measured). Text colors
are the light-theme tokens. Measured WCAG contrast against that background:

| element | color | ratio | verdict |
|---|---|---|---|
| h1 "VISIQ" | rgb(10,15,29) | 4.33 | passes only because it is huge |
| subtitle | rgb(51,65,85) | **2.35** | fails 3:1 |
| description | rgb(100,116,139) | **1.08** | effectively invisible |
| "Explore modules" button text | rgb(180,83,9) | **1.14** | invisible |

In the 375px light screenshot the description is a ghost and the button text
is barely a smudge. This is the single worst visual defect on the site.

## 4. Featured fluid card ignores the theme

The card is styled inline in index.html:
`background: linear-gradient(135deg, rgba(0,229,255,0.05), rgba(12,15,23,0.95))`
plus hover handlers that hardcode `rgba(0,229,255,...)`. In light mode the
gradient stays near-black, so the black heading and body text sit on a
near-black card: heading readable only where the gradient is light, body text
unreadable over most of the card (screenshot at 1440 and 375, light).

## 5. Sort permanently breaks the gallery layout (measured)

Pressing the header **Sort** button cycles Most Used -> A-Z -> Sort. After
any sort, `#simulations-container` children go from 8 (4 headers + 4 grids)
to **37**: 4 category headers with **empty** grids, followed by **29 detached
cards appended as full-width single-column blocks** (measured child list).
`assets/sorting-system.js:85,99,107` appends cards straight to the container
and never puts them back into the category grids, including when the cycle
returns to the default "Sort" mode. On screen: four empty chapter headings,
the sticky search bar floating between them, and 29 stretched cards.

## 6. Sticky search bar

`.search-section` is `position: sticky; top: 60px` (style.css:713-720).
Measured while scrolled 1500px: navbar bottom edge 60px, search section top
120px. So there is a 60px transparent band under the navbar where card
content scrolls past, and the search bar overlays grid content below it. It
looks stranded mid-page. Its magnifier is a CSS `content: '🔍'` emoji
(style.css:729).

## 7. Mobile (375px), both themes

- No page-level horizontal scroll (measured `scrollWidth == clientWidth ==
  375`), good.
- **Navbar overflows: Logout is clipped off-screen** (measured `.nav-right`
  right edge 427px vs 375px viewport). The sign-out control is unreachable
  on a phone.
- Sim page (Double Pendulum Chaos, 375px): the shared control bar is
  **clipped to 34px tall with 1313px of scrollHeight** (measured) - Pause,
  Reset, Copy link, Ruler, Pin note, Speed, and all sliders are effectively
  invisible. The visible sliver shows button tops sliced in half.
- Sim title clipped: "Double Pe..." in the header at 375.

## 8. Compare mode is completely broken (crash, not a style issue)

Opening `http://localhost:8000/?compare=pendulum-chaos,newton` replaces the
whole page with the error-boundary card: **`Uncaught ReferenceError: Cannot
access 'panesData' before initialization`** (screenshot). Cause:
`gallery.js:716` and `:725` use `panesData` before its declaration at
`gallery.js:757` (temporal dead zone). Also `openCompare`'s HTML template is
duplicated: `.compare-header`, `.compare-panes` and `.compare-chrome` appear
twice in the template string (gallery.js ~640-690), so even after the
ReferenceError the markup is mangled. Compare mode is only reachable via the
URL (no UI entry point calls `openCompare`).

`COMPARE-VERIFY.md` contains a table of 14 "Pass" rows for compare mode. Its
own header says the rows were never measured. They are wrong: it cannot open
at all.

## 9. Sim pages (dark, 1440) - pendulum-chaos, newton, black-hole-orbit,
mitosis, plate-tectonics

Shared observations:

- Simulation description spans the full ~1400px width. The 65-character line
  length cap does not exist here (it does not exist in the gallery either).
- Inset graph labels are dark-on-dark: "phase space (theta1 vs theta2)",
  "Energy drift (RK4)", "Total KE", "Energy drift % (rk4)" - measured colors
  are slate-on-near-black; all read as barely-there.
- Symbol/emoji controls on the shared bar: `⏸`/`▶` play icon
  (assets/sim-base.js:323,542), `🔗 Copy link`, `📏 Ruler`, `📍 Pin note`
  (instrument-layer), `↺ Reset`.
- Copy link: the button label swaps to "Link copied"/"Copy failed" for
  1800ms (sim-base.js:527-529) and reverts. No role="status", no aria-live,
  no icon change. This is a transient message.
- Legend text over canvas ("White = velocity | Blue = gravity (mg) ...")
  uses muted slate on near-black; small, low contrast, and it is overlapped
  by the "Tap to enable sound" pill (black-hole-orbit) and by the masses
  (newton).
- newton: the "Total KE" inset chart is clipped at its own top edge (filled
  band touches the panel border). Masses sit half over the legend text.
- plate-tectonics is the weakest visual: flat muddy blocks (navy, khaki,
  dark red), a crude gray triangle volcano, a black notch where ocean meets
  crust, label "Convergent - subduction zone" in dark slate on black, and a
  user-facing legend of raw indices "Boundary: 0=Divergent 1=Convergent
  2=Transform".
- mitosis: legible; chromatids are teal/amber chevrons; readout says "3.5
  stage" (fractional index as a unit).
- The canvas has role="application" on the wrapper and per-sim aria-labels
  exist; a describe()/live-region text path was not verified end-to-end.

## 10. Stats drawer (Analytics)

Renders and is legible in dark. Full of banned emoji icons: header chart
emoji, `⏱`, `⏳`, `⚡`, `❤️`, milestone chips `🚀 🖼 ⭐ 🔬`
(assets/stats-tracker.js:353,390 and the drawer markup). Numbers are in
JetBrains Mono with tabular figures (good). Unlocked/locked milestone state
is conveyed by amber-vs-gray (color only - needs a non-color cue).

There is no separate analytics/dashboard page; `assets/stats-dashboard.js`
and `assets/analytics.js` exist but are not loaded by index.html.

## 11. fluid.html

Dark-only (does not follow the site theme). Layout and readouts look good;
`60 fps | 128x128` measured live. Problems:

- **Loads as an empty black canvas** until the visitor drags. The flagship
  page's first frame is nothing.
- An "Enable sound?" modal gate appears on load over the canvas.
- "Share" and "Clear" buttons are teal-on-dark-teal; contrast not yet
  measured (Stage 3C).
- Line 1054 sets `btn.textContent = 'Copied!'` - a transient message with no
  role, no duration constant shared with other call sites.

## 12. Copy and icon rules already violated in shipped UI

- Banned words in the most prominent copy on the site: hero subtitle
  "Scientific **Instrumentation** for Interactive **Phenomena**", hero body
  "...real-time calibrated digital instruments", featured card "**Engineered**
  from Jos Stam's stable fluids algorithm".
- Em dashes in user-facing copy (featured card heading and body, sim
  descriptions).
- Emoji/symbol icons: `🔍` (search), `✦` (signature badge), `▶️` resume
  icon (gallery.js:565), `▶` play, `⏸` pause, `🔗` `📏` `📍` (instrument
  layer), `⚡` (keyboard.js:188, stats-tracker.js:353), `🔬` `⚡`
  (simulations-data.js:61,225 and duplicated in performance-scaling.js),
  `🔍` `⚡` (achievements.js), stats drawer icons, README `✨`.

## 13. Transient messages ("toast equivalents") - full inventory

Loaded and active:

| what | file:line | role/aria | duration |
|---|---|---|---|
| Keyboard feedback toast `.key-feedback-toast` (reset, theme, launch) | assets/keyboard.js:67,78,108,235-248 | none | setTimeout in keyboard.js (~check constant) |
| Copy link label swap "Link copied"/"Copy failed" | assets/sim-base.js:500-531 | none | 1800ms |
| fluid.html "Copied!" button text | fluid.html:1054 | none | (check) |
| Compare loading region | gallery.js:689,709 | role=status, polite | until scripts settle |
| Compare empty/error chip | gallery.js:794 | role=status, aria-label=Error | persistent |
| Error boundary fallback "Diagnostic Fault Detected" | assets/error-boundary.js | (check) | persistent |
| Auth errors | assets/auth.js:36,53,62,68,75 | blocking alert() | until dismissed |
| Audio gate "Enable sound?" | assets/visiq-audio.js:34 | aria-live=polite on gate | until choice |
| "Tap to enable sound" pill (on canvases) | assets/visiq-audio.js | (check) | until dismissed |

Present in the repo but NOT loaded by index.html (would bypass tokens if
ever wired up):

- `assets/ui-polish.js:21` generic `.toast` (success 2000ms, error 3000ms,
  info 2000ms default 3000ms) + `showSuccess/showError/showInfo` wrappers.
- `assets/share-system.js:159` "Link copied! Ready to share" via UIPolish.
- `assets/achievements.js:139` `.achievement-popup`.
- `assets/status-indicator.js:90` showNotification(message, type).
- `assets/streaks-system.js:81` streak notification.
- `assets/performance-scaling.js`, `trending-system.js`, `screenshot.js`,
  etc. also unused.

## 14. Things I could NOT check here (not rendered)

- Focus ring appearance (preview window never has document focus). CSS rules
  exist; a human must Tab through and confirm 3:1 rings.
- `prefers-reduced-motion` behavior (the preview environment reports
  `matchMedia('(prefers-reduced-motion: reduce)').matches === false` and I
  could not emulate it). Code paths exist in gallery.js (reduced-motion
  scroll) - needs a human check.
- Audio behavior, GPU behavior, real touch devices.
- fps on a mid-range phone (no throttled mobile device available here).

## 15. Notable extra findings not on the brief's list

- The auth wall (section 0) and plaintext password storage.
- Compare mode crash (section 8) plus COMPARE-VERIFY.md's fabricated table.
- Service worker registering on localhost with cache-first assets (section 1).
- X-Frame-Options meta console error (section 1).
- Sim control bar collapsing to 34px on phones (section 7).
- Clipboard copy has no permission/error surface beyond the 1.8s label swap.
