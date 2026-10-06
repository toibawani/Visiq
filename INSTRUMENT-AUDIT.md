# INSTRUMENT-AUDIT.md — Cross-Sim Instrument Layer

**Date**: 2026-10-06
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
This matters for compare mode: a shared time axis has to `parseFloat()` the leading number
out of the string.

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

**Uniform for the same 27 sims.** `SimBase.mount()` builds the control bar, creates the p5
instance, wires `ResizeObserver` → `onResize`, `IntersectionObserver` → offscreen
`noLoop()`/`loop()` (the performance work), `visibilitychange` → pause/resume, `Space`/`R`
shortcuts, and URL sync. `destroy()` runs `onDestroy`, disconnects both observers, removes
every managed listener/timeout/interval, and removes the p5 instance.

Hooks actually implemented: `onReset` 27/29, `onResize` 27/29, `onDestroy`
(`galaxy-collision`, `gravity-tree`, `ocean-currents`, `black-hole-orbit`,
`wave-interference`), `onPause`/`onResume` (`galaxy-collision`, `gravity-tree`,
`ocean-currents`), `onParamChange` (9 sims).

**Exceptions (with measured behaviour)**

1. **`hurricane-formation`, `star-lifecycle`** — do not define `window.initSketch` and do not
   use `SimBase`. Worse than "unsupported": they leave the *previous* sketch's
   `window.initSketch` in place, so `gallery.loadSketch()` silently mounts the old sim under
   the new title. Measured: open `newton`, then `hurricane-formation` →
   `{"title":"Hurricane Dynamics","controllerId":"newton","canvases":1}`.
   **Fixed in this pass** (see §6) because every feature here attaches to the mounted
   controller and would otherwise attach to the wrong sketch.
2. **`mitosis`, `meiosis`** — no `onReset`/`onResize`, so `Reset` only zeroes `simTime`.
   Not fatal for global UI (the overlay does not depend on reset), but they are **excluded
   from compare mode**, which relies on `onReset` to restart a pane.
3. **Two `SimBase` instances on one page** (only possible in compare mode) each bind their
   own `Space`/`R` handler and each call `syncUrlParams()`. Both panes react to a key press
   (that is free sync), but they would fight over the URL. Compare mode therefore suppresses
   URL syncing while it is open — handled centrally in `syncUrlParams()`, not per sketch.

**There is no post-draw hook today.** Sketches own `p.draw` entirely; nothing runs after it.
Part 1 requires one, so `sim-base.js` gains a hook (`sim.addPostDraw(fn)`) that wraps `p.draw`
once, after `setupFn` returns — a single wrapper call per frame, no second draw loop, and no
per-sketch edits. See §6 for the commit.


---

## 3. URL state and "copy link to this setup" — does it exist today?

**URL state: yes, and it works.** `SimBase.initParameters()` reads `?sim=` + every param key
on mount (clamped to `min`/`max`, non-finite ignored), and `syncUrlParams()` rewrites the URL
on every slider input via `history.replaceState`. Measured:

```
open /index.html?sim=pendulum-chaos&gravity=20&rodLength1=90
→ params { rodLength1: 90, rodLength2: 120, bobMass1: 10, bobMass2: 10, gravity: 20 }
```

**Copy link to this setup: no, it does not exist.** Findings:

- No copy/clipboard control anywhere in `index.html`, `gallery.js`, or `assets/sim-base.js`.
- `assets/share-system.js` *does* contain `generateShareLink()` + a "Copy Link" button, but
  the file **is not loaded by `index.html`** (verified in the page: `window.shareSystem` is
  `undefined`), so the feature never runs.
- Even if it were loaded, `generateShareLink()` slugifies the *title*
  (`"Newton's Playground"` → `?sim=newton's-playground`) instead of the catalog id, and drops
  every parameter, so it would not reproduce the setup.

**Gap fixes (before Part 3 builds on it)** — see the build log in §6 for the commits.

Part 3 (notebook) reuses exactly this mechanism: a notebook entry stores the same URL string
that the copy-link button copies.

---

## 4. Planned feature reach (placeholder — completed at the end of the pass)

Support matrix, compare-mode fps numbers, and the honest "was it worth it" note are appended
in the final commit of this pass. Nothing is claimed here until it has been run.

---

## 5. How these numbers were produced

`scripts/headless-audit.mjs` — a dependency-free CDP client (Node's built-in `WebSocket`)
plus a static server. It drives headless Chrome for:

- `smoke <simId>` — mounts a sim and reports canvas count, sliders, telemetry items, the
  mounted controller id, and any console error/exception.
- `fps <simId> [throttle]` / `compare <a> <b> [throttle]` — rAF frame deltas over 4 s, with
  optional `Emulation.setCPUThrottlingRate` (4× matches the earlier tier audits).
- `shot` / `eval` — screenshots and arbitrary state queries used by the checks above.

---

## 6. Build log (commits, in order)

Filled in as the pass proceeds; each line is a commit that was pushed after it landed.
