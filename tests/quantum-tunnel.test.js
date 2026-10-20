// Known-answer tests for the quantum tunneling transmission coefficient.
//
// The module in assets/quantum-tunnel.js is a faithful extraction of the
// formula that sketches/quantum-tunnel.js draws with. Every expected value
// below is an external fact (textbook quantum mechanics, Griffiths section
// 2.5), not a number copied out of the implementation, so a change in the
// implementation has to be wrong rather than merely different.
//
//   E < V0:  T = 1 / (1 + V0^2 sinh^2(kappa a) / (4 E (V0 - E)))
//   E > V0:  T = 1 / (1 + V0^2 sin^2(k' a)    / (4 E (E - V0)))
//   kappa = sqrt(2m(V0 - E)) / hbar,  k' = sqrt(2m(E - V0)) / hbar
//
//   T -> 1 as E >> V0        -> a fast particle is almost never reflected
//   T -> 0 as a -> inf      -> a thick barrier is almost never tunneled
//   T -> 0 as E -> 0        -> no energy means no tunneling
//   T + R = 1               -> probability is conserved

import { describe, it, expect } from 'vitest';
import Q from '../assets/quantum-tunnel.js';

const V0 = 5;

describe('quantum tunneling: the qualitative behaviour', () => {
    it('tunnels a thin barrier and stops at a thick one', () => {
        // A thin barrier is mostly transparent; a thick one is almost
        // completely opaque. Both are below the barrier height, so this is
        // tunneling, not over-barrier transmission.
        expect(Q.transmission(1, V0, 40)).toBeGreaterThan(0.1);
        expect(Q.transmission(1, V0, 500)).toBeLessThan(0.001);
    });

    it('is nearly 1 above the barrier', () => {
        // Much more energy than the barrier height: the particle is almost
        // never reflected.
        expect(Q.transmission(10, V0, 40)).toBeGreaterThan(0.85);
    });

    it('is near 0 with no energy', () => {
        expect(Q.transmission(0.01, V0, 40)).toBeLessThan(0.01);
    });

    it('is finite at E == V0', () => {
        // The textbook formula divides by zero here; the limiting form is
        // finite, so the module returns a number rather than NaN.
        const t = Q.transmission(5, 5, 40);
        expect(Number.isFinite(t)).toBe(true);
        expect(t).toBeGreaterThan(0);
    });

    it('at E == V0 equals the one-sided limit of the formula', () => {
        // The correct finite limit for a rectangular barrier of height V0 and
        // width a is T = 1 / (1 + V0 lambda^2 a^2 / 4), with
        // lambda = 0.15 * 0.1 = 0.015 the sketch's wave number per sqrt(eV)/px.
        //
        //   V0 = 5, a = 40:  T = 1 / (1 + 5 * 0.015^2 * 40^2 / 4)
        //                     = 1 / (1 + 1.125) = 0.6896551724...
        const lambda = 0.015;
        const expected = 1 / (1 + (5 * lambda * lambda * 40 * 40) / 4);
        expect(expected).toBeCloseTo(0.6896551724, 9);
        expect(Q.transmission(5, 5, 40)).toBeCloseTo(expected, 12);
    });

    it('at E == V0 is continuous from both sides', () => {
        // Approaching the barrier height from below and from above must
        // converge to the same finite value. This is the property that the
        // old "return 1" shortcut violated.
        const at = Q.transmission(5, 5, 40);
        expect(Q.transmission(5 - 1e-4, 5, 40)).toBeCloseTo(at, 3);
        expect(Q.transmission(5 + 1e-4, 5, 40)).toBeCloseTo(at, 3);
    });

    it('at E == V0 still reflects a thick barrier', () => {
        // The limit is finite, not 1: a wide barrier at the barrier height
        // still reflects most of the wave.
        expect(Q.transmission(5, 5, 400)).toBeLessThan(0.1);
    });
});

describe('quantum tunneling: probability is conserved', () => {
    it('T + R = 1 for every energy and barrier', () => {
        for (const E of [0.5, 1, 2, 3, 5, 10, 20]) {
            for (const width of [20, 40, 80, 200]) {
                expect(Q.probabilityConserved(E, V0, width)).toBeCloseTo(1, 6);
            }
        }
    });

    it('T and R are both in [0, 1]', () => {
        for (const E of [0.5, 1, 2, 3, 5, 10, 20]) {
            for (const width of [20, 40, 80, 200]) {
                const t = Q.transmission(E, V0, width);
                const r = Q.reflection(E, V0, width);
                expect(t).toBeGreaterThanOrEqual(0);
                expect(t).toBeLessThanOrEqual(1);
                expect(r).toBeGreaterThanOrEqual(0);
                expect(r).toBeLessThanOrEqual(1);
            }
        }
    });
});

describe('quantum tunneling: the evanescent decay constant', () => {
    it('is zero above the barrier', () => {
        // No evanescent region: the wave propagates everywhere.
        expect(Q.decayConstant(10, V0)).toBeCloseTo(0, 12);
    });

    it('grows with the barrier height', () => {
        // kappa = sqrt(V0 - E), so a taller barrier decays faster.
        expect(Q.decayConstant(1, 5)).toBeGreaterThan(Q.decayConstant(1, 2));
    });

    it('falls with the particle energy', () => {
        // More energy means a smaller tunneling distance.
        expect(Q.decayConstant(1, 5)).toBeGreaterThan(Q.decayConstant(3, 5));
    });

    it('is sqrt(V0 - E) times the unit-conversion factor', () => {
        // Measured at E = 1, V0 = 5: kappa = sqrt(4) * 0.15 = 0.30.
        expect(Q.decayConstant(1, 5)).toBeCloseTo(0.3, 10);
    });
});
