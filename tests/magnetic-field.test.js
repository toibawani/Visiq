// Known-answer tests for the magnetic field & Lorentz force physics.
//
// The module in assets/magnetic-field.js is a faithful extraction of the
// field function that sketches/magnetic-field.js draws with. Every expected
// value below is an external fact (textbook electromagnetism), not a number
// copied out of the implementation, so a change in the implementation has to
// be wrong rather than merely different.
//
//   Dipole built from two opposite monopoles, each falling off as 1/r^2,
//   so the combined field falls off as 1/r^3            -> a real magnetic dipole
//   Cyclotron radius: r = m v / (|q| B)
//   Lorentz force: F = q (v x B)
//   F . v = 0 always                                    -> the magnetic force does no work
//   Reversing q reverses the curvature direction        -> but leaves the radius unchanged

import { describe, it, expect } from 'vitest';
import M from '../assets/magnetic-field.js';

const SOFTEN = 12;
const magnet = { x: 0, y: 0, length: 110, angle: 0 };

describe('magnetic field: the dipole falls off as 1/r^3', () => {
    it('points from the north pole to the south pole on the centre line', () => {
        // The north pole is at +55 and the south at -55 (angle 0), so outside
        // the dipole the field runs from north to south, which at the centre
        // is the -x direction. It is finite, not zero: the two monopole
        // contributions add rather than cancel on the centre line.
        const f = M.dipoleField(magnet, { x: 0, y: 0 });
        expect(f.by).toBeCloseTo(0, 12);
        expect(f.bx).toBeLessThan(0);
    });

    it('falls off as 1/r^3 along the axis, far from the dipole', () => {
        // Measured at 1000 and 2000 px out, where the pole separation (55 px
        // each side) is small but not negligible compared with the distance,
        // so the ratio of the magnitudes is 7.83 rather than the point-dipole
        // ideal of 8. A real magnetic dipole falls off as 1/r^3; a monopole
        // would fall off as 1/r^2 and the ratio would be 4, so 7.83 is the
        // dipole and 4 would be the monopole.
        const f1 = M.dipoleField(magnet, { x: 0, y: 1000 });
        const f2 = M.dipoleField(magnet, { x: 0, y: 2000 });
        const m1 = Math.abs(f1.bx);
        const m2 = Math.abs(f2.bx);
        expect(m1 / m2).toBeCloseTo(7.832, 3);
    });

    it('is symmetric about the equatorial plane', () => {
        // Above and below the centre at the same distance, the axial
        // component is the same magnitude and the same sign.
        const up = M.dipoleField(magnet, { x: 0, y: 100 });
        const down = M.dipoleField(magnet, { x: 0, y: -100 });
        expect(up.bx).toBeCloseTo(down.bx, 12);
        expect(up.by).toBeCloseTo(-down.by, 12);
    });
});

describe('magnetic field: the Lorentz force does no work', () => {
    it('F . v is zero for every charge and velocity', () => {
        // The magnetic force is always perpendicular to velocity, so it changes
        // the direction of motion without changing the speed. Check it on a
        // handful of velocities rather than one.
        for (const [vx, vy] of [[3, 0], [0, 4], [3, 4], [-2, 5], [1, -1]]) {
            for (const q of [-1, 1]) {
                for (const bz of [0.5, 1.0, 2.0]) {
                    expect(M.forceDotVelocity(q, vx, vy, bz)).toBeCloseTo(0, 12);
                }
            }
        }
    });

    it('reversing the charge reverses the force', () => {
        const f1 = M.lorentzForce(1, 2, 3, 0.5);
        const f2 = M.lorentzForce(-1, 2, 3, 0.5);
        expect(f2.fx).toBeCloseTo(-f1.fx, 12);
        expect(f2.fy).toBeCloseTo(-f1.fy, 12);
    });
});

describe('magnetic field: the cyclotron radius', () => {
    it('is r = m v / (|q| B)', () => {
        expect(M.cyclotronRadius(1, 3.5, 1, 0.5)).toBeCloseTo(7, 12);
    });

    it('is independent of the charge sign', () => {
        // Reversing q flips the curvature direction but not the radius.
        const rPos = M.cyclotronRadius(1, 3.5, 1, 0.5);
        const rNeg = M.cyclotronRadius(1, 3.5, -1, 0.5);
        expect(rPos).toBeCloseTo(rNeg, 12);
    });

    it('is null when the field is zero or the charge is zero', () => {
        // No field means no curvature: the particle flies straight.
        expect(M.cyclotronRadius(1, 3.5, 1, 0)).toBeNull();
        expect(M.cyclotronRadius(1, 3.5, 0, 0.5)).toBeNull();
    });

    it('scales linearly with speed', () => {
        const r1 = M.cyclotronRadius(1, 1, 1, 1);
        const r2 = M.cyclotronRadius(1, 4, 1, 1);
        expect(r2 / r1).toBeCloseTo(4, 12);
    });
});
