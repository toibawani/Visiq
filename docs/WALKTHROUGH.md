# VISIQ walkthrough

A plain-language explanation of how each major piece works and why, written so
the owner can explain it in an interview.

## SimBase: mount and destroy

Every simulation starts the same way. `gallery.js` loads `sketches/<id>.js` as
a classic script, which calls `window.initSketch({containerId,
controlsContainerId})`. The sketch returns an object that must expose
`destroy()`. That object is built on `SimBase` (`assets/sim-base.js`).

SimBase does five things:

1. **Parameter handling.** It reads default values, then checks the URL query
   string for overrides. Values are parsed with `parseFloat`, checked with
   `isFinite`, and clamped to `[min, max]`. NaN or huge numbers from a
   hostile URL are rejected before they reach the simulation.
2. **Mount.** It calls the sketch's custom setup function inside a p5
   instance, creates the canvas, sets up observers (resize, visibility), and
   starts the draw loop.
3. **Readouts.** If the sketch provides `getReadouts()`, SimBase polls it and
   writes live values into the DOM in JetBrains Mono, with units.
4. **Teardown.** `destroy()` disconnects observers, clears timeouts and
   intervals, removes event listeners, calls `p5.remove()`, and wipes the
   canvas and controls containers. It also dispatches a `visiq:sim-destroyed`
   event so shared layers can detach.
5. **Leak tracking.** Every timer and listener SimBase creates is recorded so
   `destroy()` can find and remove it later.

The 20 open-close leak test mounts and destroys each 3D hero twenty times and
checks that geometry, texture, program, and canvas counts are identical every
cycle, and that the JS heap returns to the same number.

## Fixed timestep

Simulations do not run at "as fast as possible." They use a fixed timestep:
the clock advances by a fixed amount each frame, and the integrator steps the
physics by that amount. This keeps orbits stable regardless of whether the
display is 60 Hz or 144 Hz, and it makes the simulation deterministic - the
same inputs always produce the same trajectory.

Why fixed instead of variable? Variable timesteps make orbits drift: a long
frame takes a big step, and Euler-style integrators accumulate error
proportionally to step size. A fixed step keeps the error bounded and
predictable.

## Why RK4 (and not just Euler)

Euler integration (`position += velocity * dt`) is simple but unstable for
orbits: a planet gains energy every orbit and spirals away from the Sun. RK4
(Runge-Kutta fourth order) samples the derivative four times per step and
takes a weighted average, which keeps energy drift tiny over long runs.

The solar system test measures energy drift over a year of RK4 at 1-day steps:
`2.65e-10`, well under the `1e-8` bound. The same scene with Euler reaches a
4.93 relative energy error on Mercury and ejects the planet.

Verlet is used where energy conservation matters more than accuracy (the
double pendulum), and RK4 where orbital accuracy matters (the solar system).

## How the black hole shader bends light

The black hole sketch does not draw a disk and a shadow. It ray-marches: for
each pixel, it casts a ray from the camera into the scene and marches it
through the curved spacetime around the hole, stepping the ray according to
the Schwarzschild geodesic equation. Where the ray crosses the accretion
disk, it samples the disk's color and temperature. Where the ray falls into
the hole, it draws black.

Effects that fall out of the math, not from artwork:

- **Lensing.** Light from the far side of the disk curves over the top of the
  shadow, so you see the disk's back as an arc above the hole.
- **Doppler beaming.** The side of the disk rotating toward the camera is
  brighter; the receding side is dimmer. Measured at 1.56:1 brightness ratio.
- **Gravitational redshift.** Light climbing out of the well loses energy, so
  colors shift redder closer to the hole.
- **Photon sphere.** A bright ring at 1.5 `r_s` where light can orbit the
  hole.

## What Barnes-Hut does

Barnes-Hut is an algorithm for simulating gravity among many bodies without
computing every pair. It groups distant bodies into a tree (a quadtree in 2D,
an octree in 3D) and approximates their combined pull as a single mass at
their center of mass. The approximation is controlled by `theta`: bodies
farther away than `theta * cell_size` are treated as one group.

