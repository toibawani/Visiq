# VISIQ Simulation Engine Audit (SIM-AUDIT.md)

**Date**: 2026-10-04  
**Auditor**: Antigravity Simulation Engineering  
**Platform**: macOS Apple Silicon, Google Chrome 154 (Headless DevTools Protocol), 4× CPU Throttle  

---

## 1. Inventory & Throttled Performance (4× CPU Throttle)

All 35 files located in `sketches/` were audited. Real frame times and framerates were measured using Chrome DevTools Protocol with `Emulation.setCPUThrottlingRate({ rate: 4 })` under active simulation runtime.

| # | File Name | Catalog Sim ID | p5 Mode | Approx Body / Particle Count | Measured 4× Throttled FPS | Avg Frame Time | Holds 60 FPS? |
|---|-----------|----------------|---------|------------------------------|---------------------------|----------------|---------------|
| 1 | `black-hole-orbit.js` | `black-hole-orbit` | Instance (`SimBase`) | ~120 accretion particles | 60 FPS | 16.44 ms | Yes |
| 2 | `black-hole.js` | `black-hole` | Instance (`SimBase`) | 100 stars + 120 disk particles = 220 | 60 FPS | 16.39 ms | Yes |
| 3 | `cosmic-expansion.js` | `cosmic-expansion` | Instance (`SimBase`) | ~70 galaxies + clusters | 60 FPS | 16.33 ms | Yes |
| 4 | `dna-replication.js` | `dna-replication` | Instance (`SimBase`) | ~30 nucleotide base pairs | 60 FPS | 16.31 ms | Yes |
| 5 | `doppler-effect.js` | `doppler-effect` | Instance (`SimBase`) | ~40 wavefront rings | 60 FPS | 16.59 ms | Yes |
| 6 | `earthquake-waves.js` | `earthquake-waves` | Instance (`SimBase`) | ~80 wave nodes & faults | 60 FPS | 16.60 ms | Yes |
| 7 | `enzyme-kinetics.js` | `enzyme-kinetics` | Instance (`SimBase`) | 12 enzymes, 60 substrates = 72 | 60 FPS | 16.25 ms | Yes |
| 8 | `erosion-weathering.js` | `erosion-weathering` | Instance (`SimBase`) | 120 strata columns, 40 drops | 60 FPS | 16.45 ms | Yes |
| 9 | `exoplanet-detection.js` | `exoplanet-detection` | Instance (`SimBase`) | 1 star + 1 planet + light curve | 60 FPS | 16.49 ms | Yes |
| 10 | `ferromagnetism.js` | *(Standalone)* | Instance (`new p5`) | 400 lattice dipole spins | 60 FPS | 16.40 ms | Yes |
| 11 | `fourier.js` | *(Standalone)* | Instance (`new p5`) | ~15 epicycles + waveform | 60 FPS | 16.38 ms | Yes |
| 12 | `galaxy-collision.js` | `galaxy-collision` | Instance (`SimBase` + Worker) | 500 stars/galaxy (1,000 total) | 60 FPS | 16.50 ms | Yes |
| 13 | `gravity-tree.js` | *(Standalone)* | Instance (`SimBase` + Worker) | 400 bodies (Barnes-Hut) | 60 FPS | 16.42 ms | Yes |
| 14 | `hurricane-formation.js` | `hurricane-formation` | Instance (`new p5`) | ~200 cloud/vortex particles | 60 FPS | 16.61 ms | Yes |
| 15 | `lotus.js` | *(None)* | *(Empty 0 bytes)* | 0 | — | — | N/A (Dead file) |
| 16 | `magnetic-field.js` | `magnetic-field` | Instance (`SimBase`) | ~30 field tracer particles | 60 FPS | 16.24 ms | Yes |
| 17 | `meiosis.js` | `meiosis` | Instance (`SimBase`) | 4 tetrad chromosomes | 60 FPS | 16.37 ms | Yes |
| 18 | `mitosis.js` | `mitosis` | Instance (`SimBase`) | 4 chromosomes + spindle | 60 FPS | 16.33 ms | Yes |
| 19 | `mountains.js` | *(None)* | *(Empty 0 bytes)* | 0 | — | — | N/A (Dead file) |
| 20 | `murmuration.js` | *(None)* | *(Empty 0 bytes)* | 0 | — | — | N/A (Dead file) |
| 21 | `neuron-firing.js` | `neuron-firing` | Instance (`SimBase`) | 1 soma + 30 ion particles | 60 FPS | 16.49 ms | Yes |
| 22 | `neutron-star.js` | `neutron-star` | Instance (`SimBase`) | ~150 relativistic jet particles | 60 FPS | 16.51 ms | Yes |
| 23 | `newton.js` | `newton` | Instance (`SimBase`) | **2 bodies (demo toy)** | 60 FPS | 16.26 ms | Yes (at N=2 only) |
| 24 | `ocean-currents.js` | `ocean-currents` | Instance (`SimBase` + Worker) | 350 tracer particles | 60 FPS | 16.59 ms | Yes |
| 25 | `pendulum-chaos.js` | `pendulum-chaos` | Instance (`SimBase`) | 2 bobs + 2 shadow bobs | 60 FPS | 16.33 ms | Yes |
| 26 | `plate-tectonics.js` | `plate-tectonics` | Instance (`SimBase`) | ~60 convection cells | 60 FPS | 16.41 ms | Yes |
| 27 | `population-genetics.js` | `population-genetics` | Instance (`SimBase`) | 80 allele dots | 60 FPS | 16.29 ms | Yes |
| 28 | `pressure-temperature.js` | `pressure-temperature` | Instance (`SimBase`) | 80 gas molecules | 60 FPS | 16.45 ms | Yes |
| 29 | `protein-folding.js` | `protein-folding` | Instance (`SimBase`) | 24 residues | 60 FPS | 16.14 ms | Yes |
| 30 | `quantum-tunnel.js` | `quantum-tunnel` | Instance (`SimBase`) | 1 wavepacket (120 pts) | 60 FPS | 16.33 ms | Yes |
| 31 | `star-lifecycle.js` | `star-lifecycle` | Instance (`new p5`) | ~150 nebula/core particles | 60 FPS | 16.28 ms | Yes |
| 32 | `virus-spreading.js` | `virus-spreading` | Instance (`SimBase`) | 100 agents | 60 FPS | 16.43 ms | Yes |
| 33 | `volcanic-eruption.js` | `volcanic-eruption` | Instance (`SimBase`) | ~180 ash & lava particles | 60 FPS | 16.34 ms | Yes |
| 34 | `water-cycle.js` | `water-cycle` | Instance (`SimBase`) | ~120 vapor/rain drops | 60 FPS | 16.27 ms | Yes |
| 35 | `wave-interference.js` | `wave-interference` | Instance (`SimBase`) | 3,750 grid cells (75×50) | **31 FPS** | **31.97 ms** | **NO (Drops to 31)** |

