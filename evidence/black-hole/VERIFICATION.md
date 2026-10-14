# Hero 1 - Black Hole Spacetime: verification

Every number below is pasted from a run of `scripts/verify-3d.mjs` against a
real Chromium (Playwright, Apple M1 via ANGLE/Metal) on a local no-store
server. Raw files live next to this document: `sheets.json`, `fps.json`,
`fps-throttle4.json`, `leak.json`, `console.json`, and the eight PNG captures
`black-hole-{1440x900,375x812}-{dark,light}-{t0,t10}.png`.

## 1. Screenshots - 1440 and 375, dark and light, first frame and +10 s

All eight captures exist (see the PNGs). Pixel statistics from `sheets.json`:

```
 1440x900  dark  t0 | meanRGB=[13.0, 16.0, 24.2] bright%=1.2 blue%=57.9 | q={scale:0.72, steps:300, frameMs:29.6}
 1440x900  dark t10 | meanRGB=[12.9, 16.0, 24.0] bright%=1.3 blue%=57.3 | q={scale:0.64, steps:300, frameMs:19.5}
 1440x900 light  t0 | meanRGB=[153.3,155.1,159.1] bright%=60.7         | q={scale:0.72, steps:300, frameMs:29.7}
 1440x900 light t10 | meanRGB=[153.1,154.9,158.8] bright%=60.7         | q={scale:0.64, steps:300, frameMs:19.9}
 375x812   dark  t0 | meanRGB=[18.9, 22.8, 33.2] bright%=3.4           | q={scale:1.00, steps:180, frameMs:17.0}
 375x812   dark t10 | meanRGB=[17.7, 21.4, 31.2] bright%=3.1           | q={scale:1.00, steps:240, frameMs:16.7}
 375x812  light  t0 | meanRGB=[139.4,142.1,149.1] bright%=54.6         | q={scale:1.00, steps:180, frameMs:17.0}
 375x812  light t10 | meanRGB=[139.5,142.0,148.3] bright%=54.7         | q={scale:1.00, steps:240, frameMs:16.7}
problemCount: 4 (all "GPU stall due to ReadPixels", see section 4)
```

**What the captures look like, described in words.**

Dark, 1440 (viewed live and as `crops/canvas-dark-t10.png`): black starfield,
a crisp black shadow ring dead centre, and the disk reading as a bright
blue-white band crossing the frame with the far side lensed into an arc over
the top of the shadow. Below the band the sky is genuinely dark - measured
row at 82% canvas height has mean luminance 0.7, versus the band row at 49%
with mean 44.7 and peak pixel 233. The right side of the disk is measurably
brighter than the left (mean 70.2 vs 45.0, ratio 1.56), which is the
approaching side beaming at the camera. The flux-graph overlay sits in the
bottom-left corner: title "Disk flux (relative)" at the left, "peak at
4.1 rs" right-aligned, no overlap (`crops/graph-t10.png`, viewed at 3x).

**Still looks fake:** the disk is white-blue across its whole length. That
is what the physics gives (peak temperature 177.8 kK at 1e8 M_sun, still
tens of thousands of kelvin at the outer edge, so the blackbody colour never
reaches the warm orange that documentaries art-direct in), but the eye reads
it as cold fog rather than fire. The turbulence arms are blocky at render
scale 0.64 because they are hash cells sampled below their natural
resolution. Stars are procedural hashes, not a catalogue - fine as texture,
wrong if you count them.

Light, 1440: the page chrome flips to light (full-page mean RGB 153 vs 13
in dark, bright-pixel share 60.7% vs 1.2%), and the canvas itself is
pixel-identical to the dark capture (every row-mean matches to 0.1) - space
stays black in light mode, which is correct.

375x812 (phone): sim stacks vertically, canvas full-width, render scale
holds 1.0 with march steps climbing 180 -> 240 across the 10 s window -
the governor spends its headroom on steps, not resolution, at phone size.

## 2. Frame rate (8 s sample, rAF deltas)

```
no throttle: frames=451 avg=17.79ms fps=56.2 median=16.7ms worst=33.4ms over25ms=30
            quality={scale:0.56, steps:324, frameMs:16.66}
4x throttle: frames=452 avg=17.78ms fps=56.2 median=16.7ms worst=50ms  over25ms=29
            quality={scale:0.43, steps:312, frameMs:16.67}
```

