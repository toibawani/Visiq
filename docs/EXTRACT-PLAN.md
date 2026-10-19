# VISIQ Visual Standard Extraction & Scaling Plan (EXTRACT-PLAN.md)

**Date**: 2026-10-04  
**Authors**: Antigravity Visual & Simulation Engineering  
**Reference Implementations**: `sketches/pendulum-chaos.js`, `sketches/newton.js`  
**Target Module**: `assets/visual-kit.js`  

---

## 1. Specification of Reusable Visual Techniques (From Reference Files)

The visual standard proven in `sketches/pendulum-chaos.js` and `sketches/newton.js` achieves depth, tactile feedback, and high visual appeal without regressing frame rates. Below are the exact equations, parameters, and chrome styles extracted verbatim from both reference files.

### 1.1 `drawFadingTrail(p, trail, [r, g, b], options)`
- **Pendulum Chaos formula**:
  - Alpha: `Math.pow(t, 1.6) * 220` (where `t = i / trail.length`)
  - Stroke Weight: `1.2 + t * 1.2` (scales from 1.2px up to 2.4px at head)
- **Newton Playground formula**:
  - Alpha: `Math.pow(t, 1.8) * 115`
  - Stroke Weight: `1.0 + t * 1.6` (scales from 1.0px up to 2.6px)
- **Extracted Default Spec**:
  - Signature: `drawFadingTrail(p, trail, [r, g, b], { exponent = 1.7, maxAlpha = 200, minWeight = 1.0, maxWeight = 2.4 } = {})`
  - Behavior: Iterates `i = 1 .. trail.length - 1`. If `trail.length < 2`, early returns. Renders per-segment lines with power-curve alpha and weight fade.

### 1.2 `drawGlowBody(p, x, y, radius, [r, g, b], options)`
- **Pendulum Chaos formula**:
  - Outer halo: `fill(r, g, b, 30)`, diameter `(radius + 12) * 2` (approx $1.8 \times$ radius)
  - Inner halo: `fill(r, g, b, 75)`, diameter `(radius + 5) * 2` (approx $1.35 \times$ radius)
  - Core disc: `fill(r, g, b)`, `stroke(7, 9, 15)`, `strokeWeight(2)`, diameter `radius * 2`
  - Specular highlight: `fill(255, 255, 255, 50)`, offset `(-radius * 0.28, -radius * 0.28)`, diameter `radius * 0.52`
- **Newton Playground formula**:
  - Outer halo: `fill(r, g, b, alpha * 1.2)` ($\approx 34$), diameter `radius * 3.6` (radius multiplier 1.8)
  - Inner halo: `fill(r, g, b, alpha * 3.0)` ($\approx 84$), diameter `radius * 2.4` (radius multiplier 1.2)
  - Core disc: `fill(r, g, b)`, `stroke(7, 9, 15)`, `strokeWeight(2)`, diameter `radius * 2`
  - Specular highlight: `fill(255, 255, 255, 52)`, offset `(-radius * 0.28, -radius * 0.28)`, diameter `radius * 0.50`
- **Extracted Default Spec**:
  - Signature: `drawGlowBody(p, x, y, radius, [r, g, b], { outerMult = 1.8, innerMult = 1.3, outerAlpha = 32, innerAlpha = 75, specular = true, strokeWidth = 2, specularAlpha = 52 } = {})`
  - Zero-allocation drawing calls with pre-configured layer stack.

### 1.3 `drawArrow(p, x1, y1, x2, y2, [r, g, b], alpha, weight, headLength)`
- **Newton Playground formula**:
  - Vector length threshold: `if (Math.hypot(x2-x1, y2-y1) < 3) return;`
  - Main shaft: `stroke(r, g, b, a); strokeWeight(wt); line(x1, y1, x2, y2);`
  - Direction: `ang = Math.atan2(dy, dx); h = headLength || 8;`
  - Barb 1: `line(x2, y2, x2 - h*Math.cos(ang - 0.45), y2 - h*Math.sin(ang - 0.45));`
  - Barb 2: `line(x2, y2, x2 - h*Math.cos(ang + 0.45), y2 - h*Math.sin(ang + 0.45));`
