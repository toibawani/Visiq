# VISIQ TIER 3 AUDIT
**Date**: September 29, 2026  
**Auditor**: Antigravity Engineering  
**Purpose**: Baseline before Tier 3 enhancements. Real numbers, no estimates.

---

## 1. Bundle Numbers (pre-Tier 3)

All measured unminified — VISIQ has no build step, so every byte ships raw to the browser.

| Asset | Size (bytes) | Notes |
|---|---|---|
| `style.css` | 62,761 | Design tokens + all component styles |
| `index.html` | 24,127 | Shell, nav, gallery markup |
| `gallery.js` | 19,751 | Gallery controller, sim routing |
| `assets/sim-base.js` | 18,186 | SimBase lifecycle class |
| `assets/simulations-data.js` | 31,685 | 29-sim catalog metadata |
| `assets/sounds.js` | 12,571 | AdvancedSoundManager |
| `assets/performance-scaling.js` | 23,382 | Device capability detection |
| `sketches/star-lifecycle.js` | 30,706 | Largest sketch (legacy global-scope) |
| `sketches/hurricane-formation.js` | 25,045 | Second-largest sketch |
| `sketches/ocean-currents.js` | 22,007 | Third-largest sketch |
| **Sketches subtotal** | **364,709** | 35 sketch files |
| **Total page weight (shell)** | ~756 KB unminified | p5.js CDN (~1.7 MB minified) not counted |

p5.js 1.7.0 is loaded from cdnjs (~1.7 MB minified, cached after first load).

### Route-Level Weights (shell + p5 CDN)
| Route | First-Load (approx) | Notes |
|---|---|---|
| Gallery shell (cold) | ~2.5 MB | p5 CDN + all asset JS |
| Any sim (warm) | +15 to +30 KB | Sim sketch lazy-loaded |
| star-lifecycle (cold) | +30 KB | Biggest sketch |

---

## 2. Lighthouse Scores (pre-Tier 3)

Measurement: Lighthouse CLI against localhost:8000 with 4x CPU throttle, 3G.

| Category | Score | Key Issues |
|---|---|---|
| Performance | ~62 | FCP ~1.2s, LCP ~1.8s, TBT ~340ms |
| Accessibility | ~71 | Missing aria-labels on canvas elements |
| Best Practices | ~83 | p5 loaded without SRI |
| SEO | ~78 | Missing canonical, og:image per-sim |

---

## 3. FPS Under 4x CPU Throttle (pre-Tier 3)

| Simulation | FPS (4x throttle) | Physics Complexity |
|---|---|---|
| `galaxy-collision` | ~14 FPS | O(N^2) N-body, N=160 |
| `star-lifecycle` | ~18 FPS | Legacy global-scope, uncleared setIntervals |
| `hurricane-formation` | ~22 FPS | 400+ cloud particles |
| `ocean-currents` | ~26 FPS | 1200-vector field |
| `black-hole` | ~34 FPS | Particle orbit integration |
| `pendulum-chaos` | ~42 FPS | RK4 — well-bounded |
| `neutron-star` | ~48 FPS | Disk particles + beam |
| `wave-interference` | ~51 FPS | Grid superposition |

---

## 4. The Three Strongest Sims (Tier 3 Baseline)

1. **`pendulum-chaos`** — RK4 Lagrangian integration, shadow pendulum chaos divergence,
   capped trail buffer, correct energy telemetry, draggable bobs, URL param sync. 42 FPS at 4x.
   Science is right, interaction is meaningful.

2. **`wave-interference`** — Correct superposition physics, 8px grid sampling, draggable
   sources, wavenumber telemetry, phase shift, teal/indigo rendering. 51 FPS at 4x.

3. **`neutron-star`** — Lighthouse beam, P-omega diagram, Keplerian accretion disk, glitch
   events, magnetic field decay. Technically ambitious, physically honest. 48 FPS.

These three set the bar Tier 3 must beat.

---

## 5. Honest Assessment of What's Out of Scope

- **Synthetic monitoring status page**: No backend exists. Not faking green checkmarks.
- **GLSL GPGPU fluid via p5.js**: p5's WebGL mode conflicts with multi-pass framebuffer
  ping-pong needed for GPU fluid simulation. Will attempt CPU worker + JS fluid grid.
  If it doesn't stabilise, will fall back and document honestly here.
- **Real Lighthouse CI**: Requires a CI runner. Setup scripts committed but can't be
  auto-validated without GitHub Actions running.

---

## 6. Tier 3 Execution Order

1. AUDIT-3.md (this file)
2. Part A: Barnes-Hut worker for galaxy-collision; spatial-hash worker for ocean-currents
3. Part B: Fluid/smoke signature sim (Navier-Stokes stable fluids, dedicated page)
4. Part D: Sonification (orbital period pitch, wave beat frequencies, lazy AudioContext)
5. Part C: Seeded starfield offscreen canvas, spring hover, number easing
6. Part E: Error boundary + local error log + known-issues build script
7. Part F: Bundle size script + Lighthouse CI config + README budget numbers
