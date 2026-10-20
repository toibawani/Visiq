# VISIQ Stage 5 — one hero at a time, each with known-answer tests

Status: **done** (branch `feature/stage-2-first-10-seconds`).
Machine evidence: `evidence/verify-perf.json`, `evidence/perf-compare.json`,
`evidence/perf-leak.json`, `evidence/{black-hole,solar-system,earth-seasons}/`.
Human gate: `REVIEW.md` answers still blank.

## 1. What this stage was supposed to do

Stage 4 proved the overlay and the GPU telemetry. Stage 5 is the per-hero
pass: every hero that ships gets a `?perf=1` measurement, a known-answer
test where one exists, and a human REVIEW.md before it ships.

## 2. The three 3D heroes (already done in earlier stages)

| hero | known-answer test | evidence |
|------|------------------|----------|
| black hole | `tests/relativity.test.js` — rs = 2.953 km/M_sun, photon sphere 1.5 rs, ISCO 3 rs, shadow b = 3√3 M, ISCO Ω = 1/√54, Doppler √3 at β=0.5, thin-disk efficiency 5.7191% | `evidence/black-hole/VERIFICATION.md`, `evidence/black-hole/leak.json` |
| solar system | `tests/solar-system.test.js` — Kepler III vs the JPL element table, Earth-Moon barycentre, perihelion/aphelion, RK4 energy drift | `evidence/solar-system/VERIFICATION.md`, `evidence/solar-system/leak-20-cycles.json` |
| earth seasons | `tests/seasons.test.js` — max declination 23.44 on 21 June, equinox crossing, 12.000 h daylight at the equator for every declination | `evidence/earth-seasons/VERIFICATION.md`, `evidence/earth-seasons/seasoncheck.json` |

All three also have the `?perf=1` overlay verified (see section 3) and the
8-cycle leak check flat.

## 3. The four 2D heroes

`scripts/verify-perf.mjs` now runs against all seven heroes. The four 2D
heroes mount the overlay and read real numbers:

| hero | frame time | fps | renderer |
|------|-----------|-----|----------|
| galaxy-collision | 14.6 ms | 68.5 | n/a (p5) |
| quantum-tunnel | 16.1 ms | 62.1 | n/a (p5) |
| ocean-currents | 14.7 ms | 68 | n/a (p5) |
| magnetic-field | 14.2 ms | 70.4 | n/a (p5) |

The GPU fields are `n/a` for these by design: they render with p5, not
three.js, so there is no `renderer.info` to read. That is a statement of
what the sim is, not a shortfall.

## 4. Known-answer tests for the 2D heroes

The four 2D heroes originally kept their physics inside the sketch's draw
loop, so there was nothing a unit test could import. This stage extracted
each one into an `assets/*.js` module that the sketch now calls, so the
physics has exactly one implementation and that implementation is testable.

| module | hero | known-answer facts asserted | tests |
|--------|------|------------------------------|-------|
| `assets/magnetic-field.js` | magnetic-field | dipole falls off as 1/r³, cyclotron radius r = mv/(\|q\|B), Lorentz force F = q(v×B), F·v = 0 (the field does no work), reversing q reverses the curvature but not the radius | `tests/magnetic-field.test.js` (9) |
| `assets/quantum-tunnel.js` | quantum-tunnel | T → 1 as E ≫ V₀, T → 0 as the barrier widens, T → 0 as E → 0, T + R = 1 (probability conserved), the E = V₀ limit is finite and matches both one-sided limits | `tests/quantum-tunnel.test.js` (13) |
| `assets/ocean-currents.js` | ocean-currents | Coriolis parameter f = 2Ω sin φ, opposite signs in the two hemispheres, 45° transport deflection for a 45° Ekman angle, subtropical gyres rotate clockwise in the north, Ekman spiral depth structure | `tests/ocean-currents.test.js` (11) |
| `assets/galaxy-physics.js` | galaxy-collision | far field converges to a point mass at the centre of mass, 1/r² fall-off, no self-attraction, Newton's third law, Barnes–Hut error falls as theta², circular speed v = √(GM/r) | `tests/galaxy-physics.test.js` (14) |

