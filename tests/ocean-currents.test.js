// Known-answer tests for the Coriolis deflection and the Ekman spiral.
//
// The module in assets/ocean-currents.js is a faithful extraction of the two
// closed-form pieces of sketches/ocean-currents.js. The particle physics
// (thermohaline advection) runs in a Web Worker and is not extracted here.
//
// Every expected value below is an external fact, not a number copied out of
// the implementation:
//
//   Coriolis parameter:   f = 2 Omega sin(latitude), Omega = 7.2921e-5 rad/s
//   NH gyres rotate clockwise, SH counter-clockwise
//   Ekman transport is 45 degrees to the wind direction at the surface
//   Each Ekman layer turns right (NH) of the one above it

import { describe, it, expect } from 'vitest';
import O from '../assets/ocean-currents.js';

const OMEGA = 7.2921e-5;

describe('ocean currents: the Coriolis parameter', () => {
    it('is f = 2 Omega sin(latitude)', () => {
        expect(O.coriolisParameter(45)).toBeCloseTo(2 * OMEGA * Math.sin(45 * Math.PI / 180), 10);
    });

    it('is zero at the equator and antisymmetric', () => {
        expect(O.coriolisParameter(0)).toBeCloseTo(0, 12);
        expect(O.coriolisParameter(45)).toBeCloseTo(-O.coriolisParameter(-45), 10);
    });

    it('is positive in the north and negative in the south', () => {
        expect(O.hemisphere(45)).toBe('northern');
        expect(O.hemisphere(-45)).toBe('southern');
        expect(O.hemisphere(0)).toBe('equator');
    });
});

describe('ocean currents: the surface transport', () => {
    it('is 45 degrees to the right of the wind in the north', () => {
        // A northerly wind (blowing from 0 deg) deflects to 45 deg.
        expect(O.surfaceTransportAngle(0, 45)).toBeCloseTo(45, 10);
    });

    it('is 45 degrees to the left of the wind in the south', () => {
        // The same wind at 45 S deflects to 315 deg, i.e. 45 deg to the left.
        expect(O.surfaceTransportAngle(0, -45)).toBeCloseTo(315, 10);
    });
});

describe('ocean currents: the gyre rotation', () => {
    it('is clockwise in the northern hemisphere', () => {
        expect(O.gyreRotation(45)).toBe('clockwise');
    });

    it('is counter-clockwise in the southern hemisphere', () => {
        expect(O.gyreRotation(-45)).toBe('counter-clockwise');
    });
});

describe('ocean currents: the Ekman spiral', () => {
    it('starts at the surface with zero rotation and full magnitude', () => {
        const top = O.ekmanLayer(0, 8, 1);
        expect(top.angle).toBeCloseTo(0, 12);
        expect(top.magnitude).toBeCloseTo(1, 12);
    });

    it('turns with depth and decays with depth', () => {
        // Each layer turns relative to the one above and slows down, so the
        // deepest layer has the largest angle and the smallest magnitude.
        const layers = [];
        for (let d = 0; d <= 8; d++) layers.push(O.ekmanLayer(d, 8, 1));
        for (let i = 1; i < layers.length; i++) {
            expect(layers[i].angle).toBeGreaterThan(layers[i - 1].angle);
            expect(layers[i].magnitude).toBeLessThan(layers[i - 1].magnitude);
        }
    });

    it('the deepest layer has zero magnitude', () => {
        expect(O.ekmanLayer(8, 8, 1).magnitude).toBeCloseTo(0, 12);
    });

    it('scales the total turn with the Coriolis strength', () => {
        // A stronger Coriolis parameter turns the spiral more over the same
        // number of layers.
        expect(O.ekmanLayer(8, 8, 2).angle).toBeCloseTo(2 * O.ekmanLayer(8, 8, 1).angle, 10);
    });
});
