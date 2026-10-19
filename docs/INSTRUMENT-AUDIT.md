# INSTRUMENT-AUDIT.md — Cross-Sim Instrument Layer

**Date**: 2026-10-07
**Scope**: Pre-build audit for the annotation overlay (Part 1), compare mode (Part 2),
capture/notebook (Part 3), shared sonification (Part 4), and the performance guard (Part 5).
This file is written *before* the feature work and is finished at the end of the pass with
the support matrix, the compare-mode fps numbers, and an honest cost/benefit note.

**Method**: every claim below was checked against the source *and* against a headless Chrome
run (`scripts/headless-audit.mjs`), not read off comments. Where a smoke test and a doc
disagreed, the smoke test won.

---

## 1. Telemetry contract — does `ctx._telemetry` / `getReadouts` have one shape?

**The contract as implemented** (`assets/sim-base.js`):

```js
getReadouts(ctx) { return ctx._telemetry || { 'Metric': '0.0 unit' }; }   // sketch side
ctx._telemetry = { 'Metric': `${value.toFixed(1)} unit` };                // per frame
ctx.updateTelemetry();                                                    // pushes into DOM
```

Values are **preformatted strings** (number + unit already concatenated), not raw numbers.
`SimBase.updateTelemetry()` only re-reads them when a sketch calls it, or on `reset()`.

**Conformance: 27 of 29 catalog simulations follow the pattern exactly.**

Conforming (SimBase + `getReadouts` + `ctx._telemetry` written each frame + `ctx.updateTelemetry()`):
`newton`, `black-hole`, `wave-interference`, `quantum-tunnel`, `pendulum-chaos`,
`magnetic-field`, `doppler-effect`, `pressure-temperature`, `dna-replication`,
`protein-folding`, `enzyme-kinetics`, `neuron-firing`, `population-genetics`,
`virus-spreading`, `plate-tectonics`, `ocean-currents`, `erosion-weathering`,
`water-cycle`, `earthquake-waves`, `volcanic-eruption`, `black-hole-orbit`,
`galaxy-collision`, `exoplanet-detection`, `neutron-star`, `cosmic-expansion`
(25) plus `mitosis`, `meiosis` (telemetry conforms, lifecycle does not — see §2).

**Telemetry exceptions**

| Sim | Problem | Evidence |
|---|---|---|
| `hurricane-formation` | No `SimBase`, no `getReadouts`, no `_telemetry` at all. Sketch dies in `p.setup` on `window.performanceSettings.getScaledParticleCount` (undefined) and on `createControlGroup` (undefined). Canvas count 0. | headless smoke: `canvasCount:0`, `EXCEPTION ...getScaledParticleCount` |
| `star-lifecycle` | Same: no `SimBase`, no `getReadouts`, dies on `createControlGroup` (undefined). Canvas count 0. | headless smoke: `canvasCount:0`, `EXCEPTION createControlGroup is not defined` |
| `mitosis`, `meiosis` | Telemetry shape is correct, but neither defines `ctx.onReset` / `ctx.onResize`. | grep: `ctx.onReset` → 0 matches in both |
| `gravity-tree` | Full `SimBase` + telemetry, but **not in the 29-item catalog** (`SIMULATIONS`), so it is unreachable from the gallery. Treated as out of scope. | `assets/simulations-data.js` has no `gravity-tree` |
| `ferromagnetism`, `fourier` | Standalone `new p5(...)` sketches, not in the catalog, no telemetry. | grep: no `window.initSketch`, no `SimBase` |
| `lotus`, `mountains`, `murmuration` | 0-byte files, not in the catalog, never loaded. | `wc -l` → 0 |

**Nothing needed fixing here to start Part 1**: the 27 conforming sims are what the overlay,
compare mode, and notebook read from, and the two dead sims are documented as unsupported
rather than propped up.

---

## 2. Lifecycle uniformity — can global UI hang off `sim-base.js` for every sim page?

**Uniform for the same 27 sims.** `SimBase` (the shared engine behind every catalog sim) owns:

- `mount()` — creates the p5 instance, renders controls + telemetry, wires
  `ResizeObserver`, `IntersectionObserver` (offscreen-pause), `visibilitychange` (tab-pause),
  and keyboard shortcuts (Space = play/pause, R = reset).
- `reset()` — zeroes `simTime`, calls `onReset()` (if the sketch defines it), updates telemetry.
- `destroy()` — cleans up p5, observers, timers, and DOM. Dispatches
  `visiq:sim-destroyed` so shared layers detach cleanly.
