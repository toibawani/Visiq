// ===== Quantum tunneling — transmission coefficient =====
// Extracted from sketches/quantum-tunnel.js so the transmission coefficient
// can be asserted without a canvas.
//
// Works in the browser (window.VisiqQuantumTunnel) and in Node (module.exports).
//
// The sketch solves the 1D time-independent Schrodinger equation for a
// rectangular barrier analytically. The formula is textbook quantum mechanics
// (see, e.g., Griffiths, Introduction to Quantum Mechanics, section 2.5):
//
//   E < V0:  T = 1 / (1 + V0^2 sinh^2(kappa a) / (4 E (V0 - E)))
//   E > V0:  T = 1 / (1 + V0^2 sin^2(k' a)    / (4 E (E - V0)))
//
// where kappa = sqrt(2m(V0 - E)) / hbar and k' = sqrt(2m(E - V0)) / hbar.
// The sketch works in eV and px, so the physical constants are folded into
// two unit-conversion factors: KAPPA converts eV^0.5 to px^-1 and KPRIME does
// the same for the above-barrier wave number. This module reproduces the
// sketch's formula exactly rather than replacing it with a textbook one.
//
// Known answers (external facts):
//   T -> 1 as E >> V0        -> a fast particle is almost never reflected
//   T -> 0 as a -> inf      -> a thick barrier is almost never tunneled
//   T -> 0 as E -> 0        -> no energy means no tunneling
//   T + R = 1               -> probability is conserved

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
    if (typeof root !== 'undefined') {
        root.VisiqQuantumTunnel = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Unit-conversion factors from the sketch: kappa = sqrt(V0 - E) * KAPPA
    // in px^-1, and k' = sqrt(E - V0) * KPRIME in px^-1.
    const KAPPA = 0.15;
    const KPRIME = 0.15;

    // The sketch evaluates sinh(kappa * width * WIDTH_SCALE), so the
    // dimensionless wave number that actually enters the formula is
    // lambda = KAPPA * WIDTH_SCALE per sqrt(eV) per px. Keeping the factor
    // explicit makes the E == V0 limit below derivable rather than magic.
    const WIDTH_SCALE = 0.1;

    // Transmission coefficient for a rectangular barrier of height V0 eV,
    // width a px, for a particle of energy E eV. Returns a number in [0, 1].
    function transmission(E, V0, width) {
        const e = Math.max(0.01, E);
        const v = Math.max(0.01, V0);
        const a = Math.max(0, width);

        // At E == V0 the textbook formula divides by zero. The limit is
        // finite, and it is the same from both sides.
        //
        //   below the barrier: sinh(kappa a) ~ kappa a and kappa^2 ~ (V0 - E),
        //                       so the (V0 - E) cancels against the
        //                       denominator:
        //                       T -> 1 / (1 + V0^2 lambda^2 a^2 / (4 E))
        //   above the barrier: sin(k' a) ~ k' a and k'^2 ~ (E - V0), so
        //                       the same cancellation gives the same limit.
        //
        // Evaluating that limit at E = V0 gives
        //   T = 1 / (1 + V0 lambda^2 a^2 / 4)
        // with lambda = KAPPA * WIDTH_SCALE (and KPRIME === KAPPA, so both
        // one-sided limits agree). This is the correct finite value for a
        // finite barrier: a thick barrier still reflects most of the wave.
        if (Math.abs(e - v) < 1e-9) {
            const lambda = KAPPA * WIDTH_SCALE;
            return 1 / (1 + (v * lambda * lambda * a * a) / 4);
        }

        if (e < v) {
            const kappa = Math.sqrt(v - e) * KAPPA;
            const sinhVal = Math.sinh(kappa * a * WIDTH_SCALE);
            return 1 / (1 + (v * v * sinhVal * sinhVal) / (4 * e * (v - e)));
        }
        const kPrime = Math.sqrt(e - v) * KPRIME;
        const sinVal = Math.sin(kPrime * a * WIDTH_SCALE);
        return 1 / (1 + (v * v * sinVal * sinVal) / (4 * e * (e - v)));
    }

    // Reflection coefficient. Probability is conserved, so R = 1 - T.
    function reflection(E, V0, width) {
        return Math.max(0, 1 - transmission(E, V0, width));
    }

    // Probability is conserved: T + R = 1 for every energy and barrier.
    function probabilityConserved(E, V0, width) {
        return transmission(E, V0, width) + reflection(E, V0, width);
    }

    // Evanescent decay constant inside the barrier, in px^-1. The wavefunction
    // amplitude falls off as exp(-kappa * depth), which is what the sketch
    // draws in the barrier region.
    function decayConstant(E, V0) {
        const e = Math.max(0.01, E);
        const v = Math.max(0.01, V0);
        if (e >= v) return 0;
        return Math.sqrt(v - e) * KAPPA;
    }

    return {
        transmission,
        reflection,
        probabilityConserved,
        decayConstant
    };
}));