Median 16.7 ms is vsync-locked 60 fps in both runs. Under 4x CPU throttle
the quality governor drops render scale 0.56 -> 0.43 and the frame rate does
not move: on slower hardware the sim trades resolution for smoothness
instead of stuttering.

## 3. Leak - 20 open/close cycles (`leak.json`)

```
geometries per cycle: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
textures   per cycle: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
programs   per cycle: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
canvases: 3 page-wide (2 sim: WebGL + 2d flux overlay) - identical first and last
JS heap: 10.0 MB (cycle 1) -> 10.0 MB (cycle 20) -> 10.0 MB after forced GC
```

Flat. Teardown disposes geometry, material, LUT texture and renderer, and
drops its own context-lost listener before forcing the loss.

## 4. Console

Headed browser (the real browser the preview panel uses), after the sketch
and three.js fully loaded and rendering - full log:

```
[log] [AUTH] Session found, showing app ... [log] [GALLERY] Ready with simulations
[log] [THEME] Initialized in dark mode ... [log] [KEYBOARD] Dynamic shortcuts engine loaded
[log] [GALLERY] Opening simulation: black-hole
[log] [GALLERY] Loading sketch: black-hole
[log] [GALLERY] Simulation opened: Black Hole Spacetime
[log] [GALLERY] Sketch script loaded: black-hole
```

16 lines, **zero errors, zero warnings**.

Headless runs report 4 problems: `GL Driver Message ... GPU stall due to
ReadPixels` (the fourth says "this message will no longer repeat" -
Chromium dedupes per GPU process, which is why only one cell lists them).

Isolation (`scripts/iso-driver-warnings.mjs`, raw output
`evidence/webgl-warnings.json`): two control pages, each in its own fresh
browser process, two rounds with alternating order:

```
round 1: plain WebGL2 clear loop = 4 warnings | stock three.js box = 4 warnings
round 2: plain WebGL2 clear loop = 4 warnings | stock three.js box = 4 warnings
verdict: both control pages warn in fresh processes: the four GL driver
         warnings are environmental (headless compositor readback),
         not sim code
```

This corrects an earlier isolation run of mine that shared one browser
across both control pages: the per-GPU-process dedup attributed all four
warnings to whichever page rendered first and made the other look clean,
which is how I previously concluded "plain WebGL2 emits none".
Order-independent, the driver warns regardless of what code renders.
No page error, no page warning from sim code, in any run.

## 5. Physics cross-checks (pixels, not claims)

```
probe: shadow radius measured 59 px vs predicted 56.9 px (ratio 1.04)
       circular in all 16 probe directions; Doppler left/right = 0.64
default page (10 M_sun), read verbatim from the live DOM:
       r_s 29.5 km, photon sphere 44.3 km, ISCO 88.6 km,
       shadow 153.5 km, dilation 0.9129 at 6.00 r_s,
       disk peak T 10.00 MK, ISCO orbital period 4.55 ms
after the console harness drags the mass slider to max (1e8 M_sun):
       r_s 295.40 million km (2GM/c^2 exact), disk peak T 177.8 kK
       (T_peak ~ M^-1/4 law: 10 MK * (1e7)^-1/4 = 177.8 kK),
       ISCO period 12.64 h - all consistent, nothing NaN
tests: 37/37 pass (tests/relativity.test.js, tests/orbit-drift.test.js)
```

## 6. The sim's own limits line (shown under the controls, read verbatim from the live DOM at default mass)

> What this model leaves out: the hole does not spin (no Kerr frame
> dragging), the image is scale-free so the mass slider changes the
> readouts and not the shape, the disk is infinitely thin with no
> self-shadowing, and the spectral peak for this mass is 10.00 MK, which
> is X-ray for stellar-mass holes and not what a camera would collect.
> The animation shows the disk at one orbit per 6 seconds at the ISCO
> rather than at the real period of 4.55 ms.

## 7. Honest gate status

- Screenshots 1440/375, dark/light, t0/t10: **captured and described**.
- fps measured, throttle path measured: **yes**.
- 20-cycle leak numbers: **flat**.
- Zero console errors/warnings: **yes in the headed browser**; the 4
  headless warnings are reproducible with stock three.js and are caused by
  the measurement machinery itself (documented above, not hidden).
- Limits line in the sim: **present, quoted above**.
- What still looks fake: warm-colour disk (blocked by honest blackbody
  temperatures), blocky turbulence at low render scale, procedural stars.
