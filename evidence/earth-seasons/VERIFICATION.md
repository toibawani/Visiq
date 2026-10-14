# Earth, tilt and seasons: what was measured

Hero 3 of the 3D pass. Sim: `sketches/earth-seasons.js`, catalogue id
`earth-seasons`. Geometry from `assets/seasons.js`, the Earth's position from
`assets/orbital-elements.js`, rendering with the vendored three.js and the Solar
System Scope maps (CC BY 4.0).

As with the black hole and the solar system, everything below is a command
output. The things that were not checked are listed at the bottom.

## 1. Tests

`npx vitest run` -> **6 files, 73 tests, all passing**, of which 14 are new in
`tests/seasons.test.js`:

| assertion | stated bound | measured |
|---|---|---|
| maximum declination in the year | 23.44 ± 0.01 | 23.439 |
| date of that maximum | 21 June | 21 June 2000 |
| minimum declination | -23.44 ± 0.01 | -23.440 |
| date of that minimum | 21 December | 21 December 2000 |
| equinox crossing, month and magnitude | March, < 0.1 deg | March, 0.076 deg |
| declination on 2000-01-01 | -23.03 ± 0.05 | -23.034 |
| Sun's ecliptic longitude at the June solstice | 90 ± 1 deg | inside 89 to 91 |
| daylight at the equator, every declination of the year | 12.00 ± 0.01 h | 12.000 h |
| daylight at 51.5 N at the June solstice | 16.40 ± 0.05 h | 16.404 h |
| daylight at 51.5 N at the December solstice | 7.60 ± 0.05 h | 7.596 h |
| polar day / polar night at 80 N | 24 h / 0 h | 24 h / 0 h |
| perihelion date | within the first 7 days of January | 4 January 2000 |
| declination at that perihelion | < -22 deg | -22.7 deg |
| distance change over the year | 3.3 ± 0.05 percent | 3.30 percent |
| axis is a unit vector, tilt from the ecliptic pole | 1.0, 23.44 ± 0.01 | 1.0, 23.44 |
| axis component along the equinox direction | 0 | 0 |

The 51.5 N numbers are geometric. A published sunrise-to-sunset figure for
London on 21 June is about 16 h 38 m; the 14 minute difference is atmospheric
refraction and the Sun's angular radius, both of which the model leaves out and
the limits line states.

## 2. The scene against the module (`scripts/verify-3d.mjs seasoncheck`)

This is the check that earned its keep. It parks the clock on 21 June, then
compares what the rendered scene is doing with what the module computed, all
inside the live page. Raw: `seasoncheck.json`.

```
probe date 20 Jun 2026
  tiltAppliedDeg                  = 23.44
  tiltFromModuleDeg               = 23.44
  declinationFromModuleDeg        = 23.4354
  declinationInSceneDeg           = 23.4354
  subSolarMarkerLatDeg            = 23.432
  markerMinusDeclination          = -0.0034
  daylightInSceneHours            = 16.4028
  daylightFromModuleHours         = 16.4028
  lightVersusEarthPositionDeg     = 180
```

The Sun's light direction is 180.000000 degrees from the Earth's heliocentric
direction, so the light really is coming from where the Sun is. The sub-solar
marker lands within 0.0034 degrees of the declination (it is one frame stale
because the clock is paused mid-frame). The day length in the scene equals the
module's value exactly.

On the same run, the readouts verbatim:

```
Date                              20 Jun 2026
Sub-solar latitude                23.44 deg (north)
Daylight at this latitude         16 h 24 m
Solar noon altitude               61.9 deg above the horizon
Earth-Sun distance                1.01618 AU
Distance rank in the year         further than average
Sunlight relative to the annual mean  0.968 x
Daylight at the equator           12 h 00 m
```

61.9 degrees is what 90 - |51.5 - 23.44| gives, so the noon altitude, the
declination and the chosen latitude are consistent with each other. The distance
is 1.016 AU on the June solstice and the sunlight is 3.2 percent below the annual
mean, which is the point of the sim: northern summer happens when the Earth is
near its furthest, not its closest.

## 3. Frame rate

| setting | avg ms | fps | median ms | worst ms | frames > 25 ms | scale |
|---|---|---|---|---|---|---|
| unthrottled | 16.67 | **60.0** | 16.7 | 16.8 | **0** | 0.85 |
| 4x CPU throttle | 16.67 | **60.0** | 16.7 | 16.8 | **0** | 0.85 |

Both runs are against the committed code, raw output in `fps-0.json` and
`fps-4.json`. Earlier runs of the same harness, before the governor fix and the
multisampling decision, reported 54.6 fps with 31 long frames.

Two measured decisions are behind these numbers, both in comments in the source:

- Multisampling is off. With `antialias: true` the same run reported **54.6 fps
  with 31 frames over 25 ms**; with it off, 60.0 and zero, at both throttle
  settings. A globe fills the frame and its edges are where the samples go. The
  cost is a slightly harder limb.
- The governor's climb threshold is 0.8 of the frame budget, not 1.06. Treating
  a vsync-locked 16.7 ms frame as headroom made it climb 5 percent and fall 10
  percent forever, and every step reallocates the drawing buffer: that was an
  83 ms worst frame.

## 4. Leak test, 20 open/close cycles (`leak earth-seasons 20`)

```
per cycle, all 20: geometries 6, textures 5, programs 6, sim canvases 2
heap: 12,700,000 bytes in every cycle, and the same after forced GC
first: calls 6, triangles 7496      last: calls 6, triangles 7496
```

