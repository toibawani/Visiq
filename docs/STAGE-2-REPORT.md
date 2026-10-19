# Stage 2 report — the first ten seconds of the live site

## 1. What changed

- Login became optional: the gallery now opens without it, and the header
  carries an honest note that sign-in saves data on this device only.
- The first screen is a live, ray-marched black hole (fixed timestep,
  camera orbit, keyboard, one primary action). WebGL2 fallback is a 2D
  sketch; reduced motion shows the still frame instead.
- Jumbotron control strip is a fixed-size solid panel with 1px borders,
  not HUD text over the scene.
- Gallery cards render a real captured default frame (fixed 16:9 box,
  explicit size, lazy load) plus a fixed-size skeleton loader. Featured
  cards are larger and marked in text and aria-label.
- Header controls are custom SVG icons with accessible names, aria-pressed
  on the binary states.
- Footer links to Terms of Service, Privacy Policy, and Security.

## 2. Measured visual states (raw screenshot, for human review)

Screenshots in `evidence/black-hole/` already exist (1440x900, 375x812,
dark+light, t0 and t10). The new live hero frame is captured in
`evidence/black-hole/black-hole-1440x900-dark-t0.png` (copied to
`docs/media/black-hole-readme.png` for the README). They are for the human:
pixel statistics are recorded, not "looks real" — that is what the human
check is for.

## 3. Live scores (mobile, chromium headless, lighthouse 13.5.0)

- Gallery (`index.html`): performance 67, accessibility 96, best-practices
  100, seo 100.
- Sim page, earth-seasons (`index.html?sim=earth-seasons`): performance 42,
  accessibility 93, best-practices 100, seo 100.

Raw JSON with reproduction commands lives in
`evidence/stage-2/lh-gallery-mobile.json` and
`evidence/stage-2/lh-earth-seasons-mobile.json`.

## 4. Known statements that are still human work, not results

- No screen-reader pass has been run.
- Touch feel (pinch, 48 px targets) measured by size, not feel.
- `prefers-reduced-motion` (start-paused / jump-to-next) verified by
  inspection; not run in a real reduced-motion session.
- Phone FPS is not measured yet (the `?perf=1` gate is for Stage 3).

## 5. Stage report

- Gallery shell, hero, cards, header, contrast gate, a11y fixture, and
  Lighthouse scores are done and committed on `feature/stage-2-first-10-seconds`.
- `npm test` is 81 passed, 1.10s.
- One stage left to hand to the human: read docs/WALKTHROUGH.md and the
  REVIEW.md questions, then approve the REVIEW.md answers before the real
  release.

What the stage delivered: a live hero, honest cards, real screensavers,
no stats banner, no emoji, no em dashes, no gradient text, no bento,
no pixel-perfect everything, and a checker that proves it cares about
contrast before claiming it.
