# Solar system: what was measured

Hero 2 of the "make the simulations look real, in 3D, and be right" pass. Every
number below came from a command run against this working tree. Nothing here is
an estimate, and the things that were **not** checked are listed at the bottom
rather than left implied.

Sim: `sketches/solar-system.js`, catalogue id `solar-system`, loaded by
`gallery.js` as `sketches/solar-system.js`. Renders with the vendored three.js
0.186.1 by dynamic `import()`. Physics from `assets/orbital-elements.js`
(NASA/JPL's published element table) and `assets/integrators.js` (RK4,
`centralForce3`).

## 1. Tests

`npx vitest run` -> **6 files passed, 59 tests passed**, of which 13 are new in
`tests/solar-system.test.js`. Each new assertion has the value measured when the
tolerance was chosen written beside it:

| assertion | stated bound | measured |
|---|---|---|
| Kepler III vs the table's own longitude rates, four inner bodies | < 5e-5 | worst 1.87e-5 (Mars) |
| same, all eight bodies | < 7e-4 | 6.33e-4 (Neptune) |
| Earth-Moon barycentre distance at J2000 | 0.983307 ± 5e-6 | 0.983307 AU |
| perihelion / aphelion over two years | 0.98329 / 1.01671 ± 5e-6 | 0.983292 / 1.016714 AU |
| Mercury perihelion distance a(1-e) | 0.3075 | 0.307499 AU |
| longitude closure after one Kepler period, 5 bodies | < 1e-6 deg | worst 9.3e-10 deg |
| radius closure over that period | < 1e-9 | worst 9.2e-13 |
| Earth year | within 0.02 d of 365.25 | 365.2583 d |
| specific energy drift over a year of RK4 at 1 d steps | < 1e-8 | 2.65e-10 |
| angular momentum drift, magnitude | < 1e-8 | 1.32e-10 |
| angular momentum drift, direction (1 - cos) | < 1e-8 | 8.7e-11 |
| Earth speed at J2000 | 29.2 to 30.4 km/s | 30.28 km/s |
| circular speed at 1 AU through vis-viva | 29.78 ± 0.05 km/s | 29.78 km/s |
| Kepler solver residual over 24 means x 4 eccentricities | < 1e-12 | < 1e-12 |

Two pre-existing tests in `tests/font-glyphs.test.js` failed on this machine for
an environmental reason, not a code reason: they shell out to `python3` needing
`fontTools` and `brotli`, neither of which was installed. Both were installed
with `pip3 install --user fonttools brotli` and the suite then passed 59/59.
That is a change to this machine's Python, not to the repository.

## 2. Frame rate (`scripts/verify-3d.mjs fps solar-system 6 <throttle>`)

| setting | avg ms | fps | median ms | worst ms | frames > 25 ms | render scale |
|---|---|---|---|---|---|---|
| unthrottled | 16.67 | **60.0** | 16.7 | 16.8 | 0 | 1.0 (no reduction) |
| 4x CPU throttle | 16.67 | **60.0** | 16.7 | 16.8 | 0 | 1.0 |

Raw JSON: `fps-unthrottled.json`, `fps-4x-throttle.json`. The governor never had
to reduce anything on this machine, so the scale stayed at 1.0 in both runs.
This says nothing about a mid-range phone; see the limits at the bottom.

## 3. Leak test, 20 open/close cycles (`leak solar-system 20`)

```
geo/tex/prog/sim-canvases per cycle:
(15, 9, 6, 2) x 20 cycles   -- identical in every cycle
heap, MB: 12.1 x 20         -- identical in every cycle
after forced GC: heap 12.1 MB, supported true
first cycle: geometries 15, textures 9, programs 6, calls 15, triangles 9794
last  cycle: geometries 15, textures 9, programs 6, calls 15, triangles 9794
```

Raw: `leak-20-cycles.json`. Nothing is retained: the same 15 geometries, 9
textures and 6 programs after 20 mounts and destroys, and the JS heap returns to
12.1 MB. Two canvases are live per cycle (the WebGL canvas and the graph
overlay), also unchanged.

## 4. Screenshots, 8 captures (`sheets solar-system`)

