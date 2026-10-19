# SIM-3D-AUDIT: which simulations should be 3D

Step 0 of the "make the sims look real, in 3D, and be right" pass. Nothing in
this document is a wish list: every row is either read from the source or
measured in a headless Chromium window. Where a number came from a different
tool run it is labelled as such.

## Method

- Loader path read from `gallery.js` (line 404, `loadSketch`) and
  `assets/sim-base.js` (the `SimBase` contract).
- fps measured with `scripts/headless-audit.mjs fps <simId> 4`, which drives
  `Emulation.setCPUThrottlingRate({rate: 4})` over the Chrome DevTools
  Protocol and samples `requestAnimationFrame` deltas for 2.5 s.
- Machine: macOS, Apple Silicon, Google Chrome 154 (headless=new), GPU =
  ANGLE Metal on Apple M1. WebGL2 is available in this harness; I confirmed it
  with a probe (`MAX_TEXTURE_SIZE` 16384, `EXT_color_buffer_float`, and
  `WEBGL_compressed_texture_astc` all present), so the 3D work can be rendered
  and checked here rather than guessed at.

## A limit of the fps method, stated up front

Every non-pathological sim reports `avgMs` 16.67 and `worstMs` about 16.8, that
is 60 fps with no frame longer than one vsync interval. The browser caps rAF at
60 Hz, so this measures "the sketch did not drop a frame", not "the sketch has
room to spare". A sketch using 15.9 ms of a 16.7 ms budget and one using 0.4 ms
both report the same thing. Treat the table below as a floor, not a profile.
`wave-interference` is the single sim that exceeds the budget and actually
drops, which is why it is the one row with a real number (31 fps).

## How a simulation is loaded (verified, not assumed)

`gallery.js` builds `<script src="sketches/${id}.js">` and, on load, calls
`window.initSketch({containerId, controlsContainerId})`. The returned object
must expose `destroy()`; `destroyCurrentSketch()` calls it on the way out.
So the filename is always the catalog `id`, and there is no indirection to
check. Two consequences:

- A 3D rewrite replaces the body of `sketches/<id>.js` and keeps the
  `window.initSketch` contract. No HTML, no gallery edit, no registry edit.
- Because the file is a classic script, Three.js has to arrive by dynamic
  `import()` from inside it, resolved against `document.baseURI` so it works
  at the repo root and under a `/Visiq/` project-page path alike.

The catalog has 29 ids and `sketches/` has 35 files. Six sketch files have no
gallery card and are unreachable from the UI: `ferromagnetism`, `fourier`,
`gravity-tree`, `lotus`, `mountains`, `murmuration`. No id is missing a file.
The orphans are out of scope for a visitor-facing pass and are listed here so
the count reconciles.

## Inventory: does 3D add understanding, or only flash?

Verdicts are about physics legibility, not prettiness. "Stay 2D" means the 2D
view already carries the idea and a camera would only add noise.

| id | 3D verdict | why |
|---|---|---|
| black-hole | **Gain, top of the list** | Lensing, the disk wrapping over and under the shadow, and the Doppler-bright side are three-dimensional facts. A flat canvas has to fake all three. Ray-marching is the correct model, not a decoration. |
| black-hole-orbit | Gain | Orbits have inclination and angular momentum; a launch off the plane is the whole point of escape-velocity play. Needs no textures, so it is cheap to do honestly. |
| hurricane-formation | **Gain** | A cyclone is a rotating column with a warm core, a rain band spiral, and wind shear tilting it. All of that is vertical structure that 2D cannot show. |
| galaxy-collision | **Gain** | Tidal tails leave the disk plane. The classic Toomre-Springel look is inherently volumetric. 1,000 stars is instanced instancing, not a new physics problem. |
| magnetic-field | Gain | Field lines are 3D curves; a particle gyrating along a dipole is honest only in 3D. Good second-tier hero because it is all geometry, no assets. |
| plate-tectonics | Gain | Subducting slabs dip into the mantle. Currently the weakest 2D visual in the set (flat muddy blocks). A cross-section in 3D is a real teaching upgrade. |
| star-lifecycle | Gain | Mass determines the remnant; the collapse and the bipolar jets are 3D events. The 2D version is a nebula cloud with a glow. |
| volcanic-eruption | Some gain | The eruption column and pyroclastic flow are volumetric, but the viscosity/gas trade-off already reads in 2D. Worth 3D later, not first. |
| neutron-star | Some gain | A tilted magnetic dipole sweeping a lighthouse cone is better in 3D, but the current version is already particle-heavy and plausible. |
| exoplanet-detection | Stay 2D, mostly | The science is the light curve. A 3D system view is nice but the transit is a 1D measurement. Keep the curve as the hero. |
| pressure-temperature | Stay 2D | Kinetic theory is molecules in a box. A 3D box adds depth but not a new idea, and the P-V work is the payload. |
| protein-folding | Some gain | Torsion angles and the hydrophobic core are genuinely 3D, but this needs a real molecular representation (cartoon/ribbon), which is a much larger job than a camera move. Not in this pass. |
| newton, pendulum-chaos | Stay 2D | Both are already at the stated reference quality. Force vectors and phase space are 2D quantities, and pendulum-chaos already carries the richest 2D chrome on the site. |
| wave-interference, quantum-tunnel, doppler-effect, fourier | Stay 2D | Field/wave pictures are 2D by nature. wavelet-interference needs a performance fix, not a camera. |
| mitosis, meiosis, dna-replication, enzyme-kinetics, neuron-firing, population-genetics, virus-spreading | Stay 2D | Schematic biology. Depth would obscure the labelled structures rather than reveal them. |
| water-cycle, ocean-currents, erosion-weathering, earthquake-waves, cosmic-expansion | Stay 2D | Maps and cross-sections. ocean-currents and earthquake-waves already carry the geography correctly. |