The galaxy case needed care: the Barnes–Hut tree lives in a Web Worker, so
the worker now `importScripts()` the shared module instead of carrying its
own copy of the quadtree. There is one implementation, and the tests
exercise it. A test asserts the two tree builders agree — the one the worker
uses (packed `Float32Array` state) and the one the tests use (objects) — so
the tests cannot drift away from the running simulation.

### 4.1 A bug the extraction found

The magnetic-field telemetry read:

```js
const cyclotronR = (vInit / Math.max(0.1, centerBMag * 0.1));
```

The `max(0.1, …)` clamp was always the winner: the field magnitude at the
canvas centre is ~0.05–0.85 across the whole slider range, so `B * 0.1` never
reached 0.1 and the readout was a **constant 35 px** no matter how the field
was set. Measured in the browser before the change:

| Magnetic moment (slider) | B at centre | old readout | correct r = mv/(\|q\|B) |
|--------------------------|-------------|-------------|----------------------|
| 0.5 | 0.053 | 35.0 px | 66.4 px |
| 1 | 0.105 | 35.0 px | 33.2 px |
| 3 | 0.316 | 35.0 px | 11.1 px |
| 8 | 0.843 | 35.0 px | 4.2 px |

The old number was not a physical result at all. The sketch now calls
`VisiqMagneticField.cyclotronRadius(...)`, which is the textbook formula, and
the readout tracks the field as 1/B.

### 4.2 The quantum tunnelling limit

The transmission coefficient divides by `E − V₀`, so `E = V₀` is a 0/0
singularity. The first version of the module special-cased it to `1`, which
is wrong: a wide barrier at the barrier height still reflects most of the
wave.

The limit is the same from both sides, because `sinh(κa) ~ κa` with
`κ² ∝ (V₀ − E)` below the barrier and `sin(k'a) ~ k'a` with `k'² ∝ (E − V₀)`
above it, so the energy difference cancels in both cases:

```
T(E = V₀) = 1 / (1 + V₀ λ² a² / 4)     with λ = 0.15 × 0.1 = 0.015
```

For V₀ = 5 eV and a = 40 px that is `1 / (1 + 1.125) = 0.6896551724`.
The module returns exactly that, and the test asserts it against the
closed form and checks that approaching from either side converges to the
same value. Sampling at E = V₀ ± 10⁻⁷ gives 0.68965517 from both sides.

## 5. Browser verification

All four heroes were opened in headless Chrome through
`scripts/headless-audit.mjs smoke` and mounted with zero console errors:

| hero | canvas | sliders | telemetry | console errors |
|------|--------|---------|-----------|----------------|
| quantum-tunnel | 1 | 3 | 4 | 0 |
| ocean-currents | 3 | 5 | 4 | 0 |
| magnetic-field | 1 | 5 | 4 | 0 |
| galaxy-collision | 1 | 4 | 4 | 0 |

The galaxy worker's `importScripts('../assets/galaxy-physics.js')` path was
checked separately, because a worker that fails to import reports the error
on the worker, not on the page. Two bodies 100 px apart were handed to the
real worker and came back with equal and opposite velocities towards each
other (6.314475e-7 each), which is the softened Newtonian pull — so the
worker is genuinely computing frames, not silently idling.

The four new `assets/*.js` modules were confirmed present on `window` in a
live page.

## 6. Test suite

`npm test` — **13 files, 128 tests, all passing.**

## 7. What is still a human statement

- `REVIEW.md` answers are blank and waiting on the owner.
- The overlay's legibility on a real phone.
- The `vendor` field reads `unknown` because the verification harness is
  headless; a real phone shows the real vendor.
- Whether the extracted modules reproduce what a human *sees* in the sketch.
  The physics is asserted against textbook facts; the visual match is a
  human call.
