# 🌀 VISIQ

> Interactive Science Visualizations · Real-time simulations · Vanilla JS + p5.js

![Status](https://img.shields.io/badge/status-active-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Author](https://img.shields.io/badge/author-toibawani-blueviolet)

## 🎯 What is VISIQ?

**VISIQ** is a static, dependency-light gallery of **29 interactive science
simulations** across four categories: **Physics (8)**, **Biology (8)**,
**Geography (7)**, and **Astronomy (6)**. Each sketch is a real p5.js canvas
rendering an actual physical / biological / geophysical model — not a canned
animation — and responds to pointer, keyboard, and on-screen controls in real
time.

The front end is **vanilla HTML, CSS, and ES modules** (no framework, no build
step). Node is used only for developer tooling: tests (Vitest) and type
checking (`tsc`).

## 🌍 The Simulations

Titles are taken from `assets/simulations-data.js` (the single source of truth).

| Category | Simulations |
|---|---|
| **Physics (8)** | Double Pendulum Chaos · Wave Interference · Quantum Tunneling · Magnetic Field & Lorentz Force · Doppler Effect · Gas Laws & Molecular Motion · Orbital Mechanics & Escape Velocity · Neutron Star & Pulsar Beams |
| **Biology (8)** | Mitosis · Meiosis · DNA Replication · Protein Folding · Enzyme Kinetics · Neuron Action Potential · Population Genetics & Selection · Epidemic Spread (SIR Model) |
| **Geography (7)** | Plate Tectonics & Boundaries · Ocean Currents & Gyres · Hurricane Dynamics · River Erosion & Landforms · The Water Cycle · Earthquake Seismic Waves · Volcanic Eruption Dynamics |
| **Astronomy (6)** | Black Hole Spacetime · Galaxy Collision & Tidal Stripping · Stellar Evolution & Fusion · Exoplanet Transit Photometry · Cosmic Expansion & Hubble Law |

## ✨ Features

These are the features that actually ship in this repository:

- **Gallery** — responsive card grid rendered from `assets/simulations-data.js`,
  with live **search**, **category filters**, and **sorting**.
- **Favorites** — heart any sketch; state is persisted and reflected with a
  correct label and `aria-pressed`. A "favorites only" filter is included.
- **Dark / light theme** — toggle persisted to `localStorage`; every control has
  a stable text label (no emoji-only UI).
- **Shared integrator layer** (`assets/integrators.js`) — a reusable UMD module
  exposing Euler, semi-implicit Euler, Verlet, and RK4. Used by the double
  pendulum and the black-hole orbit sketches.
- **Double Pendulum Chaos** — pick the integrator, watch a live energy-drift
  graph, draw your own guess of the path and see a measured "% off", and fork
  the timeline with a +0.001 rad twin to watch divergence.
- **Black Hole Spacetime** — the same integrator switch plus an orbital
  energy-drift readout.
- **In-page detail modal** for each sketch (long description + controls).

## 🚀 Quick Start

The site is fully static — serve the folder with any web server.

```bash
git clone https://github.com/toibawani/visiq.git
cd visiq
npx live-server        # or: npm start
```

Then open the printed local URL (default `http://localhost:8000`). Any static
server works (`python -m http.server`, `npx http-server`, VS Code Live Server).

## 🧪 Development

```bash
npm install        # install dev tooling
npm test           # Vitest: integrator accuracy, orbital drift, font glyph coverage
npm run typecheck  # tsc --noEmit
```

Tests live in `tests/`:
- `integrators.test.js` — RK4 beats Euler on a harmonic oscillator (drift bounds).
- `orbit-drift.test.js` — Euler's orbital energy drift exceeds RK4's over N steps.
- `font-glyphs.test.js` — every `unicode-range` the CSS claims has a real glyph,
  and required symbols (π √ ≈ → …) route to a font that contains them.

## 📁 Project Structure

```
index.html            Landing / auth page + gallery shell
gallery.js            Renders the simulation grid, search, favorites, filters
style.css             Design system (self-hosted subset fonts, theming)
assets/
  simulations-data.js  The 29 sketches: metadata + descriptions (source of truth)
  sim-base.js          Base class shared by every sketch
  integrators.js       Euler / semi-implicit / Verlet / RK4 (shared, UMD)
  visual-kit.js        Canvas drawing helpers
  ...                  ~60 feature modules (search, theme, stats, audio, …)
sketches/             One file per simulation (p5 sketch)
tests/                Vitest specs
scripts/              Dev tooling (font subsetter, thumbnail capture)
```

## 📄 License

MIT — see [LICENSE](LICENSE).