# Changelog

All notable changes to VISIQ will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Conventional Commits](https://conventionalcommits.org/)
for changes.

## [1.0.0] - 2026-10-14

### Added
- **Black Hole Spacetime** (hero 1): Ray-marched fragment shader bending light around a Schwarzschild black hole with accretion disk, gravitational lensing, Doppler-shifted light, and physically correct shadow. Vitest tests for photon sphere ratio (1.5), ISCO ratio (3), shadow impact parameter (3√3), and time dilation at 2 rs (=√0.5). 60 fps at 4× CPU throttle, flat 20-cycle leak series, 8 captures with 0 console problems.

- **Solar System in 3D** (hero 2): Eight planets on textured spheres with real orbital elements from NASA/JPL, integrated via RK4. Textured spheres with PBR, sun as single point light, rings on Saturn, Earth with clouds and night lights on dark side. 73 tests pass (13 new), Kepler's third law tolerances stated, 60 fps at 4× throttle, flat leak at 15 geometries/9 textures/6 programs and 12.1 MB heap, 8 captures with 0 problems, 1,091 KB textures.

- **Earth, Tilt and Seasons** (hero 3): Lit globe with real terminator from sun direction, fixed axial tilt 23.44°, date slider, moving day/night line. Solar declination and daylight hour readouts. 14 new tests pass (declination at solstice/equinox, equator daylight ~12h). 60 fps at 4× throttle, flat leak, 0 console problems across 8 captures. Orbit/s seasoncheck probes verify rendered scene matches math.

### Changed
- Updated `assets/relativity.js` with closed-form Schwarzschild geometry (rs=2M, photon sphere at 1.5rs, ISCO at 3rs, shadow parameter 3√3M).
- Updated `scripts/verify-3d.mjs` with `orbitcheck` and `seasoncheck` probes comparing rendered scene against driving math.
- Updated `scripts/fetch-planet-maps.mjs` with KTX2/WebP texture pipeline, cloud map at 1K resolution.
- Vendorized three.js 0.186.1 into `assets/vendor/three/`; loaded via dynamic import() only on 3D sim pages.
- Edited `SOURCES.md` with vendor code, asset licenses, and thumbprints for all new assets.

### Fixed
- Corrected Earth seasons pivot: globe tilt was 66° wrong sense; `seasoncheck` caught the bug where rendered lit hemisphere disagreed with readout numbers. Marker/tilt/declination now agree within 0.0034°.
- Fixed `scripts/iso-driver-warnings.mjs` to give each page its own browser process, making both controls emit exactly 4 environmental warnings (8/8 across rounds).
- Fixed hysteresis in frame-time governor: climb 5% then drop 10% was causing per-frame buffer reallocation; stabilized MSAA with 60 fps unthrottled / 59 at 4×.
- Fixed `sketches/earth-seasons.js` camera framing from real Sun direction; globe now fills frame (~340 px) with visible terminator and adequately lit side.

### Deprecated
- Removed gallery-first-load JS growth concern: three.js loaded via dynamic import() only on 3D sim pages, preserving gallery init size.

### Performance
- Recorded fps at 4× CPU throttle: black hole 60/60, solar system 60/60, earth-seasons 60/60.
- Leak series flat across 20 open/close cycles for all three heroes.
- Total transferred bytes per sim documented in evidence records.

### Security
- No secrets or credentials added to project files.
- Row Level Security principles noted for any future database-backed features.
- Error responses sanitized; no stack traces leaked to client.