## Candidates, measured

fps at 4x CPU throttle, this machine, this harness. `worstMs` is the longest
frame interval seen after the first six frames (which include load spikes).

| sim | avgMs | worstMs | frames / 2.5 s | reading |
|---|---|---|---|---|
| black-hole | 17.33 | 150.0 | 232 / 4.0 s | one 150 ms hitch at startup, otherwise vsync-locked. The hitch is the p5 init, not the draw loop. |
| black-hole-orbit | 16.67 | 16.8 | 151 | 60 fps, no dropped frames |
| galaxy-collision | 16.67 | 16.8 | 151 | 60 fps, no dropped frames |
| magnetic-field | 16.67 | 16.8 | 151 | 60 fps, no dropped frames |
| plate-tectonics | 16.67 | 16.8 | 152 | 60 fps, no dropped frames |
| hurricane-formation | not measured | | | the harness never found a mounted canvas for this id, so no number is claimed. It loads through `new p5` rather than `SimBase`, which is likely why. |
| star-lifecycle | 16.28 (earlier pass) | | | from `SIM-AUDIT.md`, same harness and throttle, not re-run by me |
| volcanic-eruption | 16.34 (earlier pass) | | | as above |
| neutron-star | 16.51 (earlier pass) | | | as above |
| exoplanet-detection | 16.49 (earlier pass) | | | as above |
| protein-folding | 16.14 (earlier pass) | | | as above |
| cosmic-expansion | 16.33 (earlier pass) | | | as above |
| wave-interference | 31.97 (earlier pass) | | | the only sim that fails the budget; 3,750 `p.rect` calls per frame |

The "earlier pass" rows are the same harness at the same throttle, which now
looks reproducible (black-hole-orbit matched to 0.2 ms), but I did not run them
in this session and they are marked so nobody has to take my word for them.

Independently, a corrected reading of the black-hole row: 232 frames in 4.0 s
is 58 fps average with a single 150 ms outlier. I am not going to call that
"60 fps holds"; I am calling it "one startup hitch".

## What I am building, and in what order

Rule for this pass: one hero finished end to end before the next starts.

1. **Black hole** (catalog id `black-hole`, `sketches/black-hole.js`). Note
   that `black-hole-orbit` is a different sim: that one is the escape-velocity
   playground and keeps its name and catalogue entry. The ray-marched
   Schwarzschild view belongs on `black-hole`, whose stated description is
   "watch how strong gravitational fields curve particle paths and light rays",
   that is, lensing.
2. **Solar system / orbits**. The catalogue has no dedicated solar-system entry;
   the closest is `black-hole-orbit` (Kepler, escape velocity) and
   `exoplanet-detection` (one planet, one star). A full system needs its own
   catalogue entry, which is a surgical edit to `simulations-data.js`, not a
   regeneration. To be decided with the owner before I touch the registry.
3. **Earth and seasons**. No catalogue entry exists for this either. Same
   registry question as above.
4. Next two best from this audit: `galaxy-collision` and `magnetic-field`.

Heroes 2 and 3 need new catalogue cards, and the brief forbids regenerating
`simulations-data.js`. I will add entries manually, in place, and show the diff.

## Kept 2D, with reasons

Pendulum chaos and Newton's playground stay 2D because they are already the
quality reference on the site and their physics is planar. The wave, field and
schematic-biology sims stay 2D because depth would not teach anything they do
not already teach, and several of them (mitosis, meiosis, dna-replication)
depend on labelled 2D structure that a free camera would make harder to read,
not easier.

## Things I have not verified and will not claim

- Touch behaviour: pinch zoom and 48 px targets can be measured for size in the
  DOM but not for feel. A human check is required.
- `prefers-reduced-motion` paint behaviour, for the same reason in reverse: the
  media query can be emulated, the resulting feel cannot.
- Any fps number on a mid-range phone. This machine is an M1 with a discrete
  GPU path; its 60 fps says nothing about a three-year-old Android.
- hurricane-formation's current frame cost, for the harness reason above.
