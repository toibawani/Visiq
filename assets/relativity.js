// ===== VISIQ SCHWARZSCHILD GEOMETRY =====
// Closed-form quantities for a non-rotating (Schwarzschild) black hole, in the
// forms the black-hole simulation needs for its readouts and its shader.
//
// Geometric units: G = c = 1, lengths in units of the mass M = GM/c^2.
// The Schwarzschild radius is then rs = 2M, the photon sphere sits at
// r = 3M = 1.5 rs, and the innermost stable circular orbit at r = 6M = 3 rs.
// SI helpers convert to km for display.
//
// Works in the browser (window.VisiqRelativity) and in Node (module.exports) so
// the known-answer tests can run without a canvas.
//
// References for the closed forms used here:
//   - Schwarzschild radius, photon sphere, ISCO: any general relativity text,
//     e.g. Misner, Thorne & Wheeler, "Gravitation", ch. 25.
//   - Shadow critical impact parameter b_c = 3*sqrt(3)*M: Luminet (1979),
//     "Image of a spherical black hole with thin accretion disk",
//     Astron. Astrophys. 75, 228.
//   - Thin-disk radiative efficiency 1 - sqrt(8/9) ~= 5.72%: Shakura & Sunyaev
//     (1973) accretion-disk model as summarised in Frank, King & Raine,
//     "Accretion Power in Astrophysics".

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.VisiqRelativity = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // CODATA 2018 / IAU 2015 nominal values.
    var G = 6.67430e-11;          // m^3 kg^-1 s^-2
    var C = 299792458;            // m s^-1
    var M_SUN = 1.98892e30;       // kg
    var KM = 1e-3;

    // --- SI openings -------------------------------------------------------

    // rs = 2GM/c^2 in metres, for a black hole of `solarMasses` solar masses.
    function schwarzschildRadiusM(solarMasses) {
        return 2 * G * solarMasses * M_SUN / (C * C);
    }

    // Same in kilometres. One solar mass gives about 2.953 km.
    function schwarzschildRadiusKm(solarMasses) {
        return schwarzschildRadiusM(solarMasses) * KM;
    }

    // --- radii in units of rs (scale-free, so they are ratio checks) -------

    var PHOTON_SPHERE_OVER_RS = 1.5;
    var ISCO_OVER_RS = 3.0;
    // b_c = 3*sqrt(3)*M, and rs = 2M, so b_c = (3*sqrt(3)/2) rs.
    var SHADOW_B_OVER_RS = 3 * Math.sqrt(3) / 2;

    function photonSphereRadius(rs) { return PHOTON_SPHERE_OVER_RS * rs; }
    function iscoRadius(rs) { return ISCO_OVER_RS * rs; }

    // Critical impact parameter of the photon capture cross section, in the
    // same length unit as `rs`. A ray aimed within this of the hole never
    // escapes, which is what sets the apparent shadow size.
    function shadowImpactParameter(rs) { return SHADOW_B_OVER_RS * rs; }

    // Apparent shadow diameter on the sky, 2 b_c.
    function shadowDiameter(rs) { return 2 * shadowImpactParameter(rs); }

    // --- time and light ----------------------------------------------------

    // Proper-time rate of a static observer at radius r, relative to a static
    // observer at infinity: dtau/dt = sqrt(1 - rs/r).
    // At r = 2 rs this is sqrt(0.5) = 0.70710678...
    // Inside the horizon (r <= rs) the expression has no real value; returns 0
    // rather than NaN, and callers should not present 0 as a measurement.
    function timeDilation(r, rs) {
        var x = 1 - rs / r;
        return x > 0 ? Math.sqrt(x) : 0;
    }

    // Gravitational redshift 1 + z for light climbing from r to infinity.
    function gravitationalRedshiftFactor(r, rs) {
        return timeDilation(r, rs);
    }

    // Coordinate angular velocity of a circular geodesic: Omega = sqrt(M/r^3)
    // with M = rs/2. Returns radians per unit time in the same length unit as
    // `r` and `rs`.
    function keplerianOmega(r, rs) {
        return Math.sqrt((rs / 2) / (r * r * r));
    }

    // Orbital speed of that circular geodesic as measured by a local static
    // observer, in units of c: v = sqrt(M/r) / sqrt(1 - 2M/r).
    // At the ISCO (r = 3 rs) this is exactly 0.5 c, which is a known answer.
    // At or inside the horizon there is no static observer, so it is clamped
    // to 1 (light speed) rather than returned as infinity.
    function localOrbitalSpeed(r, rs) {
        var horizon = rs;
        if (r <= horizon) return 1;
        var v = Math.sqrt((rs / 2) / r) / Math.sqrt(1 - horizon / r);
        return v > 1 ? 1 : v;
    }

    // Special-relativistic Doppler factor nu_obs/nu_emit for a source moving at
    // speed `beta` (units of c) with `mu` = cosine of the angle between its
    // velocity and the direction toward the observer. mu = 1 means approaching.
    function dopplerFactor(beta, mu) {
        var b = Math.min(Math.abs(beta), 1);
        var gamma = 1 / Math.sqrt(Math.max(1e-12, 1 - b * b));
        return 1 / (gamma * (1 - b * mu));
    }

    // Total shift for the accretion disk: gravitational redshift from the
    // emitting radius, times the Doppler shift from the orbital motion.
    // g > 1 is blue (approaching side), g < 1 is red (receding side).
    //
    // Approximation, and the simulation says so on screen: this uses the
    // orbital velocity and the straight-line direction to the camera in the
    // emitter's local static frame. A full treatment would use the photon's
    // conserved E and L along the bent path. The difference is small except for
    // rays that graze the photon sphere, where the image is brightest anyway.
    function diskShiftFactor(r, rs, mu) {
        var beta = localOrbitalSpeed(r, rs);
        return gravitationalRedshiftFactor(r, rs) * dopplerFactor(beta, mu);
    }

    // Observed intensity of a bolometric source scales as the fourth power of
    // the shift factor (specific intensity divided by g^4 is invariant).
    function beamingBoost(g) { return g * g * g * g; }

    // Radiative efficiency of a thin disk down to the ISCO: 1 - E_isco with
    // E_isco = sqrt(8/9), about 0.0572, i.e. 5.72% of rest mass converted.
    function iscoEfficiency() { return 1 - Math.sqrt(8 / 9); }

    // Weak-field light deflection for a ray with impact parameter b, in
    // radians: 4GM/(c^2 b) = 2 rs / b. Einstein's 1915 value. Only valid for
    // b >> rs, so it is a readout curiosity, not what the shader integrates.
    function weakFieldDeflection(b, rs) {
        return 2 * rs / b;
    }

    return {
        G: G,
        C: C,
        M_SUN: M_SUN,
        PHOTON_SPHERE_OVER_RS: PHOTON_SPHERE_OVER_RS,
        ISCO_OVER_RS: ISCO_OVER_RS,
        SHADOW_B_OVER_RS: SHADOW_B_OVER_RS,
        schwarzschildRadiusM: schwarzschildRadiusM,
        schwarzschildRadiusKm: schwarzschildRadiusKm,
        photonSphereRadius: photonSphereRadius,
        iscoRadius: iscoRadius,
        shadowImpactParameter: shadowImpactParameter,
        shadowDiameter: shadowDiameter,
        timeDilation: timeDilation,
        gravitationalRedshiftFactor: gravitationalRedshiftFactor,
        keplerianOmega: keplerianOmega,
        localOrbitalSpeed: localOrbitalSpeed,
        dopplerFactor: dopplerFactor,
        diskShiftFactor: diskShiftFactor,
        beamingBoost: beamingBoost,
        iscoEfficiency: iscoEfficiency,
        weakFieldDeflection: weakFieldDeflection
    };
}));