`node scripts/verify-3d.mjs sheets solar-system evidence/solar-system/sheets`
produced 8 PNGs, one per combination of 1440x900 / 375x812 and dark / light, at
the first frame and 10 seconds later, with **0 console problems** in the whole
run (`sheets.json`). The simulation canvas measured 931x394 in that run (the
canvas is sized from its container, which differs from the black hole's layout).

Whole-image channel means and the t0-to-t10 difference, measured with sharp:

| capture | mean rgb | pixels changed t0 -> t10 | largest channel delta |
|---|---|---|---|
| 1440x900 dark | 11.6, 14.3, 21.6 | 3.06% | 749 of 765 |
| 1440x900 light | 151.3, 152.7, 155.8 | 2.92% | 743 |
| 375x812 dark | 12.3, 14.9, 22.2 | 6.04% | 685 |
| 375x812 light | 132.3, 133.7, 137.5 | 5.23% | 711 |

The dark captures are a dark blue field because space is dark; the light
captures are light because the page around the canvas is light. The canvas keeps
its own dark background in both themes deliberately, the same way
`fluid.html` and the black hole do.

### What the captures contain, read from their pixels

The preview webview on this machine is not compositing, so no human eye has seen
these frames; the descriptions below come from
`node scripts/describe-shot.mjs <png> <cols> <rows>`, which prints a coarse
luminance map, the brightest cells and row means. Treat them as measurements,
not as a visual review.

- **1440x900 dark, t0.** The whole frame is dark (median luminance 14 of 255).
  The Earth is the only large object: in a 300x200 crop it is a disc about 100
  pixels across, spanning 14 columns by 12 rows of the map. Its lower-right third
  is bright (`+ * # %` in the map, peak channel values 195 to 218) and its
  upper-left is mid-dark (`:` and `-`, luminance 30 to 60). That is a sunlit
  hemisphere with a visible terminator, not a uniform dot.
- **375x812 captures.** Twice the fraction of pixels changes between t0 and t10
  (6.04% against 3.06%), which is what a smaller canvas does to the same
  metres-per-pixel of motion.
- **Motion.** Every capture changes between t0 and t10, with single-pixel
  channel deltas up to 749 of 765. At the default 10 days per second, 10 seconds
  is 100 days of simulation, about a quarter of the Earth's orbit, so this is the
  planets moving rather than noise.
- **What still looks fake in these frames.** The Earth's cloud tops clip toward
  white at the sub-solar point under ACES tone mapping. The Earth is the only
  body in the opening frame, so nothing else is visible to judge. The star field
  is a scatter of single pixels with no magnitude spread.

## 5. Physics, measured against the source of truth

The element table is a closed-form answer for the same two-body problem the sim
integrates, so comparing them measures the integration and nothing else.
`node scripts/verify-3d.mjs orbitcheck solar-system <seconds>`:

```
seeded at the table epoch, clock at its fastest setting, 4 seconds
date 2130-09-07, RK4 step 0.5867 days, 150 steps per Mercury orbit, physics-limited

body      residual vs table    in orbital phase
Jupiter   24,764,069 km       114.4 arcmin
Neptune   13,447,853 km        10.2 arcmin
Uranus    12,718,745 km        15.9 arcmin
Mercury    6,340,043 km       444.5 arcmin
Mars       2,107,307 km        29.1 arcmin
Saturn     1,927,357 km         4.5 arcmin
Venus      1,196,913 km        37.8 arcmin
EM bary      686,983 km        15.7 arcmin
```

That residual is not mostly arithmetic, and the check that shows it is repeating
the same 130 year comparison with the elements **held frozen** at their epoch
values (run in node, quoted from the command output):

| body | integration vs table | frozen elements vs table |
|---|---|---|
| Mercury | 223.0 arcmin | 26.8 arcmin |
| EM bary | 32.0 arcmin | 14.8 arcmin |
| Jupiter | 116.6 arcmin | 115.1 arcmin |
| Neptune | 10.2 arcmin | 10.1 arcmin |

For the giant planets almost the entire disagreement is the table's own
per-century element drift, which is where the real perturbations by the other
planets live and which a two-body integration from one seeded state cannot
reproduce. For Mercury the arithmetic is the larger share. Both are stated in
the sim's own limits line with these numbers.

At the **default** time rate the step is 0.0184 days, not the 0.5867 day ceiling,
because the step is chosen from the frame's time advance with the ceiling as a
cap:

```
Energy drift (RK4)          1.89e-14  (worst 1.16e-13)
Angular momentum drift      9.33e-15
Residual vs element table   3295 km
```

and at the fastest setting the drift readout reaches `9.67e-4` worst case
(Mercury, 150 steps per orbit) after 139 years of simulated time.

## 6. Readouts and the limits line, verbatim from the live page

`preview_evaluate` against `http://127.0.0.1:8000/index.html?sim=solar-system`,
default state, no sliders touched, on 2026-10-14:

```
Date                              3 Apr 2027
Focused body                      Earth (barycentre)
Time rate                         10.0 days per second
Distance from Sun                 1.000 AU
Heliocentric speed                29.79 km/s
Orbital period                    365.3 d
Kepler III P^2/a^3                1.0000 yr^2/AU^3
Energy drift (RK4)                1.89e-14 (worst 1.16e-13)
Angular momentum drift            9.33e-15
Residual vs element table         3295 km
Element table valid               yes, 1800 to 2050
Sunlight relative to Earth        1.0004 x Earth
Axial tilt                        23.44 deg
Rotation period                   0.997 d
True radius                       6371.0 km
Mean surface temperature          288 K
Earth distance from Sun           1.000 AU
Earth speed                       29.79 km/s
Earth sunlight                    1.0004 x the value at 1 AU
```

The date is 3 Apr 2027 rather than the day of the run because the page had been
open for about 17 seconds at 10 days per second; the seed itself is the current
UTC date, which was 2026-10-14.

The limits line, verbatim:

> What this model leaves out: the planets move under the Sun's gravity alone, so
> there are no planet-planet perturbations and the table's own nominal longitude
> error applies (about 1/3 arcminute for the Earth, 10 arcminutes for Saturn over
> 1800 to 2050, which is the table's stated interval). The Earth row is the
> Earth-Moon barycentre, not the Earth: the two differ by up to 0.00257 AU, about
> 6 times the Earth's own radius, and the Moon here is a circular 27.32 day orbit
> at the mean distance rather than a real ephemeris. The Sun's light is treated
> as constant; a real star loses mass and brightens over these timescales.
> Planets are perfect spheres with a single albedo map: no topography. The cloud
> layer is one flat alpha map with no thickness, so no cloud casts a shadow and
> none changes shape; it turns 12 percent faster than the surface, which is a
> real effect but not this one. The rings cast no shadow on Saturn and nothing
> eclipses anything. The star field is random, not a catalogue. The model also
> cannot follow the table's own per-century element drift, which is where the
> real perturbations by the other planets live: measured 130 years from the
> epoch, the integration sits 32 arcminutes from the table for the Earth-Moon
> barycentre and 117 arcminutes for Jupiter, while repeating the same comparison
> with the elements held frozen at their epoch values gives 15 and 115
> arcminutes. So for the giant planets almost the whole difference is the missing
> perturbation, not the arithmetic. The table is valid 1800 to 2050; outside that
> the readout says the elements are extrapolated. Nothing here is scaled in time:
> one second of wall clock is 10.0 days, and the Earth's year takes 36.5 seconds.

## 7. Bytes, assets and licences

- Page weight of the sim itself: 13 textures totalling **1,091 KB** of webp,
  loaded only when `solar-system` is opened. Three.js (`three.module.js` plus
  `three.core.js`) is 417 KB gzipped and is fetched by dynamic import on the same
  page; it is not part of the gallery first load.
- Gallery first-load JS cost of the element table, measured by summing the local
  script tags in `index.html`: **+13,006 bytes raw, +4,893 gzipped** (243,603 raw
  / 68,197 gzip without it, 256,609 / 73,090 with it).
- Every texture is Solar System Scope, **CC BY 4.0**, fetched through the
  Commons API by `scripts/fetch-planet-maps.mjs`, which refuses any file whose
  licence string is not CC BY 4.0 / CC0 / public domain and any file with no
  recorded author. `assets/textures/planets/PROVENANCE.json` holds the source
  title, description page, licence URL, author, source dimensions, source sha1,
  output sha256 and stored size for each of the 13 files. Attribution is also on
  screen in the control panel.
- Triangle count of the whole scene: 9,794, in 15 draw calls.

## 8. What is not done or not checked

- **No human has looked at a frame.** The preview webview is not compositing on
  this machine, so every visual claim above is derived from pixel statistics.
  Screen-by-screen review by a person is still owed.
- Touch feel (pinch zoom, 48 px targets) is unmeasured. Sizes are in the DOM, the
  feel is not.
- `prefers-reduced-motion` start-paused behaviour is implemented and unverified
  in a real reduced-motion session.
- fps on a mid-range phone is unknown. This machine is an M1 that reports 60 fps
  at 4x CPU throttle with no reduction at all, which is not evidence about a
  three-year-old Android.
- No ring shadow on Saturn, no eclipses, no other moons, no asteroid belt, no
  comets, no topography, no normal maps, no roughness maps, no bloom (the Sun's
  glow is a sprite), and the star field is random.
- The element table drifts past 2050; the sim extrapolates and says so.
- Windows and Safari are untested.

## 9. Things I got wrong on the way here, all found by measurement

1. The first integrator step policy let the step follow the time rate and reached
   a **4.93 relative energy error on Mercury**; it was ejecting the planet.
2. At 80 steps per Mercury orbit the energy was fine but the orbital phase had
   drifted **55 degrees over 276 years**. Now 150 steps per orbit, with the live
   residual readout exposing what is left.
3. The first `orbitcheck` run reported **zero error for every body** because I
   paused the clock before any integration happened. It measured nothing.
4. The first framing put the camera 1.8 AU from the Earth, where its readable
   disc is about ten pixels and the canvas is otherwise black.
5. The Moon was placed at 1500 times its true distance, which is **3.9 AU** from
   the Earth, further than Mars is from the Sun.
6. The shader patch for the Earth's night lights was injected without declaring
   its uniforms, so the first build of the sim fell back to the flat 2D plot. The
   fallback worked and the console named the error.
7. The readout list had 8 keys where the sim writes 19, so 11 rows were computed
   and thrown away.
8. The limits line said "no clouds that move" after a cloud layer had been added.
