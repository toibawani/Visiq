# Sources, licenses and thumbprints

Everything in the project that did not come from the repository author is
listed here, with the licence checked before use. If a licence was not clear,
the asset was not used, and that decision is recorded rather than hidden.

## Planet maps (CC BY 4.0, attribution required)

Used by `sketches/solar-system.js`. Source: Solar System Scope,
<https://www.solarsystemscope.com/textures/>, published on Wikimedia Commons
and fetched through the Commons API, which reports the licence string checked
by the script before download. The licence is **CC BY 4.0**, so attribution is
required and is shown in the simulation's own credit line as well as here:

> Planet maps by Solar System Scope (CC BY 4.0), via Wikimedia Commons.

Fetched by `scripts/fetch-planet-maps.mjs`, which refuses any file whose
licence is not CC BY 4.0 / CC0 / public domain and any file with no recorded
author. It writes `assets/textures/planets/PROVENANCE.json` with the title,
description page, licence URL, author, source dimensions, source sha1, output
sha256 and stored size for every file, so any of these can be re-checked
without trusting this paragraph. Re-run with `--force` to re-fetch.

| file | stored | used as |
|---|---|---|
| `earth-day.webp` | 2048x1024 | Earth albedo |
| `earth-night.webp` | 2048x1024 | Earth night lights (emissive) |
| `earth-clouds.webp` | 1024x512 | Earth cloud layer (alpha map, stored at 1K because it is soft) |
| `mars.webp` | 2048x1024 | Mars albedo |
| `jupiter.webp` | 2048x1024 | Jupiter albedo |
| `saturn.webp` | 1024x512 | Saturn albedo |
| `saturn-ring.webp` | 1024x63 | Saturn ring strip, alpha kept |
| `mercury.webp` | 1024x512 | Mercury albedo |
| `venus.webp` | 1024x512 | Venus surface albedo |
| `uranus.webp` | 1024x512 | Uranus albedo |
| `neptune.webp` | 1024x512 | Neptune albedo |
| `moon.webp` | 1024x512 | Moon albedo (Earth's moon) |
| `sun.webp` | 1024x512 | Sun photosphere |

Total 1,091 KB of webp for all thirteen (the cloud map was added after the
first pass, at 1K rather than 2K to keep it to 134 KB), which is the whole
texture budget of the solar system sim. Nothing here is a normal-map or a roughness map: the bodies
are lit by one point light and use flat roughness, which is stated in the sim's
"what this model leaves out" line rather than implied.

## Vendored code

### three.js 0.186.1

- Files: `assets/vendor/three/build/three.module.js`, `assets/vendor/three/build/three.core.js`
- License: MIT (`assets/vendor/three/LICENSE`, `assets/vendor/three/package.json`)
- Source: `https://registry.npmjs.org/three/-/three-0.186.1.tgz`
  (npm package `three@0.186.1`)
- Published: 2026-09-24 (19 days before this pass, satisfying the "pinned
  release at least two weeks old" rule)
- Retrieved: 2026-10-13
- sha256:
  - `three.core.js` `9edde002b066a9a05676a6127f67735b62baf399bdea529f2f7e31657da769e6`
  - `three.module.js` `9052042d676cb0fdc1ddfefe193053f34b7ac0513a616fdac4535d49987812ea`
- Size on disk: 2,120,885 bytes raw, 417,318 bytes gzipped as a web server
  would send it (`three.core.js` 1,458,113 raw / 286,517 gzip,
  `three.module.js` 662,772 raw / 130,801 gzip).

Why the split matters: from r168 on, `three.module.js` contains the WebGL
renderer and re-exports the rest from `./three.core.js`, which is a separate
file with no imports of its own. Both files are required; copying only
`three.module.js` produces a module that fails to resolve and a blank canvas.

`three.module.js` is loaded only by dynamic `import()` inside a 3D
simulation's sketch file, resolved against `document.baseURI`, so it is never
fetched by the gallery.

## What the solar system added to the gallery first load

`assets/orbital-elements.js` is loaded from a plain script tag in `index.html`,
like `assets/relativity.js` before it. Measured on disk, in bytes, by summing
every local script tag in `index.html`:

| | files | raw | gzip |
|---|---|---|---|
| without `orbital-elements.js` | 21 | 243,603 | 68,197 |
| with it | 22 | 256,609 | 73,090 |
| difference | +1 | **+13,006** | **+4,893** |

That is the whole cost, and it is charged to every gallery visit. The attempt to
move it behind a lazy load was abandoned deliberately: `gallery.js` takes the
value returned by `window.initSketch` as the live controller and calls
`destroy()` on it during teardown, so an `initSketch` that returned a promise
while the table loaded would leave the gallery unable to tear the simulation
down. Paying 4.9 KB gzipped once was judged better than a leak in the teardown
path that the 20-cycle test exists to catch. Three.js, which is 417 KB gzipped,
is still behind a dynamic `import()` and is not in any of these numbers.

The planet textures are not in the first load at all: they are fetched by the
simulation, and they total 958 KB of webp.

Gallery first-load JS, counted from the script tags in `index.html` and the
file sizes on disk (this is the number as measured before the pass above, kept
for history): **227,730 bytes in 20 local files, 62,377 bytes gzipped**,
plus p5.js from `cdnjs.cloudflare.com`. That number is identical before and
after vendoring three.js, because no script tag was added. Verified in the
browser as well: a gallery load reports `threeLoaded: false` and 21 JS
resources (20 local plus p5).

Correction: an earlier version of this file quoted 410,099 bytes for the
gallery, taken from one `performance.getEntriesByType('resource')` sample. A
re-run gave 227,730, which matches the on-disk count exactly, so the 410,099
figure was a caching artifact in resource timing and has been replaced. The
conclusion it was used to support, that the gallery does not fetch three.js,
held in both samples.

Do not hand-edit these files. To move to a new release, re-download the npm
tarball, replace all three files, and update the version, date and hashes in
this document.