The galaxy collision worker uses Barnes-Hut so 20,000+ stars can run at
interactive speed. A direct sum would be `O(N^2)` - 400 million pair checks
per frame for 20,000 stars. Barnes-Hut brings it to `O(N log N)`.

The trade-off is force error, which grows with `theta`. The test measures
Barnes-Hut force error at `theta = 0.5` against a direct sum and states it.

## How the leak test works

The leak test (`scripts/verify-3d.mjs leak <sim> 20`) opens and closes a
simulation twenty times in the same browser process. After each cycle it
reads `renderer.info` from three.js (geometries, textures, programs) and the
JS heap size after forced garbage collection.

A passing result means the counts are identical in every cycle and the heap
returns to the same number. The solar system, for example, holds 15
geometries, 9 textures, 6 programs, and 12.1 MB heap across all 20 cycles.

## 12 questions an engineer might ask (with honest answers)

**1. How much of this was AI-assisted, and how did you verify it?**

Honest answer: large parts of the code were written or shaped by AI coding
agents, including earlier agents on this project. I verified it three ways:
every JS file passes `node --check`, the full Vitest suite passes (73 tests,
7 files), and every published number in `evidence/` has a reproducing command
that was actually run. Where I could not verify a visual claim (no human has
rendered a frame on this machine), I wrote "not rendered, needs a human
check" instead of claiming it.

**2. Why no framework?**

A static site opens by loading `index.html`. No build step means nothing
breaks between machines, and a recruiter can run it with one Python command.

**3. How do you know the physics is right?**

Known-answer tests with stated tolerances. The solar system reproduces
NASA/JPL orbital elements, Earth's year, and Mercury's speed. The black hole
reproduces the Schwarzschild photon sphere, ISCO, and shadow radius. The
seasons model reproduces declination and day length at real dates. Each test
file states the bound and the measured value.

**4. What does the leak test actually catch?**

It catches SimBase failing to remove event listeners, timers, observers, or
the p5 instance on teardown. Without it, opening and closing sims would grow
the heap and eventually crash the tab.

**5. Why is the login plaintext passwords?**

It's a known defect. `assets/auth.js` stores email and password in
`localStorage` under `visiq_users` in plaintext. The login is optional and
gates nothing; every simulation opens without it. It should be removed or
replaced with a real auth provider before any data of value is stored.

**6. What is stored and where?**

Everything is same-origin `localStorage`/`sessionStorage`: theme, mute state,
stats, favorites, pinned controls. Nothing leaves the device. The only
third-party request is p5.js from cdnjs.

**7. Why three.js 0.186.1 specifically?**

It's pinned, at least 14 days old, with license, URL, and SHA-384 in
`docs/SOURCES.md`. It's vendored, not loaded from a CDN, so the site works
offline and the supply chain is auditable.

**8. What does the black hole actually show?**

A non-spinning Schwarzschild black hole with an accretion disk. It does not
spin (no Kerr frame dragging), and the disk is infinitely thin with no
self-shadowing. The sim's own limits line says so.

**9. How does the site handle phones?**

It uses one WebGL context per page, a resolution governor between 1.0 and
0.5, and reduced-motion support. FPS on a mid-range phone is not measured yet
- the rule is "not measured until the owner pastes a `?perf=1` screenshot
from a real phone."

**10. Why no emoji or gradients?**

Design rule. The site should look like a scientific instrument, not a
portfolio template. Icons are custom inline SVG with accessible names.

**11. What is not done?**

Touch feel (pinch, 48px targets) is sized in the DOM but not human-tested.
`prefers-reduced-motion` is implemented but not tested in a real reduced-motion
session. Phone FPS is unmeasured. Several planned heroes (galaxy collision,
hydrogen orbitals, ocean, charged particles) are in the backlog.

**12. What would you build next?**

Galaxy collision with Barnes-Hut in a worker, hydrogen orbitals from real
wavefunctions, an FFT ocean, and charged particles in fields - each with
known-answer tests before it ships.