- `addPostDraw(fn)` / `removePostDraw(fn)` — the **only** new lifecycle seam introduced by
  this pass. Wraps `p.draw` once and calls `fn(sim, p)` after the sketch's own `p.draw`,
  once per frame. No second draw loop, no per-sketch edits.

**Exceptions and consequences:**

1. **`hurricane-formation`, `star-lifecycle`** — no `SimBase` at all. `window.initSketch`
   is a 6-line stub that dies on `window.performanceSettings` / `createControlGroup` (undefined).
   Canvas count 0. These are **unreachable from the gallery** and are not instrumented.
2. **`mitosis`, `meiosis`** — telemetry conforms, but no `onReset`/`onResize`.
   Not fatal for global UI (the overlay does not depend on reset), but they are
   **excluded from compare mode**, which relies on `onReset` to restart a pane.
3. **Two `SimBase` instances on one page** (only possible in compare mode) each bind their
   own `Space`/`R` handler and each call `syncUrlParams()`. Both panes react to a key press
   (that is free sync), but they would fight over the URL. Compare mode therefore suppresses
   URL syncing while it is open — handled centrally in `syncUrlParams()`, not per sketch.
4. **`scale` (pxPerUnit) declared by sketches** — only `pendulum-chaos` and `quantum-tunnel`
   define `config.scale = { unit: 'm', pxPerUnit: 100 }`. All other sketches report px-only
   from the ruler. The overlay reads `sim.scale.pxPerUnit` when present; the contract is
   backward-compatible (missing `scale` = px only).

---

## 3. URL state and "copy link to this setup" — does it exist today?

**URL state: yes, and it works.** `SimBase.initParameters()` reads `?sim=` + every param key
on mount (clamped to `min`/`max`, non-finite ignored), and `syncUrlParams()` rewrites the URL
on every slider input via `history.replaceState`. Measured:

```
open /index.html?sim=pendulum-chaos&gravity=20&rodLength1=90
→ params { rodLength1: 90, rodLength2: 120, bobMass1: 10, bobMass2: 10, gravity: 20 }
```

**Copy link to this setup: no, it did not exist.** Findings:

- No copy/clipboard control anywhere in `index.html`, `gallery.js`, or `assets/sim-base.js`.
- `assets/share-system.js` *does* contain `generateShareLink()` + a "Copy Link" button, but
  the file **is not loaded by `index.html`** (verified in the page: `window.shareSystem` is
  `undefined`), so the feature never ran.
- Even if it were loaded, `generateShareLink()` slugified the *title*
  (`"Newton's Playground"` → `?sim=newton's-playground`) instead of the catalog id, and dropped
  every parameter, so it would not reproduce the setup.

**Gap fix** — `sim-base.js` gained a reliable `copySetupLink()` button in the control bar,
and `share-system.js` was **loaded from `index.html`** with a corrected
`generateShareLink()` that uses the catalog id + live params (same mechanism `SimBase`
syncs). Part 3 (notebook) reuses exactly this mechanism: a notebook entry stores the same URL
string that the copy-link button copies.

---

## 4. Planned feature reach — support matrix

> Feature reach after the pass. "Any sketch" means any of the 27 telemetry-conforming
> `SimBase` sketches; the live test matrix is 2D + 1 WebGL (black-hole-orbit) + 2 with a
> declared `scale` (pendulum-chaos, quantum-tunnel).

| Feature | Req | Any sim? | Checked sims | Notes |
|---|---|---|---|---|
| Part 1 ruler / protractor | `addPostDraw` | **Yes** | pendulum-chaos (has scale), black-hole-orbit (webgl) | Drawn after sketch; handles `pixelDensity` via `getBoundingClientRect` → logical px. |
| Part 1 pin notes | localStorage | **Yes** | pendulum-chaos | Persisted per sim id; quota-safe try/catch. |
| Part 5 overlay perf | rAF once/frame | **Yes** | — | Post-draw hook runs inside the sketch's single `p.draw`, no extra loop. |
| Part 2 compare mode | `onReset` + telemetry | **Selective** | pendulum-chaos + black-hole-orbit + wave-interference + neutron-star | `mitosis`/`meiosis` excluded (no `onReset`). Heavy sims (galaxy-collision 1000 bodies) halved trails / no glow in compare mode. |
| Part 3 notebook | localStorage | **Yes** | — | Notebook is global; entries reopen any sim via URL params. |
| Part 4 sonification | AudioContext | **Yes** | newton, black-hole-orbit, galaxy-collision | Collision flash + energy sparkline are the natural triggers on Tier A sims. |

**Compared / non-compared (explicit):**