- **Extracted Default Spec**:
  - Exact signature and implementation lifted cleanly. Default `alpha = 210`, `weight = 2`, `headLength = 8`.

### 1.4 `drawCollisionFlash(p, flash)` & Flash Manager
- **Newton Playground formula**:
  - Flash event structure: `{ x, y, r, age: 0, maxAge: 24 }`
  - Time decay: `t = 1 - age / maxAge`
  - Expanding outer ring: `stroke(255, 240, 200, t*t * 170); strokeWeight(2.5 * t); circle(x, y, r * (1 + (1 - t) * 1.4) * 2);`
  - Core burst: `stroke(255, 240, 200, t*t * 55); strokeWeight(9 * t); circle(x, y, r * 2 * 0.55);`
- **Extracted Default Spec**:
  - Helper functions: `createCollisionFlash(x, y, radius, maxAge = 24)`
  - Render & Update helper: `drawCollisionFlashes(p, flashesArray)` which updates age, renders both rings, and returns filtered list.

### 1.5 `drawInsetPanel(p, x, y, w, h, title, options)`
- **Pendulum Chaos & Newton Playground styling**:
  - Background: `fill(8, 12, 22, 215)`, corner radius `6` (or `7`)
  - Border: `stroke(35, 48, 70)`, `strokeWeight(1)`, `noFill()`
  - Header Title: `fill(65, 85, 120)` (slate blue), `textSize(8.5)` or `9`, `textAlign(LEFT, TOP)` or `CENTER`
- **Extracted Default Spec**:
  - Signature: `drawInsetPanel(p, x, y, w, h, title, { align = 'left', cornerRadius = 6 } = {})`
  - Standardizes the dark glass panel chrome across every simulation.

### 1.6 `drawSparkline(p, x, y, w, h, history, [r, g, b], options)`
- **Pendulum Chaos & Newton Playground formulas**:
  - Normalization: `min = Math.min(...history)`, `max = Math.max(...history)`, `range = Math.max(Math.abs(max - min), 0.01)`
  - Polyline path: `vertex(x + 5 + (i/(N-1))*(w-10), y + h - 6 - ((val - min)/range)*(h - 16))`
  - Stroke: `stroke(r, g, b, 190); strokeWeight(1.5);`
  - Optional reference baseline: dashed line at target value using `drawingContext.setLineDash([3, 4])`.
- **Extracted Default Spec**:
  - Signature: `drawSparkline(p, x, y, w, h, history, [r, g, b], { label, baseline = null, zeroFloor = false } = {})`

### 1.7 `createDragInertiaTracker(options)`
- **Newton Playground & Pendulum Chaos formula**:
  - Tracks `lastPos = { x, y }`, computes instantaneous release delta `(pos - lastPos) * velocityMultiplier`.
  - Constrains velocity to `[-maxVelocity, maxVelocity]`.
- **Extracted Default Spec**:
  - Provides a clean state tracker for `onPress`, `onDrag`, and `onRelease`.

---

## 2. Triage of Remaining Simulations (33 Files)

Every simulation in `sketches/` (excluding the 2 reference rebuilds `pendulum-chaos.js` and `newton.js`) is categorized and assigned to a tier based on physical structure.

### Tier A (Full Treatment: Glow bodies, fading trails, force/velocity vectors, inset sparkline, drag inertia)
*Simulations with discrete moving bodies, masses, charges, or celestial entities where vector overlays and motion trails communicate the fundamental physics.*

