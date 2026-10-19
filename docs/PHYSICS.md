# VISIQ Physics

Equations, units, assumptions, and the tests that check each 3D hero. Nothing
here is claimed without a corresponding test or measurement.

## Conventions

- SI units unless noted. Distances in metres or astronomical units (AU),
  masses in kilograms or solar masses (M_sun), time in seconds or days.
- `G` = gravitational constant, `c` = speed of light, `M` = central mass,
  `r_s = 2GM/c^2` = Schwarzschild radius.
- Orbital elements are from NASA/JPL's published approximate position table
  (`assets/orbital-elements.js`), valid 1800 to 2050. The sim states when it
  extrapolates beyond that range.

## Hero 1: Black hole spacetime (`sketches/black-hole.js`)

### Model
Non-spinning (Schwarzschild) black hole only. The site states this on screen;
Kerr (spinning) is not shipped because the shadow has not been validated
against a published reference.

### Equations
- Schwarzschild radius: `r_s = 2GM / c^2`
- Photon sphere: `r = 1.5 * r_s = 3GM / c^2`
- Innermost stable circular orbit (ISCO): `r = 3 * r_s = 6GM / c^2`
- Shadow impact parameter: `b = 3 * sqrt(3) * GM / c^2`
- Gravitational redshift factor at radius `r`: `sqrt(1 - r_s / r)`
- Proper time from rest at `r0` to the singularity: `(pi / 2) * sqrt(r0^3 / (2GM))`
- Orbital precession per orbit (weak field): `6 * pi * GM / (c^2 * a * (1 - e^2))`

### Units
- Mass: solar masses, converted to kg for computation
- Distance: km or multiples of `r_s`
- Time: seconds (proper time) and distant-observer time, shown as two clocks
  in "fall in" mode

### Assumptions (stated in the sim's limits line)
- The hole does not spin (no frame dragging).
- The image is scale-free: the mass slider changes readouts, not shape.
- The disk is infinitely thin with no self-shadowing.
- The disk is animated at one orbit per 6 seconds at the ISCO, not the real
  period (4.55 ms for a 10 M_sun hole).

### Tests
`tests/relativity.test.js` — 35 tests covering Schwarzschild radii, photon
sphere, ISCO, redshift, precession, light deflection, and proper time.

## Hero 2: Solar system (`sketches/solar-system.js`)

### Model
Eight planets plus the Moon, integrated with RK4 under the Sun's gravity
(`centralForce3` in `assets/integrators.js`). True-scale mode and a readable
mode (labeled, with the exaggeration factor on screen). Light comes only from
the Sun.

### Equations
- Newtonian gravity: `F = G * M1 * M2 / r^2`
- Kepler's third law: `T^2 proportional to a^3`
- Vis-viva: `v^2 = GM * (2/r - 1/a)`
- Circular speed at 1 AU: `29.78 km/s`
- Hohmann transfer Earth to Mars: about 259 days
- Synodic period Earth-Mars: about 779.9 days
- Light travel time: 1 AU = 499.0 seconds

### Units
- Distance: AU (1 AU = 149,597,870,700 m exactly)
- Time: days (one second of wall clock = 10.0 days in the sim)
- Speed: km/s

### Assumptions
- Two-body approximation from the JPL table; perturbations not modeled (the
  giant planets' deviations are dominated by missing perturbation, not
  arithmetic error).
- The Moon is at 60 Earth radii in true-scale mode.
- One second of wall clock is 10.0 days; Earth's year takes 36.5 seconds.

### Tests
`tests/solar-system.test.js` — 13 tests covering Kepler's third law,
Earth-Moon barycentre distance, perihelion/aphelion, Mercury perihelion,
longitude closure, energy and angular momentum drift, Earth's speed and year,
and the Kepler solver residual.

## Hero 3: Earth and seasons (`sketches/earth-seasons.js`)

### Model
Earth with axial tilt, rendered with an atmosphere shader, ocean glint, and
city lights on the night side. The Sun is a parallel light source (no angular
size, no twilight, no eclipses).

### Equations
- Axial tilt: `23.44` degrees from the ecliptic pole
- Declination: varies between `+23.44` and `-23.44` degrees over the year
- Day length at latitude `phi` and declination `delta`:
  `day_length = (2 / 15) * arccos(-tan(phi) * tan(delta))` hours
- Perihelion: early January (4 January 2000 in the JPL table)
- Equation of time: about -14 to +16 minutes over the year
- Earth-Sun distance change: about 3.3 percent over the year

### Units
- Angle: degrees
- Time: hours (day length), minutes (equation of time)
- Distance: AU

### Assumptions (stated in the sim's limits line)
- Daylight uses the geometric definition: no atmospheric refraction, Sun as a
  point. Each day is about 6 to 15 minutes shorter than a sunrise-to-sunset
  table gives.
- Earth is a smooth sphere: no terrain, no mountains, no time zones.
- The globe turns at the sidereal rate with an arbitrary starting phase, so
  the longitude under the Sun is not the real one for a given clock time.
- The Sun is a parallel light source: no angular size, no twilight band, no
  eclipses.

### Tests
`tests/seasons.test.js` — 14 tests covering maximum/minimum declination,
solstice and equinox dates, day length at equator and 51.5 N, polar day/night
at 80 N, perihelion date, distance change, and axis unit-vector checks.