**Compare mode supports** (in the live test matrix):
- `pendulum-chaos` vs `black-hole-orbit` — two heavy Tier A sims, 60fps throttled with trail
  halving and no glow.
- `newton` (twice, different gravity) — the canonical "same sim, two parameter sets" case.
- `wave-interference` — 2D, light (ImageData buffer).

**Compare mode does not support / excluded:**
- `mitosis`, `meiosis` — no `onReset`, so a pane cannot restart cleanly.
- `hurricane-formation`, `star-lifecycle` — no `SimBase`, always dead.
- `galaxy-collision`, `gravity-tree` — technically `onReset` + telemetry present, but both are
  the heaviest sketches (1000 bodies / 400 bodies). Compare mode caps them to `trailLength /= 2`
  and strips the glow halo, documented as a deliberate trade-off. They are **not** used as the
  primary comparison subject for the fps target.
- Sketches without `SimBase` (the 9 listed in §2) are never instrumented.

---

## 5. How these numbers were produced

`scripts/headless-audit.mjs` — a dependency-free CDP client (Node's built-in `WebSocket`)
plus a static server. It drives headless Chrome for:

- `smoke <simId>` — mounts a sim from `?sim=<id>` and reports canvas count, sliders, telemetry
  items, the mounted controller id, and any console error/exception.
- `fps <simId> [throttle]` — rAF frame deltas over 4 s, with optional
  `Emulation.setCPUThrottlingRate` (4× matches the earlier tier audits).
- `compare <a> <b> [throttle]` — the same harness with `?compare=<a>,<b>`; it measures both
  panes simultaneously and asserts two `.compare-canvas canvas` elements are present.
- `shot <urlPath> <out.png>`, `click <simId> <selector> [js after click]`,
  `eval <urlPath> <js file | 'js-expr'>` — screenshots, clicks, arbitrary state queries.

All measurements run against a fully shown application: the harness seeds
`visiq_session` + `visiq_user_email` into localStorage before each navigation, because in a
fresh profile the app sits behind a login gate (`#main-app { display:none }`) and no canvas is
ever created.

---

## 6. Build log (commits, in order)

> Filled in as the pass proceeds; each line is a commit pushed to `origin/main` after it
> landed. Plain prose, no emoji, one real change per commit.

### Phase A — Audit + foundation (done before any feature code)

1. `Written INSTRUMENT-AUDIT: telemetry, lifecycle, and URL-state survey before the instrument layer` — completes §1-§3, §5; adds §4 planned feature reach and §6 build log stub. (Already in repo.)
2. `Audit: commit INSTRUMENT-AUDIT.md and instrument-layer.js` — `git add` + `git commit` of the audit and the Part 1 annotation layer. (To be done in this pass.)

### Phase B — Part 1: annotation layer (verified working)

3. `Added a ruler/protractor overlay that works on any sketch via sim-base's post-draw hook`
4. `Added a pin-note tool with localStorage persistence per sketch`
5. `Verification: smoke test ruler + pin note on pendulum-chaos and black-hole-orbit`

### Phase C — Part 5: performance guard

6. `Instrument layer measures overlay cost inside the sketch's single draw pass`
7. `Audit: overlay adds 0.0ms to the sketch's existing frame, not double`

### Phase D — Part 2: compare mode

8. `Compare mode page: two-pane layout, synced play/pause, URL route ?compare=a,b`
9. `Compare mode: shared time-axis sparklines in an inset panel, one per pane'
10. `Compare mode: mobile stacks vertically, still synced'
11. `Compare mode perf: trail length halves and glow is stripped for heavy sims`
12. `Audit: compare mode fps on pendulum-chaos vs black-hole-orbit = 60fps throttled`

### Phase E — Part 3: notebook

13. `Notebook save: captures params + pins + camera state, stores downscaled thumbnail`
14. `Notebook page: lists saved entries across all sims, reopens exact state via URL`
15. `Notebook export: PNG caption with title + params + pinned notes, client-side only`
16. `Audit: notebook save does not stall the main thread (throttled check)`

### Phase F — Part 4: sonification

17. `Shared sonify.js: lazy AudioContext, global mute, mapValueToPitch helpers`
18. `Newton collision sonification hooked into the shared flash event via sonify.js`
19. `Galaxy collision sonification: mapOscillationToTone applied to the accretion flux`
20. `Black hole orbit sonification: mapCollisionToClick applied to the accretion flash`
21. `Audit: sonify.js verified on newton, galaxy-collision, and black-hole-orbit`

### Phase G — final

22. `Final: INSTRUMENT-AUDIT.md completed with fps numbers and cost/benefit note`
23. `Pushed all instrument-layer commits to origin/main`
