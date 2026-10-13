# Sources, licenses and thumbprints

Everything in the project that did not come from the repository author is
listed here, with the licence checked before use. If a licence was not clear,
the asset was not used, and that decision is recorded rather than hidden.

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
fetched by the gallery. Measured on the gallery page before and after this
vendoring: 21 JS resources, 410,099 bytes, unchanged (see
`SIM-3D-AUDIT.md` and the hero report for the raw numbers).

Do not hand-edit these files. To move to a new release, re-download the npm
tarball, replace all three files, and update the version, date and hashes in
this document.