Raw: `leak-20-cycles.json`. Nothing is retained.

## 5. Screenshots (`sheets earth-seasons`)

8 captures, 1440x900 and 375x812, dark and light, first frame and 10 seconds
later, **0 console problems** (`sheets.json`). Canvas 931x394 desktop, 353x398
phone.

| capture | mean rgb | bright pixels | blue-dominant | scale |
|---|---|---|---|---|
| 1440x900 dark t0 / t10 | 14.9,19.1,28.1 / 16.8,21.1,30.9 | 1.4% / 2.2% | 54.9% / 55.4% | 0.85 |
| 1440x900 light t0 / t10 | 154.3,157.1,161.9 / 155.2,158.4,164.1 | 60.3% / 60.7% | 6.1% / 6.9% | 0.85 |
| 375x812 dark t0 / t10 | 23.5,30.6,46.8 / 23.2,31.4,50.2 | 3.3% / 1.9% | 62.9% / 65.3% | 1.00 |
| 375x812 light t0 / t10 | 144.1,149.6,158.3 / 145,151.4,161.6 | 54% / 54.5% | 17.8% / 19.9% | 1.00 |

### What the captures contain, from their pixels

No human has seen these frames. The preview webview on this machine is not
compositing, so the description below comes from
`node scripts/describe-shot.mjs <png> <cols> <rows> <crop>`, which prints a
luminance map and the brightest cells.

- The globe is the only large object: in a crop of the canvas it spans about
  350 of the 931 pixels across, roughly 74 percent of the visible height, so it
  is not a dot.
- The lit side is on the right of the disc and the dark side on the left, with
  the transition between them running down the middle: in the map the left third
  reads at luminance 30 to 60 and the right side reaches 178 at the brightest
  cell, falling back toward the limb because a sphere seen at an angle darkens
  there. The brightest cells are 176,177,187 (bluish, cloud or ocean) next to
  186,165,129 (warm, land), which is the mixed albedo map rather than a flat
  colour.
- The dark half is not quite black: city lights show at a low level on it, which
  is the emissive map multiplied by the night factor so it cannot paint the day
  side.
- Between t0 and t10 the mean channel values move by a few units, which is the
  clock running and the globe turning.
- The star field is a scatter of single pixels with no magnitude spread.

## 6. The limits line, verbatim from the live page

> What this model leaves out: daylight hours use the geometric definition, so
> there is no atmospheric refraction and the Sun is treated as a point. That
> makes each day about 6 to 15 minutes shorter than a sunrise-to-sunset table
> gives, depending on latitude; at 51.5 degrees north the model says 16 h 24 m at
> the June solstice against about 16 h 38 m published. The Earth is a smooth
> sphere: no terrain, no mountains, no time zones, and the globe turns at the
> sidereal rate with an arbitrary starting phase, so the longitude under the Sun
> is not the real one for a given clock time even though the latitude of the
> sub-solar point is. The Sun is a parallel light source, so its angular size,
> the twilight band and eclipses are absent. The orbit is the two-body
> approximation from the JPL table: the distance, the declination and the date of
> perihelion are from that table, and the table is only valid from 1800 to 2050.

And the readout the sim produces for its own state, verbatim from `describe()`
on the same run:

> Earth on 20 Jun 2026. The sub-solar latitude is 23.4 degrees, so the Sun is
> overhead at 23 degrees north. 52 degrees north gets 16 h 24 m of daylight. The
> Earth is 1.0162 AU from the Sun, 1.62 percent from its mean distance. Paused.

## 7. What is not done or not checked

- No human has looked at a frame, for the compositing reason above.
- Touch feel and `prefers-reduced-motion` behaviour: implemented, unverified.
- fps on a mid-range phone: unknown. 4x CPU throttle is not a phone.
- No terrain, no normal maps, no twilight, no eclipse, no time zones, and the
  spin phase is arbitrary so the night side is not the real night side for a
  given clock time.
- The tilted globes are drawn at true relative size only in the sense that there
  is one globe: there is no scale mode here and none is needed.

## 8. Things I got wrong, and how they were caught

1. **The rendered tilt was wrong and the readout was right.** I rotated the
   pivot by `-tilt` instead of `90 - tilt`, which leaned the pole 66 degrees the
   wrong way, so the lit hemisphere would have been the wrong one in June while
   every readout still said 23.44. `seasoncheck` caught it by comparing the
   sub-solar marker's latitude with the declination: they disagreed by 29
   degrees.
2. **The opening camera showed the night side.** A fixed azimuth and polar on
   14 October put the camera away from the Sun; the capture was a black globe
   with a faint lit sliver (brightest cell 51 of 255). The camera is now built
   from the Sun's direction, 42 degrees around and 18 degrees above the plane.
3. **The governor flapped**, climbing and falling forever and reallocating the
   drawing buffer on each step: 83 ms worst frame.
4. **Multisampling cost more than it was worth** at this fill rate: 54.6 fps and
   31 long frames against 60.0 and zero.
5. **The harness's June-solstice offset was computed against the wrong epoch**,
   so the first seasoncheck parked on 15 May and still printed a full set of
   numbers. It now re-zeroes the slider and reads the date back first.
6. The readout trap from the solar system (SimBase only writes keys that existed
   at the first `getReadouts()` call) was avoided here by listing all eleven keys
   up front; it is worth recording that this is a trap, because it silently hides
   rows rather than failing.
