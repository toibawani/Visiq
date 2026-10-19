# VISIQ Stage 4 — rendering standard + performance truth

Status: **done** (branch `feature/stage-2-first-10-seconds`).
Machine evidence: `evidence/verify-perf.json`, `evidence/perf-compare.json`,
`evidence/perf-leak.json`. Human gate: `REVIEW.md` answers still blank.

## 1. What this stage was supposed to do

Stage 3 left the perf overlay reading real frame time and fps and `n/a`
for everything else. Stage 4 closes that gap: the overlay now reports the
GPU the sim is actually running on, and the claim "the overlay does not
eat the frame budget" is now measured instead of asserted.

## 2. The change

`assets/sim-base.js` gained a `perfProbe(config)` hook. It is a method on
the SimBase config object, so the 3D sketches pass it in like `getReadouts`.
`_perfHook` calls it every frame, wrapped in try/catch. A probe that throws
is disabled once and warned to the console, so a broken probe can never
take a sim down.

Each 3D sketch fills its fields from its live three.js `renderer.info`:

| sim | renderer | vendor | draw calls | triangles | geometry | textures | pixel ratio | quality |
|-----|----------|--------|-----------|-----------|----------|----------|-------------|---------|
| black-hole | WebGL2 | unknown | 1 | 2 | 1 | 1 | 1 | auto |
| solar-system | WebGL2 | unknown | 14 | 7,586 | 16 | 10 | 1 | default |
| earth-seasons | WebGL2 | unknown | 6 | 7,496 | 6 | 5 | 1 | default |

`vendor` reads `unknown` because the headless Chromium used by the
verification scripts does not expose a real GPU vendor string. That is a
measurement of the test harness, not a sim defect, and it is stated as
such rather than hidden.

The 2D path (contact, ocean, charged particles, galaxy collision, hydrogen
orbitals) leaves those fields `n/a` by design: it has no three.js renderer
to read.

## 3. The benchmark, contrasted

`scripts/perf-compare.mjs` runs each 3D sim twice, once with `?perf=1` and
once without, and reports the delta. Result: **0 fps, 0%** on all three.

| sim | off fps | on fps | delta | verdict |
|-----|---------|--------|-------|---------|
| black-hole | 60.0 | 60.0 | 0 | ok |
| solar-system | 60.0 | 60.0 | 0 | ok |
| earth-seasons | 60.0 | 60.0 | 0 | ok |

Both runs are capped at 60 fps by the sim's own target, so the number is
already saturated. The meaningful signal is the frame time: every frame
lands at 16.67 ms with zero frames over 25 ms, in both runs. The overlay
is a DOM element drawn on top of the canvas, not a render pass, so it was
never going to touch the WebGL pipeline; the measurement confirms it and
gives the claim a number to point at.

## 4. The leak check

`scripts/perf-leak.mjs` mounts and unmounts each sim 8 times and reads the
live geometry and texture counts at the end of each mount. A leak shows up
as counts that keep climbing across cycles.

Result: **no leak** on any of the three. Geometry and texture counts are
identical on the first and eighth mount, and `destroy()` runs on every
unmount so the next mount starts from a clean DOM.

## 5. What is still a human statement

- The overlay's legibility on a real phone.
- Whether the black hole's modes look like different objects.
- Whether the physics is honest.
- The `vendor` field is `unknown` because the verification harness is
  headless. A real phone will show the real vendor.
- `REVIEW.md` answers are blank and waiting on the owner.
