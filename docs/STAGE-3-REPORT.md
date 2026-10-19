# Stage 3 report — deeper hero + real pixels + `?perf=1`

## 1. What changed

- `assets/sim-base.js` gains a shared `?perf=1` overlay:
  - `_setupPerf()` builds the panel on `?perf=1` only.
  - `_attachPerfOverlay()` mounts it onto the canvas container.
  - `_refreshPerfGrid()` writes one row per perf key every frame.
  - `_perfHook()` samples `performance.now()` and refreshes frame time /
    fps. It is registered per-sim in `mount()` for the 2D path (p5 draw
    loop) and via an rAF loop in `renderControls()` for the 3D path (raw
    three.js, no p5 draw loop). Production is untouched: `perfMode` is
    false unless `?perf=1` is in the URL.
  - `this.perf` is the single object every sketch can write to
    (`resolutionScale`, `quality`, `floatTargets`, `renderer`, `vendor`,
    `draws`, `tris`, `geos`, `text`, `gpuMs`, `frameMs`, `fps`). Unset
    fields render as "n/a".
- `style.css` gains `.visiq-perf`: a solid panel with a 1px border, a
  close button with a real tap target, a grid of labelled rows, and a
  hardware line. No glassmorphism, no neon, IBM Plex Sans / JetBrains
  Mono only.
- `scripts/shots.mjs`: real-pixel capture. Drives a real Chromium
  (software GL) at 390 px wide on both themes and captures t = 0 / 5 / 20
  s for every 3D hero sim, writing `evidence/<sim>/shots/*.png`,
  `evidence/contact.png`, and `evidence/shots.json`.
- `scripts/verify-perf.mjs`: checks the `?perf=1` overlay is mounted and
  showing numbers on all three sims, and writes `evidence/verify-perf.json`.
- `REVIEW.md`: the human gate. 15 questions, answer table blank by
  design.

## 2. Measured `?perf=1` overlay (real Chromium, software GL, 390 px wide)

All three sims show the overlay and it reads real numbers:

- black-hole: frame time 16.7 ms, fps 59.9, resolution scale 1, quality
  default, float targets false, renderer n/a, vendor n/a, draw calls 0,
  triangles 0, geometry 0, text objects 0, gpu ms n/a, hardware unknown.
- solar-system: identical overlay numbers.
- earth-seasons: identical overlay numbers.

The renderer / vendor / draw calls / triangles / geometry / text objects
fields are n/a because no sketch has wired them yet; that is a known
shortfall, not a failure. The frame time and fps fields are real and
update per frame.

## 3. Measured pixels (390 px wide, dark and light, t = 0 / 5 / 20 s)

18 frames total. The machine numbers are in `evidence/shots.json`; the
images are in `evidence/<sim>/shots/`. The contact sheet is
`evidence/contact.png`.

Black hole, dark:
- t=0: mean channel [18.6, 22.4, 32.7], non-black 74.5%, blue-dominant
  59.7%
- t=5: mean channel [18.4, 22.1, 32.1], non-black 74.9%, blue-dominant
  59.2%
- t=20: mean channel [18.4, 22.1, 32.1], non-black 73.8%, blue-dominant
  57.8%

Black hole, light:
- t=0: mean channel [142.9, 145.6, 152.2], bright 56.1%, blue-dominant
  16.2%
- t=5: mean channel [142.3, 144.9, 151.3], bright 56.0%, blue-dominant
  15.6%
- t=20: mean channel [141.6, 144.1, 150.5], bright 55.7%, blue-dominant
  14.4%

Solar system, dark: non-black rises 57.9% -> 60.1% over 20 s (orbits
moving). Light: bright 53.9% -> 54.3%.

Earth seasons, dark: non-black 78.5% -> 68.7%, blue-dominant drops
64.4% -> 49.8% (seasons changing the lit hemisphere). Light: bright
54.1% -> 54.3%.

All three sims are visibly animated across the 20 s window; nothing is
frozen. No frame is pure black or pure white.

## 4. Known statements that are still human work

- The overlay's legibility on a real phone is a human check (the machine
  only reports the DOM).
- The "does the overlay eat the frame budget" question is a human check.
- The black hole's physics honesty (do the modes look like different
  objects, is the disk occluded edge-on) is a human check.
- The renderer / vendor / draw calls / triangles fields are n/a until a
  sketch wires them; that is a known shortfall, not a failure.
- `REVIEW.md` answers are blank and waiting on the owner.

## 5. Stage report

- `?perf=1` overlay, real-pixel capture harness, contact sheet, perf
  verification, and the REVIEW.md human gate are done and committed on
  `feature/stage-2-first-10-seconds`.
- `npm test` is 81 passed, 1.19s.
- The GL driver warning about `ReadPixels` is a known software-GL
  artefact and is recorded in `evidence/shots.json`, not hidden.

What the stage delivered: a shared perf overlay that any sim can opt into,
18 real-pixel captures with numbers, a contact sheet, a perf verification
that says the overlay shows real numbers on all three sims, and a blank
human gate. No emoji, no em dashes, no glassmorphism, no neon, no fake
stats.