---

## 2. Shared Lifecycle Analysis (`sim-base.js`)

### Shared Mount/Destroy Architecture
`assets/sim-base.js` provides a centralized `SimBase` class:
- **Mount Interface**: `sim.mount()`
  - Empties container `#simulation-canvas`.
  - Builds accessible UI toolbar (Play/Pause, Reset, Speed selector `0.25x-2.0x`, custom param sliders with live unit badges, live telemetry readout card).
  - Initializes `p5` in instance mode (`new window.p5(sketch, container)`).
  - Centrally configures `p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2))`.
  - Sets default canvas font: `p.textFont('IBM Plex Sans')`.
  - Instantiates `ResizeObserver` with 50ms debounce and calls optional `ctx.onResize(w, h)`.
  - Registers `visibilitychange` handler to pause `p.noLoop()` when tab is backgrounded.
  - Registers keyboard shortcuts (`Space` = Play/Pause, `KeyR` = Reset).
- **Destroy Interface**: `sim.destroy()`
  - Calls user hook `ctx.onDestroy()` (used to terminate workers, cancel audio nodes, etc.).
  - Disconnects `ResizeObserver`.
  - Removes all registered DOM listeners.
  - Clears all managed `timeouts` and `intervals`.
  - Calls `p5Instance.remove()` and nulls references to avoid memory leaks.
  - Clears containers.

### Offscreen Canvas Pausing (`IntersectionObserver`)
- **Status in Gallery**: `gallery.js` has a `setupCardIntersectionObserver()` which observes `.sim-card-featured` elements in the gallery view. However, when a simulation is active in `#simulation-canvas`, `sim-base.js` does NOT currently attach an `IntersectionObserver` to the simulation container itself when scrolling down the page.
- **Action Required**: Add an `IntersectionObserver` directly inside `SimBase` for its canvas container so that if a user scrolls down to read the simulation notes/questions, the canvas pauses (`noLoop()`) and resumes (`loop()`) on scroll return.

### Consistency Check
- 26 of the 29 canonical simulations strictly implement `new SimBase(...)` and return the instance from `window.initSketch`.
- 3 simulations (`hurricane-formation.js`, `star-lifecycle.js`, and standalone `ferromagnetism.js`, `fourier.js`) instantiate standalone p5 instances without `SimBase`.

---

## 3. Font Gating & Canvas Typography Consistency

- `gallery.js` (lines 340-344) gates the execution of `window.initSketch` behind `document.fonts.ready`:
  ```javascript
  const fontGate = (document.fonts && document.fonts.ready)
      ? document.fonts.ready
      : Promise.resolve();
  fontGate.then(() => { ... window.initSketch(...) });
  ```
- In `sim-base.js`, `p.textFont('IBM Plex Sans')` is called inside `p.setup()` so any sketch mounting via `SimBase` defaults to the self-hosted IBM Plex Sans font.
- Standalone sketches (`hurricane-formation.js`, `star-lifecycle.js`, `ferromagnetism.js`, `fourier.js`) explicitly call `p.textFont('IBM Plex Sans')`, `p.textFont('JetBrains Mono')`, or `p.textFont('Fraunces')`.
- Because `gallery.js` gates `initSketch` behind `document.fonts.ready`, canvas text is consistently prevented from rendering with browser default fallback serif/sans-serif fonts before web fonts are parsed and ready.

