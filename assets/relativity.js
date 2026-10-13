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

    // --- blackbody colour --------------------------------------------------

    // Planck's spectral radiance up to a constant factor (the constants cancel
    // once the result is normalised to a colour). lambda in nanometres.
    var H_PLANCK = 6.62607015e-34;
    var K_B = 1.380649e-23;

    function planckRelative(lambdaNm, temperatureK) {
        var l = lambdaNm * 1e-9;
        var exponent = (H_PLANCK * C) / (l * K_B * temperatureK);
        // exp() overflows to Infinity for cold temperatures at short
        // wavelengths; 1/Infinity is 0, which is the right answer, and no NaN
        // is produced.
        return 1 / Math.pow(l, 5) / (Math.exp(exponent) - 1);
    }

    // Piecewise Gaussian used by the Wyman/Sloan/Shirley fit below.
    function lobe(x, mu, s1, s2) {
        var s = x < mu ? s1 : s2;
        var t = (x - mu) / s;
        return Math.exp(-0.5 * t * t);
    }

    // CIE 1931 2-degree colour matching functions, fitted by
    // Wyman, Sloan & Shirley (2013), "Simple Analytic Approximations to the CIE
    // XYZ Color Matching Functions", Journal of Computer Graphics Techniques
    // 2(2). Multi-lobe Gaussian fit, accurate to a few per cent over the
    // visible band, which is far below the eye's ability to notice on a glow.
    function cieX(l) {
        return 1.056 * lobe(l, 599.8, 37.9, 31.0)
             + 0.362 * lobe(l, 442.0, 16.0, 26.7)
             - 0.065 * lobe(l, 501.1, 20.4, 26.2);
    }
    function cieY(l) {
        return 0.821 * lobe(l, 568.8, 46.9, 40.5)
             + 0.286 * lobe(l, 530.9, 16.3, 31.1);
    }
    function cieZ(l) {
        return 1.217 * lobe(l, 437.0, 11.8, 36.0)
             + 0.681 * lobe(l, 459.0, 26.0, 13.8);
    }

    // Integrate a Planck spectrum against the matching functions and convert to
    // linear sRGB (D65), then normalise so the largest channel is 1. This gives
    // the chromaticity a camera would record for a blackbody at this
    // temperature, independent of how bright it is. The shader carries the same
    // arithmetic so the pixels and these numbers agree.
    function blackbodyRGB(temperatureK) {
        // The spectrum is normalised by its own maximum before the matching
        // functions are applied. Chromaticity is scale-free, and without this
        // step the raw Planck radiance for an X-ray-hot disk overflows a
        // 32-bit float (about 3.4e38) even though the colour is well defined.
        var peak = 0;
        var l;
        for (l = 380; l <= 730; l += 5) {
            var probe = planckRelative(l, temperatureK);
            if (probe > peak) peak = probe;
        }
        // Nothing in the visible band at all. Below roughly 5 K the Boltzmann
        // exponentials overflow to infinity and every sample underflows to
        // zero, so there is no chromaticity to report. Note that this is about
        // whether the sRGB conversion is meaningful, not about brightness: the
        // result of this function is always normalised to the largest channel,
        // so it carries colour only and never intensity.
        if (!(peak > 0)) return [0, 0, 0];

        var X = 0, Y = 0, Z = 0;
        for (l = 380; l <= 730; l += 5) {
            var B = planckRelative(l, temperatureK) / peak;
            X += cieX(l) * B;
            Y += cieY(l) * B;
            Z += cieZ(l) * B;
        }
        var r =  3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
        var g = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z;
        var b =  0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;
        r = Math.max(0, r);
        g = Math.max(0, g);
        b = Math.max(0, b);
        var m = Math.max(r, Math.max(g, b));
        if (m > 0) { r /= m; g /= m; b /= m; }
        return [r, g, b];
    }

    // Peak temperature of a thin accretion disk around a black hole of the given
    // mass, in kelvin. Shakura-Sunyaev disks scale as T ~ M^(-1/4) at a fixed
    // Eddington ratio, anchored on the standard figures: about 1e7 K for a 10
    // solar-mass hole (soft X-rays) and about 1.8e5 K for a 1e8 solar-mass hole
    // (ultraviolet). The Eddington assumption is a real simplification and the
    // simulation says so on screen.
    function diskPeakTemperature(massSolar) {
        return 1.0e7 * Math.pow(massSolar / 10, -0.25);
    }

    // The Shakura-Sunyaev radial profile, normalised so its maximum is 1. The
    // peak sits at r = (49/36) r_in, a standard result of that model.
    var DISK_PEAK_R_OVER_RIN = 49 / 36;
    var DISK_PROFILE_NORM = 1 / (Math.pow(DISK_PEAK_R_OVER_RIN, -0.75) *
        Math.pow(1 - Math.pow(DISK_PEAK_R_OVER_RIN, -0.5), 0.25));

    function diskProfile(r, rIn) {
        var x = r / rIn;
        if (x <= 1) return 0;
        return DISK_PROFILE_NORM * Math.pow(x, -0.75) * Math.pow(1 - Math.pow(x, -0.5), 0.25);
    }

    // Radiated flux profile, normalised to its own maximum. Because radiated
    // power goes as the fourth power of temperature, this is exactly the fourth
    // power of the profile above, which is the standard r^-3 (1 - r^-1/2)
    // fall-off of a thin disk. It is what sets the brightness of the rendered
    // disk, while the profile sets the colour.
    var DISK_FLUX_NORM = 1 / (Math.pow(DISK_PEAK_R_OVER_RIN, -3) *
        (1 - Math.pow(DISK_PEAK_R_OVER_RIN, -0.5)));

    function diskFlux(r, rIn) {
        var x = r / rIn;
        if (x <= 1) return 0;
        return DISK_FLUX_NORM * Math.pow(x, -3) * (1 - Math.pow(x, -0.5));
    }

    return {
        G: G,
        C: C,
        M_SUN: M_SUN,
        DISK_PEAK_R_OVER_RIN: DISK_PEAK_R_OVER_RIN,
        DISK_PROFILE_NORM: DISK_PROFILE_NORM,
        DISK_FLUX_NORM: DISK_FLUX_NORM,
        diskFlux: diskFlux,
        planckRelative: planckRelative,
        blackbodyRGB: blackbodyRGB,
        diskPeakTemperature: diskPeakTemperature,
        diskProfile: diskProfile,
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
