// ===== Magnetic field & Lorentz force — pure physics =====
// Extracted from sketches/magnetic-field.js so the dipole field and the
// cyclotron radius can be asserted without a canvas.
//
// Works in the browser (window.VisiqMagneticField) and in Node (module.exports).
//
// The model is the sketch's own: a dipole built from two opposite magnetic
// monopoles separated by the magnet's length, each falling off as 1/r^2
// (so the combined field falls off as 1/r^3, as a real dipole does). The
// "+12" softening is the sketch's too, so this module reproduces the sketch
// exactly rather than replacing it with a textbook formula.
//
// Known answers (external facts, not numbers copied out of the implementation):
//   Combined field falls off as 1 / r^3          -> a real magnetic dipole
//   Cyclotron radius:                            r = m v / (|q| B)
//   Lorentz force:                               F = q (v x B)
//   F . v = 0 always                             -> the magnetic force does no work
//   Reversing q reverses the curvature direction -> but leaves the radius unchanged

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
    if (typeof root !== 'undefined') {
        root.VisiqMagneticField = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Softened monopole contribution at a point, matching the sketch's
    // getBField exactly: b = rhat / (r + SOFTEN)^2 = r / r^3, with the sign
    // giving the pole. The north pole is positive, the south negative.
    const SOFTEN = 12;

    function monopole(pole, at) {
        const rx = at.x - pole.x;
        const ry = at.y - pole.y;
        const r = Math.hypot(rx, ry) + SOFTEN;
        const r3 = r * r * r;
        return { bx: rx / r3, by: ry / r3 };
    }

    // Dipole field at `at` for a magnet of given centre, angle, length and
    // moment strength. Returns the unitless direction and fall-off; callers
    // multiply by the sketch's own scale factor.
    function dipoleField(magnet, at) {
        const halfL = magnet.length * 0.5;
        const nx = magnet.x + Math.cos(magnet.angle) * halfL;
        const ny = magnet.y + Math.sin(magnet.angle) * halfL;
        const sx = magnet.x - Math.cos(magnet.angle) * halfL;
        const sy = magnet.y - Math.sin(magnet.angle) * halfL;

        const n = monopole({ x: nx, y: ny }, at);
        const s = monopole({ x: sx, y: sy }, at);
        return {
            bx: n.bx - s.bx,
            by: n.by - s.by
        };
    }

    // Field magnitude at a point, given the sketch's scale factor.
    function fieldMagnitudeAt(magnet, at, scale) {
        const f = dipoleField(magnet, at);
        return Math.hypot(f.bx, f.by) * scale;
    }

    // Cyclotron radius for a particle of mass m, speed v, charge q in a
    // perpendicular field of magnitude B. r = m v / (|q| B). Returns null
    // when B is zero or q is zero (no curvature, straight line).
    function cyclotronRadius(mass, speed, charge, bMagnitude) {
        if (bMagnitude <= 0 || charge === 0) return null;
        return (mass * speed) / (Math.abs(charge) * bMagnitude);
    }

    // Lorentz force F = q (v x B) in 2D: Fx = q * vy * Bz, Fy = -q * vx * Bz.
    function lorentzForce(charge, vx, vy, bz) {
        return {
            fx: charge * vy * bz,
            fy: -charge * vx * bz
        };
    }

    // Dot product of the force with the velocity. Must be zero: the magnetic
    // force does no work.
    function forceDotVelocity(charge, vx, vy, bz) {
        const f = lorentzForce(charge, vx, vy, bz);
        return f.fx * vx + f.fy * vy;
    }

    return {
        dipoleField,
        fieldMagnitudeAt,
        cyclotronRadius,
        lorentzForce,
        forceDotVelocity
    };
}));