| # | File Name | Catalog Sim ID | Domain | Key Phenomenon & Applied Visual Kit |
|---|-----------|----------------|--------|--------------------------------------|
| 1 | `black-hole-orbit.js` | `black-hole-orbit` | Astronomy | Satellites orbiting central mass; glow bobs, orbital fading trails, velocity + gravitational pull arrows, orbital energy sparkline inset, fling inertia. |
| 2 | `black-hole.js` | `black-hole` | Physics | Accretion matter & photon geodesic bending; glow accretion particles, curved relativistic trails, velocity arrows, event horizon panel. |
| 3 | `magnetic-field.js` | `magnetic-field` | Physics | Charged particles in dipole field; glow charges (+/-), cyclotron helical trails, velocity & Lorentz force $q(\mathbf{v}\times\mathbf{B})$ arrows, kinetic energy sparkline, drag particle. |
| 4 | `pressure-temperature.js` | `pressure-temperature` | Physics | Gas molecules colliding with walls & piston; glow molecules, velocity arrows, collision flashes, chamber pressure sparkline, drag piston/molecules. |
| 5 | `virus-spreading.js` | `virus-spreading` | Biology | Infectious agent dynamics (SIR); glow agents (S=teal, I=amber, R=violet), fading velocity trails, transmission contact flashes, active infection sparkline, drag to fling agents. |
| 6 | `enzyme-kinetics.js` | `enzyme-kinetics` | Biology | Enzyme-substrate lock-and-key collisions; glow enzymes/substrates, binding reaction flashes, product generation sparkline, drag enzymes. |
| 7 | `galaxy-collision.js` | `galaxy-collision` | Astronomy | Galactic disks interacting via gravity; dual galactic core glow bodies, tidal stream trails, velocity arrows, system energy sparkline. |
| 8 | `exoplanet-detection.js` | `exoplanet-detection` | Astronomy | Star-planet transit system; glow star & planet, orbital Keplerian trail, velocity/gravity arrows, transit photometry light curve sparkline inset. |
| 9 | `neutron-star.js` | `neutron-star` | Astronomy | Pulsar relativistic beams and magnetic axis; core glow pulsar, magnetic field loop vectors, beam sweep trail, radiated pulse energy sparkline. |
| 10 | `cosmic-expansion.js` | `cosmic-expansion` | Astronomy | Hubble expansion of galaxy clusters; glow galaxy nodes, expansion recession velocity arrows ($\mathbf{v}=H_0\mathbf{d}$), recession speed sparkline. |

### Tier B (Partial Treatment: Selected Glow, Vectors, or Inset Sparklines)
*Simulations where continuous kinematics, genetic states, or wave packet envelopes benefit from targeted visual elements rather than the full suite.*

| # | File Name | Catalog Sim ID | Domain | Targeted Elements |
|---|-----------|----------------|--------|-------------------|
| 11 | `doppler-effect.js` | `doppler-effect` | Physics | Moving sound emitter glow body, velocity vector arrow, emitted wavefronts, observed frequency sparkline inset. |
| 12 | `quantum-tunnel.js` | `quantum-tunnel` | Physics | Wavepacket probability envelope glow, potential barrier highlight, transmission probability sparkline inset. |
| 13 | `population-genetics.js` | `population-genetics` | Biology | Allele dots glow coloring, generational drift sparkline inset. |
| 14 | `protein-folding.js` | `protein-folding` | Biology | Amino acid residue glow nodes, hydrophobic bonds, conformation energy / RMSD sparkline inset. |
| 15 | `neuron-firing.js` | `neuron-firing` | Biology | Ion particles glow, membrane channel arrows, action potential voltage sparkline inset. |
| 16 | `dna-replication.js` | `dna-replication` | Biology | Helicase / polymerase glow enzymes, base-pair connection highlights, replication rate sparkline inset. |
| 17 | `mitosis.js` | `mitosis` | Biology | Centrosome & chromosome glow bodies, spindle fiber vectors, phase progress sparkline inset. |
| 18 | `meiosis.js` | `meiosis` | Biology | Chromosome glow pairs, recombination crossing-over points, division stage sparkline inset. |
| 19 | `star-lifecycle.js` | `star-lifecycle` | Astronomy | Stellar core glow, thermal equilibrium balance arrows, luminosity / core temperature sparkline inset. |
| 20 | `volcanic-eruption.js` | `volcanic-eruption` | Geography | Ejected tephra / lava glow particles, ballistic trails, chamber pressure sparkline inset. |
| 21 | `water-cycle.js` | `water-cycle` | Geography | Atmospheric vapor / rain glow particles, evaporation velocity vectors, precipitation rate sparkline inset. |
| 22 | `gravity-tree.js` | *(Standalone)* | Physics | Barnes-Hut N-body glow nodes, velocity arrows, system virial kinetic/potential energy sparkline inset. |