---

## 4. O(n²) Pairwise Loops & Scalability Bottlenecks

| Sketch | Mechanism | Loop Pattern | Current Limit | Capped Threshold Before <55 FPS (Throttled) | Recommended Spatial Fix |
|--------|-----------|--------------|---------------|---------------------------------------------|-------------------------|
| `newton.js` | Elastic sphere-sphere collision response | Nested $i$ vs $j$ loops: `for i = 0..N, for j = i+1..N` | 2 bodies | ~25 bodies (~300 collision pairs) | **Uniform Spatial Hash Grid** (grid cell = $2 \times r_{max}$) |
| `wave-interference.js` | Pixel grid calculation & drawing | Double loop over canvas: `75 × 50 = 3,750` `p.rect()` calls/frame | 3,750 rects | Already failing (**31 FPS** on 4× throttle) | **Direct ImageData pixel buffer / Float32Array LUT** or worker offload |
| `virus-spreading.js` | Proximity infection transmission | Nested loop: all infected agents vs all susceptible agents | 100 agents | ~180 agents (~32,000 distance checks) | **Uniform Spatial Hash Grid** |
| `protein-folding.js` | Steric repulsion + hydrophobic attraction | Non-bonded pairwise iteration (4 relaxation sub-steps) | 24 residues | ~36 residues | **Neighbor cell list / spatial hashing** |
| `enzyme-kinetics.js` | Active site substrate & inhibitor binding | Substrates vs enzymes + inhibitors vs enzymes | 72 particles | ~150 particles | Spatial bucket checks |
| `gravity-tree.js` | Self-gravity N-body + mergers | Previously $O(N^2)$ | 400 bodies | Uncapped up to 900 bodies | **Barnes-Hut Quadtree + Hash Mergers (Worker)** *(Already implemented)* |
| `galaxy-collision.js` | Dual galaxy gravitational interaction | Previously $O(N^2)$ | 1,000 stars | Uncapped up to 2,000 stars | **Barnes-Hut Quadtree (Worker)** *(Already implemented)* |

---

## 5. Pedagogical Content Audit: "What to Notice" & Prediction Prompts

| Simulation | Has "What to Notice"? | Has Prediction Prompt? | Current Metadata Present |
|------------|-----------------------|------------------------|--------------------------|
| All 29 Simulations | **NO** (0 / 29) | **NO** (0 / 29) | `description`, `longDescription`, `learningOutcomes`, `tags` |

Currently, none of the simulations have a structured "what to notice" observational paragraph or an active "predict first" prompt hook.
- A prediction prompt system must be established (capturing the user's prediction before running, storing the guess, revealing physical accuracy, and recording stats in `StatsTracker`).

---

## 6. Selection of 3 Sketches for Ground-Up Rebuild

Per user instructions, we select the **3 most impactful sketches** based on audit findings and visitor first impressions:

1. **`newton.js` (Newton's Playground — CH-01 · PHYS #1)**
   - **Reason**: Featured as module #1 in the entire gallery. Currently a 2-body toy demo with naive $O(N^2)$ checks and rudimentary arrows. Rebuilding it with spatial hashing supports 300+ interactive masses, momentum-carrying drag, labeled force/velocity vectors, fading trails, and a live kinetic/potential energy graph.
2. **`pendulum-chaos.js` (Double Pendulum Chaos — CH-01 · PHYS #5)**
   - **Reason**: Prime demonstration of deterministic chaos and nonlinear dynamics. Rebuilding with motion trail ring buffers, phase space/energy live graph, interactive inertia dragging, time control (pause, 0.25×, 0.5×, scrubbing), and an explicit **Chaos Divergence Mode** (two runs with 0.001 rad perturbation overlaid in contrasting theme colors).
3. **`wave-interference.js` (Wave Interference — CH-01 · PHYS #3)**
   - **Reason**: Currently the **only failing sketch** on 4× throttle (31 FPS due to 3,750 `p.rect` draw calls). Rebuilding with direct ImageData buffer / spatial array rendering will yield 60 FPS rock-solid, live intensity strip chart, draggable sources with inertia, and wavefront vector indicators.

---

## 7. Action Plan

- **Step 1**: Commit `SIM-AUDIT.md`.
- **Step 2 (Part 1)**: Performance headroom:
  - Add `IntersectionObserver` canvas pause/resume to `sim-base.js`.
  - Fix performance bottleneck in `wave-interference.js` (ImageData buffer replacement for 3,750 rect calls).
  - Spatial hash grid for particle collisions in `newton.js` and `virus-spreading.js`.
- **Step 3 (Parts 2 & 4)**: Rebuild `newton.js`, `pendulum-chaos.js`, and `wave-interference.js` to gold standard (depth, 10× scale, inertia drag, vectors, live graph, time-scrub, prediction prompts, "what to notice").
- **Step 4 (Part 3)**: Extract shared modules (`SimTrailBuffer`, `SimVectorArrow`, `SimLiveGraph`, `SimTimeControls`, `SimDragTracker`).
- **Step 5**: Final report update and git pushes.
