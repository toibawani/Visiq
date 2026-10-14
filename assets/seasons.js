// ===== VISIQ SEASONS AND ILLUMINATION =====
// The geometry that makes seasons: a spin axis fixed in space, the Sun's
// direction changing as the Earth goes round its orbit, and the day length that
// follows from the two. Nothing here is a fitted curve.
//
// The input is the Earth's heliocentric position, which comes from the JPL
// element table in assets/orbital-elements.js. The output is the sub-solar
// latitude (solar declination) and the daylight hours at any latitude.
//
// Formulae, all standard spherical astronomy:
//   lambda_sun  = ecliptic longitude of the Sun as seen from the Earth
//                 = (Earth's heliocentric longitude) + 180 degrees. The J2000
//                 ecliptic frame has its x axis toward the vernal equinox, which
//                 is what makes the frame's longitude the right input here.
//   delta       = asin( sin(eps) * sin(lambda_sun) )   sub-solar latitude
//   cos(H0)     = -tan(phi) * tan(delta)               sunset hour angle
//   daylight    = 2 * H0 / 15 hours when |cos H0| <= 1, else 0 or 24
//   cos(z)      = sin(phi) sin(delta) + cos(phi) cos(delta) cos(H)  incidence
//
// Reference for the declination and hour-angle relations: any spherical
// astronomy text, e.g. Meeus, "Astronomical Algorithms", ch. 13 and 15.
//
// Works in the browser (window.VisiqSeasons) and in Node (module.exports) so
// the known-answer tests run without a canvas.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.VisiqSeasons = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var RAD = Math.PI / 180;
    var DEG = 180 / Math.PI;

    // The Earth's axial tilt. The IAU value for the mean obliquity of the
    // ecliptic at J2000 is 23.4392911 degrees; the sim uses 23.44 and says so.
    var AXIAL_TILT_DEG = 23.44;

    function wrap180(deg) {
        var d = (deg + 180) % 360;
        if (d < 0) d += 360;
        return d - 180;
    }

    // Ecliptic longitude of the Sun as seen from the Earth, in degrees, from the
    // Earth's heliocentric position. The ecliptic frame's x axis points to the
    // vernal equinox, so this longitude is measured from the right place.
    function sunEclipticLongitude(earthPos) {
        var lon = Math.atan2(-earthPos.y, -earthPos.x) * DEG;
        return ((lon % 360) + 360) % 360;
    }

    // Sub-solar latitude (solar declination) in degrees: positive means the Sun
    // is overhead in the northern hemisphere. This is the angle that makes
    // northern summer, and it depends only on the tilt and the Sun's longitude,
    // not on the Earth-Sun distance.
    function solarDeclination(earthPos, tiltDeg) {
        var eps = (tiltDeg === undefined ? AXIAL_TILT_DEG : tiltDeg) * RAD;
        var lambda = sunEclipticLongitude(earthPos) * RAD;
        return Math.asin(Math.sin(eps) * Math.sin(lambda)) * DEG;
    }

    // Sunset hour angle in degrees at latitude phi for declination delta.
    // Returns 180 for polar day and 0 for polar night, which is what the
    // clamped cosine means.
    function sunsetHourAngleDeg(latDeg, declDeg) {
        var cosH = -Math.tan(latDeg * RAD) * Math.tan(declDeg * RAD);
        if (cosH <= -1) return 180;
        if (cosH >= 1) return 0;
        return Math.acos(cosH) * DEG;
    }

    // Daylight hours at a latitude for a given declination. Ignores refraction
    // and the Sun's angular radius: the sim's limits line says so, and the test
    // tolerances are set with that in mind (about 4 minutes at mid latitudes).
    function daylightHours(latDeg, declDeg) {
        return sunsetHourAngleDeg(latDeg, declDeg) * 2 / 15;
    }

    // Cosine of the solar zenith angle at latitude phi, declination delta and
    // hour angle H (degrees, 0 at local noon). 1 means the Sun is overhead.
    function incidenceCosine(latDeg, declDeg, hourAngleDeg) {
        var phi = latDeg * RAD, d = declDeg * RAD, H = hourAngleDeg * RAD;
        return Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H);
    }

    // The unit vector of the Earth's spin axis in the ecliptic frame, with the
    // axis fixed in space: it tilts by eps and its ascending node sits at the
    // vernal equinox, so the axis points along the ecliptic's y-z plane at a
    // latitude of (90 - eps). Only used for drawing the axis.
    function axisVector(tiltDeg) {
        var eps = (tiltDeg === undefined ? AXIAL_TILT_DEG : tiltDeg) * RAD;
        return { x: 0, y: Math.sin(eps), z: Math.cos(eps) };
    }

    // Geographic latitude and longitude of the point where the Sun is
    // overhead, given the Earth's rotation angle (degrees, 0 = the prime
    // meridian facing the Sun).
    function subsolarPointOnEarth(earthPos, tiltDeg, rotationDeg) {
        var delta = solarDeclination(earthPos, tiltDeg);
        // The hour angle of the prime meridian: the longitude where the Sun is
        // overhead is the one whose local time is noon.
        var lon = -wrap180(rotationDeg);
        return { lat: delta, lon: lon };
    }

    return {
        AXIAL_TILT_DEG: AXIAL_TILT_DEG,
        sunEclipticLongitude: sunEclipticLongitude,
        solarDeclination: solarDeclination,
        sunsetHourAngleDeg: sunsetHourAngleDeg,
        daylightHours: daylightHours,
        incidenceCosine: incidenceCosine,
        axisVector: axisVector,
        subsolarPointOnEarth: subsolarPointOnEarth
    };
}));