### Tier C (Field/Grid/Continuum Treatment: Clean Readout Insets & High-Contrast Palettes)
*Continuous field and cellular simulations where particle trails or point glows are physically inappropriate; upgraded with consistent inset telemetry chrome and refined color ramps.*

| # | File Name | Catalog Sim ID | Domain | Refined Field Treatment |
|---|-----------|----------------|--------|--------------------------|
| 23 | `wave-interference.js` | `wave-interference` | Physics | Fast ImageData buffer (60fps); standardized inset panel with live interference amplitude sparkline + node count. |
| 24 | `plate-tectonics.js` | `plate-tectonics` | Geography | Mantle convection cells and tectonic plates; standardized inset panel with tectonic strain / rift velocity sparkline. |
| 25 | `ocean-currents.js` | `ocean-currents` | Geography | Gyre streamline vectors, standardized inset panel with transport flux sparkline. |
| 26 | `hurricane-formation.js` | `hurricane-formation` | Geography | Vortex wind field; standardized inset panel with central barometric pressure sparkline. |
| 27 | `earthquake-waves.js` | `earthquake-waves` | Geography | P-wave and S-wave wavefronts; seismograph waveform inset panel using `drawSparkline`. |
| 28 | `erosion-weathering.js` | `erosion-weathering` | Geography | Elevation contour gradient; standardized inset panel with sediment transport volume sparkline. |
| 29 | `ferromagnetism.js` | *(Standalone)* | Physics | 2D Ising spin lattice; standardized inset panel with net magnetization / temperature sparkline. |
| 30 | `fourier.js` | *(Standalone)* | Physics | Epicycles and synthesized wave; standardized inset panel with harmonic power spectrum sparkline. |

*(Note: `lotus.js`, `mountains.js`, and `murmuration.js` are empty 0-byte uncataloged files and are omitted from simulation runtime).*

---

## 3. Implementation Milestones

1. **Part 1: `assets/visual-kit.js` extraction**
   - Create `assets/visual-kit.js` with all 7 parameterized functions.
   - Register script in `index.html`.
   - Refactor `sketches/pendulum-chaos.js` and `sketches/newton.js` to consume `VisualKit`.
   - Verify zero visual regression and verify 60fps throttled runtime.
   - Commit extraction and reference updates separately.
2. **Part 2 & 3: Tier A Sweep**
   - Progressively upgrade each Tier A simulation with its own commit and push.
   - Measure 4× throttled FPS and verify $\ge 50$ FPS.
3. **Part 4: Tier B & Tier C Sweep**
   - Upgrade Tier B with selected glow/sparkline/arrows.
   - Upgrade Tier C with standard inset chrome & sparkline field telemetry.
4. **Part 5: Cross-App Consistency Pass**
   - Verify category accent colors via CSS custom properties.
   - Standardize bottom canvas caption text across all Tier A/B sketches.
   - Final audit table in `EXTRACT-PLAN.md`.

---

## 4. Final Performance & Upgrade Verification Table

*(Will be populated with live benchmark data as each tier is completed).*
