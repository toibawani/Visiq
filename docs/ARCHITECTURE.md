# VISIQ Architecture

One Mermaid diagram covers the whole stack: the catalog source of truth, the
SimBase mount/destroy lifecycle, script and three.js loaders, 3D boot, and the
web workers.

```mermaid
flowchart TD
    classDef default fill:#07090e,stroke:#e8a04c,color:#e8eaed,stroke-width:1px
    classDef data fill:#1a1f2e,stroke:#e8a04c,color:#e8eaed
    classDef lifecycle fill:#1f2d3d,stroke:#3fb959,color:#e8eaed
    classDef loader fill:#2d2d2d,stroke:#4da6ff,color:#e8eaed
    classDef worker fill:#2d1b1e,stroke:#d73a49,color:#e8eaed

    SIMULATIONS[("assets/simulations-data.js<br/>single source of truth<br/>31 entries, read at load time")]:::data
    GALLERY[gallery.js<br/>render grid, search, filters,<br/>sorting, favorites]:::loader
    SIMBASE[assets/sim-base.js<br/>SimBase mount / destroy<br/>URL params, teardown,<br/>leak tracking]:::lifecycle
    SKETCH[sketches/<id>.js<br/>p5 instance mode sketch<br/>window.initSketch contract]:::loader
    THREE[assets/vendor/three/<br/>three.js 0.186.1 vendored<br/>dynamic import per 3D sim]:::loader
    WORKER1[workers/gravity-tree.worker.js]:::worker
    WORKER2[workers/galaxy-physics.worker.js]:::worker
    WORKER3[workers/ocean-particles.worker.js]:::worker
    WORKER4[workers/fluid-solver.worker.js]:::worker
    CANVAS[(<canvas><br/>one WebGL context<br/>per 3D page)]:::lifecycle

    SIMULATIONS --> GALLERY
    GALLERY --> SKETCH
    SKETCH --> SIMBASE
    SIMBASE --> CANVAS
    SKETCH --> THREE
    THREE --> CANVAS
    WORKER1 --> SKETCH
    WORKER2 --> SKETCH
    WORKER3 --> SKETCH
    WORKER4 --> SKETCH

    linkStyle default stroke:#334155,stroke-width:1px
```

## How the pieces connect

- **Catalog.** `assets/simulations-data.js` is a classic script that attaches
  `window.SIMULATIONS`. The gallery reads it at load time and renders one card
  per entry. Any count on the site comes from this array, never hand-typed.
- **SimBase lifecycle.** Each sketch returns an object with `destroy()` from
  `window.initSketch(...)`. `SimBase.destroy()` disconnects observers, clears
  timers, removes the p5 instance, and wipes the canvas and controls containers.
  The 20 open-close leak test exercises this path.
- **Loaders.** p5.js arrives from cdnjs via a script tag in `index.html`.
  three.js is vendored at `assets/vendor/three/` and fetched by dynamic
  `import()` only inside a 3D sketch, so the gallery never pays its 417 KB
  gzip cost.
- **3D boot.** A 3D sketch imports three.js, builds a scene/canvas, runs one
  WebGL2 context per page, and falls back to a plain note if WebGL2 is missing.
- **Workers.** Gravity tree, galaxy collision, ocean particles, and fluid
  solver each run in a dedicated worker, keeping the main thread free for
  rendering and interaction.

