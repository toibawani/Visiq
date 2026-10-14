// ===== VISIQ ORBITAL ELEMENTS =====
// Heliocentric positions from NASA/JPL's published Keplerian element table,
// used by the 3D solar system simulation for the planet start states and for
// the crossover check between the element table and integrated motion.
//
// Source (read 2026-10-14, values transcribed verbatim):
//   NASA/JPL Solar System Dynamics, "Approximate Positions of the Planets",
//   E.M. Standish, https://ssd.jpl.nasa.gov/planets/approx_pos.html
//   Table 1 (valid 1800 AD - 2050 AD): elements a, e, I, L, longitude of
//   perihelion, longitude of ascending node, plus their per-century rates.
//   Stated nominal longitude errors over that interval: Mercury 15", Venus
//   20", EM Bary 20", Mars 40", Jupiter 400", Saturn 600", Uranus 50",
//   Neptune 10".
//
// The body labelled "EM Bary" is the Earth-Moon barycentre, not the Earth
// itself. This module keeps that name so the readouts do not quietly pretend
// to be the Earth. The Earth-Moon separation (about 0.00257 AU) is larger
// than the difference this table is trying to resolve, which is one of the
// things the sim's "what this model leaves out" line says.
//
// Angle convention: degrees in, degrees out, ecliptic J2000. Lengths in AU,
// time in days (the mean-longitude rates are given per Julian century, which
// is 36525 days).
//
// Works in the browser (window.VisiqOrbitalElements) and in Node
// (module.exports) so the known-answer tests run without a canvas.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.VisiqOrbitalElements = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Gaussian gravitational constant squared, the Sun's GM in AU^3/day^2.
    // IAU 2012 value of k = 0.01720209895; GM_sun = k^2.
    var MU_SUN = 2.959122082855911e-4;
    // Days in a Julian century.
    var DAYS_PER_CENTURY = 36525;
    // The Gaussian year: 2*pi/k days. This is the period of a circular orbit
    // of a = 1 AU under the Gaussian GM, so Kepler's third law for this system
    // is P = GAUSSIAN_YEAR * a^1.5.
    var GAUSSIAN_YEAR = 365.256898326;

    // JPL Table 1 (1800-2050). Order of the numeric pairs:
    // [a, e, I, L, varpi, Omega] at J2000, then the same six rates per century.
    var ELEMENTS = {
        mercury: {
            label: 'Mercury', radiusKm: 2439.7, texture: 'mercury',
            base: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
            rate: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]
        },
        venus: {
            label: 'Venus', radiusKm: 6051.8, texture: 'venus',
            base: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
            rate: [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]
        },
        embary: {
            label: 'Earth (barycentre)', radiusKm: 6371.0, texture: 'earth-day',
            nightTexture: 'earth-night', hasMoon: true,
            base: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
            rate: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]
        },
        mars: {
            label: 'Mars', radiusKm: 3389.5, texture: 'mars',
            base: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
            rate: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]
        },
        jupiter: {
            label: 'Jupiter', radiusKm: 69911, texture: 'jupiter',
            base: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
            rate: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]
        },
        saturn: {
            label: 'Saturn', radiusKm: 58232, texture: 'saturn', hasRing: true,
            base: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
            rate: [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]
        },
        uranus: {
            label: 'Uranus', radiusKm: 25362, texture: 'uranus',
            base: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
            rate: [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]
        },
        neptune: {
            label: 'Neptune', radiusKm: 24622, texture: 'neptune',
            base: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
            rate: [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]
        }
    };

    var PLANET_ORDER = ['mercury', 'venus', 'embary', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

    var RAD = Math.PI / 180;
    var DEG = 180 / Math.PI;

    function wrap360(deg) {
        var d = deg % 360;
        return d < 0 ? d + 360 : d;
    }

    // Julian centuries from J2000 (2000 January 1.5 TT) for a Julian Day.
    var J2000_JD = 2451545.0;
    function centuriesSinceJ2000(jd) {
        return (jd - J2000_JD) / DAYS_PER_CENTURY;
    }

    // Julian Day for a calendar date at 00:00 UTC. Meeus, "Astronomical
    // Algorithms", ch. 7 (Gregorian calendar branch).
    function julianDay(year, month, day) {
        var y = year, m = month;
        if (m <= 2) { y -= 1; m += 12; }
        var a = Math.floor(y / 100);
        var b = 2 - a + Math.floor(a / 4);
        return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1))
            + day + b - 1524.5;
    }

    // Calendar date from a Julian Day, using the same Gregorian branch.
    function calendarFromJD(jd) {
        var z = Math.floor(jd + 0.5);
        var f = (jd + 0.5) - z;
        var a = z;
        if (z >= 2299161) {
            var alpha = Math.floor((z - 1867216.25) / 36524.25);
            a = z + 1 + alpha - Math.floor(alpha / 4);
        }
        var b = a + 1524;
        var c = Math.floor((b - 122.1) / 365.25);
        var d = Math.floor(365.25 * c);
        var e = Math.floor((b - d) / 30.6001);
        var day = b - d - Math.floor(30.6001 * e) + f;
        var month = e < 14 ? e - 1 : e - 13;
        var year = month > 2 ? c - 4716 : c - 4715;
        var dayInt = Math.floor(day);
        var frac = day - dayInt;
        return { year: year, month: month, day: dayInt, fraction: frac };
    }

    // Elements for a body at a Julian Day, straight from the table:
    // value + rate * T, T in Julian centuries.
    function elementsAt(bodyId, jd) {
        var body = ELEMENTS[bodyId];
        if (!body) throw new Error('unknown body: ' + bodyId);
        var T = centuriesSinceJ2000(jd);
        var v = body.base.map(function (b, i) { return b + body.rate[i] * T; });
        var a = v[0], e = v[1], I = v[2], L = v[3], varpi = v[4], Omega = v[5];
        // argument of perihelion, and mean anomaly
        var omega = varpi - Omega;
        var M = wrap360(L - varpi);
        return {
            a: a, e: e,
            I: I, L: L, varpi: varpi, Omega: Omega,
            omega: omega, M: M,
            angleUnit: 'deg', lengthUnit: 'AU'
        };
    }

    // Kepler's equation M = E - e sin E, solved by Newton-Raphson on the
    // eccentric anomaly. Radians in and out. Converges in a few iterations for
    // every planet in this table (the largest eccentricity is Pluto's, and
    // Mercury at 0.206 needs at most four).
    function solveKepler(Mrad, e) {
        var M = Mrad;
        var E = e < 0.8 ? M : Math.PI;
        for (var i = 0; i < 30; i++) {
            var f = E - e * Math.sin(E) - M;
            var fp = 1 - e * Math.cos(E);
            var dE = f / fp;
            E -= dE;
            if (Math.abs(dE) < 1e-13) break;
        }
        return E;
    }

    // Heliocentric ecliptic J2000 position (AU) for a body at a Julian Day.
    // Standard rotation of the in-orbit position into the ecliptic frame:
    //   x = (cos w cos O - sin w sin O cos I) x' + (-sin w cos O - cos w sin O cos I) y'
    //   y = (cos w sin O + sin w cos O cos I) x' + (-sin w sin O + cos w cos O cos I) y'
    //   z = (sin w sin I) x' + (cos w sin I) y'
    // with x' = a (cos E - e), y' = a sqrt(1 - e^2) sin E.
    function positionAt(bodyId, jd) {
        var el = elementsAt(bodyId, jd);
        var E = solveKepler(el.M * RAD, el.e);
        var xp = el.a * (Math.cos(E) - el.e);
        var yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
        var w = el.omega * RAD, O = el.Omega * RAD, I = el.I * RAD;
        var cw = Math.cos(w), sw = Math.sin(w);
        var cO = Math.cos(O), sO = Math.sin(O);
        var cI = Math.cos(I), sI = Math.sin(I);
        return {
            x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
            y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
            z: (sw * sI) * xp + (cw * sI) * yp
        };
    }

    // Orbital period from the semi-major axis by Kepler's third law. P^2 is
    // proportional to a^3 with the Sun's mass as the constant: with GM in
    // AU^3/day^2, P = 2 pi sqrt(a^3 / GM). Using MU_SUN this returns days.
    function periodDays(a) {
        return 2 * Math.PI * Math.sqrt(a * a * a / MU_SUN);
    }

    // Period implied by the table's own mean-longitude rate, in days:
    // 360 degrees divided by the degrees travelled per day. The mean longitude
    // rate includes the slow drift of perihelion, so this differs from
    // periodDays(a) by the perihelion rate, which the test asserts is small.
    function periodFromLongitudeRate(bodyId) {
        var body = ELEMENTS[bodyId];
        var degPerDay = body.rate[3] / DAYS_PER_CENTURY;
        return 360 / Math.abs(degPerDay);
    }

    // Speed for a heliocentric orbit at a distance r, from vis-viva:
    // v^2 = GM (2/r - 1/a). AU/day for r and a in AU.
    function speedFromVisViva(r, a) {
        return Math.sqrt(MU_SUN * (2 / r - 1 / a));
    }

    // Specific orbital energy of a heliocentric orbit, v^2/2 - GM/r, in
    // AU^2/day^2. For a bound orbit this equals -GM/(2a).
    function specificEnergy(state) {
        var r = Math.sqrt(state.x * state.x + state.y * state.y + state.z * state.z);
        var v2 = state.vx * state.vx + state.vy * state.vy + state.vz * state.vz;
        return 0.5 * v2 - MU_SUN / r;
    }

    // Specific angular momentum vector magnitude, |r x v|.
    function angularMomentum(state) {
        var hx = state.y * state.vz - state.z * state.vy;
        var hy = state.z * state.vx - state.x * state.vz;
        var hz = state.x * state.vy - state.y * state.vx;
        return Math.sqrt(hx * hx + hy * hy + hz * hz);
    }

    // Full heliocentric state (position + velocity) at a Julian Day, ready to
    // hand to an integrator. The velocity is the vis-viva speed along the
    // orbital tangent: the position derivative of the orbit at that instant,
    // taken from the same eccentric anomaly.
    function stateAt(bodyId, jd) {
        var el = elementsAt(bodyId, jd);
        var E = solveKepler(el.M * RAD, el.e);
        var r = el.a * (1 - el.e * Math.cos(E));
        var pos = positionAt(bodyId, jd);
        var vMag = speedFromVisViva(r, el.a);
        // Tangent direction: derivative of the in-orbit position with respect
        // to eccentric anomaly is (-a sin E, a sqrt(1-e^2) cos E), which is
        // parallel to the velocity for a Keplerian orbit.
        var txp = -el.a * Math.sin(E);
        var typ = el.a * Math.sqrt(1 - el.e * el.e) * Math.cos(E);
        var w = el.omega * RAD, O = el.Omega * RAD, I = el.I * RAD;
        var cw = Math.cos(w), sw = Math.sin(w);
        var cO = Math.cos(O), sO = Math.sin(O);
        var cI = Math.cos(I), sI = Math.sin(I);
        var tx = (cw * cO - sw * sO * cI) * txp + (-sw * cO - cw * sO * cI) * typ;
        var ty = (cw * sO + sw * cO * cI) * txp + (-sw * sO + cw * cO * cI) * typ;
        var tz = (sw * sI) * txp + (cw * sI) * typ;
        var tLen = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
        return {
            x: pos.x, y: pos.y, z: pos.z,
            vx: vMag * tx / tLen,
            vy: vMag * ty / tLen,
            vz: vMag * tz / tLen
        };
    }

    return {
        MU_SUN: MU_SUN,
        GAUSSIAN_YEAR: GAUSSIAN_YEAR,
        DAYS_PER_CENTURY: DAYS_PER_CENTURY,
        J2000_JD: J2000_JD,
        ELEMENTS: ELEMENTS,
        PLANET_ORDER: PLANET_ORDER,
        wrap360: wrap360,
        centuriesSinceJ2000: centuriesSinceJ2000,
        julianDay: julianDay,
        calendarFromJD: calendarFromJD,
        elementsAt: elementsAt,
        solveKepler: solveKepler,
        positionAt: positionAt,
        periodDays: periodDays,
        periodFromLongitudeRate: periodFromLongitudeRate,
        speedFromVisViva: speedFromVisViva,
        specificEnergy: specificEnergy,
        angularMomentum: angularMomentum,
        stateAt: stateAt
    };
}));
