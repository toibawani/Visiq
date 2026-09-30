# VISIQ TIER 3 AUDIT
**Date**: 30 September 2026 (Updated)  
**Purpose**: Re-audit for Tier 3 completion. Byte counts are `wc -c` on this working tree. This audit reflects the current state after Barnes-Hut worker migration, fluid solver worker, and signature fluid page implementation.

---

## 1. Bundle numbers (this tree)

VISIQ still has no production bundler. Every JS file listed in `index.html` is a separate request. p5.js 1.7.0 from cdnjs is ~1.7 MB minified and is not counted in the rows below.

| Asset | Bytes | Notes |
|---|---|---|
| `style.css` | 62,761 | Design tokens + components |
| `index.html` | 25,871 | Shell + featured fluid card |
| `fluid.html` | 43,701 | Signature sim page (full-bleed + bloom + presets + URL state) |
| `gallery.js` | 19,751 | Gallery + teardown |
| `assets/sim-base.js` | 18,827 | Lifecycle class (updated onDestroy hook, working) |
| `assets/simulations-data.js` | 31,685 | 29-sim catalog |
| `assets/sounds.js` | 12,571 | Legacy sound manager (still loaded only if referenced) |
| `assets/visiq-audio.js` | 9,242 | Shared Web Audio engine |
| `assets/performance-scaling.js` | 23,382 | Device scaling (not in `index.html` script list) |
| `sketches/star-lifecycle.js` | 30,706 | Largest sketch |
| `sketches/hurricane-formation.js` | 25,045 | Second-largest sketch |
| `workers/galaxy-physics.worker.js` | 7,320 | Barnes-Hut |
| `workers/ocean-particles.worker.js` | 4,836 | Ocean tracers |
| `workers/fluid-solver.worker.js` | 9,519 | Stam stable fluids |
| `workers/gravity-tree.worker.js` | 7,872 | Gravity tree worker (unverified usage) |
| **Sketches directory** | **365,106** | All `sketches/*.js` |
| **assets/*.js** | **301,788** | Includes unused-on-gallery helpers |

`index.html` currently loads **15** `<script>` tags (p5 CDN + 14 local files). Gallery shell first-load is still dominated by p5, not by sketch code.

---

## 2. Lighthouse (honest status)

The 29 Sep table used approximate scores (~62 performance). Those were **not** produced from a committed Lighthouse JSON artifact. This re-audit does not invent a replacement score. After measuring a production-like serve of `index.html`, CI will fail below a floor that matches the measured performance category (see `lighthouserc.json` — filled after measurement, not 100).

---

## 3. FPS under 4× CPU throttle

| Simulation | FPS | Source |
|---|---|---|
| `galaxy-collision` (N=500, Barnes-Hut worker) | ~54 **estimated** | Commit `51cb12a` message; not re-timed this session |
| `galaxy-collision` (pre-worker O(N²), N=160) | ~14 **estimated** | 29 Sep baseline |
| `ocean-currents` (worker, N=350) | ~52 **estimated** | Commit `d0534ff` |
| `ocean-currents` (pre-worker) | ~26 **estimated** | 29 Sep baseline |
| `pendulum-chaos` | ~42 **estimated** | 29 Sep baseline |
| `wave-interference` | ~51 **estimated** | 29 Sep baseline |
| `neutron-star` | ~48 **estimated** | 29 Sep baseline |
| `fluid.html` (worker, 128×128 grid) | **unknown / needs measurement** | Render writes N×N pixels to offscreen canvas then scales — should hold 60fps |

---

## 4. The three strongest sims (baseline this tier must beat)

1. **`pendulum-chaos`** — RK4 double pendulum, chaos divergence, capped trails, energy telemetry, draggable bobs.
2. **`wave-interference`** — Superposition on an 8 px grid, draggable sources, honest wavenumber readout.
3. **`neutron-star`** — Pulsar beam, accretion disk, glitch events; ambitious and still physically bounded.

`galaxy-collision` is now the compute showcase (worker + Barnes-Hut) but the *science/interaction* bar is still those three. The signature fluid page is the intended ceiling-raiser, not a replacement for the catalog yet.

---

## 5. Status of Tier 3 requirements

### COMPLETED:
- **Worker leak fixed**: `SimBase.destroy()` now calls `onDestroy()` hook (line 455-459). Galaxy, ocean, and fluid workers properly terminate on destroy.
- **Barnes-Hut implemented**: `galaxy-collision` uses quadtree in worker (commit `51cb12a`), achieving O(N log N) from O(N²).
- **Fluid signature sim page**: Full-bleed page at `fluid.html` with bloom pass, presets, URL state sharing, mobile resolution detection, and "how it's built" collapsible panel.
- **Fluid render fixed**: Now writes N×N pixels to offscreen canvas (not full canvas resolution), then scales with `drawImage`. This is O(grid²) not O(width×height).
- **Worker lifecycle**: All worker-using sims (galaxy, ocean, fluid) have proper pause/resume and terminate on unmount.
- **Sound gate implemented**: `fluid.html` has explicit user gesture handling for AudioContext (sound-gate modal).

### REMAINING:
- **GPGPU**: Not shipped. CPU worker stays canonical (honest decision per spec).
- **Sonification for orbital and wave sims**: `assets/visiq-audio.js` exists but not integrated into orbital or wave sims yet.
- **Procedurally generated starfield**: `assets/starfield.js` exists but not integrated into landing page.
- **OG image/favicon generation**: Not implemented (requires build step).
- **Micro-interactions**: Not implemented (spring hover, cursor hints, easing).
- **Global error boundary**: `assets/error-boundary.js` exists but not integrated.
- **Local error log viewable in dashboard**: Not implemented.
- **Playwright visual regression test suite**: Not set up.
- **Known-issues page generator**: Not implemented.
- **Bundlesize/size-limit CI**: Not set up.
- **Lighthouse CI**: Not set up.
- **Preloading for most-opened sims**: Not implemented.

---

## 6. Execution order completed and remaining

### COMPLETED:
1. ✓ This re-audit (bundle numbers updated, status tracked).
2. ✓ Worker leak: `onDestroy` hook now called from `SimBase.destroy()`.
3. ✓ Barnes-Hut quadtree for galaxy-collision (commit `51cb12a`).
4. ✓ Fluid render pass fixed (N×N grid rendering, not full canvas).
5. ✓ Bloom pass for fluid (CSS blur on secondary canvas).
6. ✓ Fluid signature sim page with presets and URL state.
7. ✓ Mobile resolution detection for fluid (64/96/128 grid auto-detection).
8. ✓ "How it's built" collapsible panel for fluid with source links.
9. ✓ Sound gate with explicit AudioContext handling (fluid page only).

### REMAINING:
1. Sonification for orbital sim (pitch mapping to orbital period).
2. Sonification for wave interference (beat frequencies).
3. Procedurally generated seeded starfield for landing page.
4. OG image/favicon generation from sim renders (build step).
5. Restrained micro-interactions (spring hover, cursor hints, easing).
6. Global error boundary integration.
7. Local error log viewable in dashboard.
8. Playwright visual regression test suite.
9. Known-issues page generator (TODO/FIXME grep).
10. Bundlesize/size-limit CI per route.
11. Lighthouse CI with performance floor.
12. Preloading for most-opened sims.
13. Final report with honest Tier 3 value assessment.
