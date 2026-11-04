import { describe, it, expect } from 'vitest';
import Integrators from '../assets/integrators.js';

const { euler, semiImplicitEuler, velocityVerlet, rk4,
        centralForce, centralForce3,
        specificOrbitalEnergy, specificOrbitalEnergy3, angularMomentum3 } = Integrators;

// Simple harmonic oscillator: s = [q, p], s' = [p, -q]. Energy E = 0.5*(q^2 + p^2)
const f = ([q, p]) => [p, -q];
const energy = ([q, p]) => 0.5 * (q * q + p * p);

function relativeDrift(method, steps, dt) {
    let s = [1, 0];
    const e0 = energy(s);
    for (let i = 0; i < steps; i++) s = method(f, s, dt);
    return Math.abs(energy(s) - e0) / e0;
}

describe('integrator accuracy (extended)', () => {
    it('semi-implicit Euler conserves energy better than explicit Euler', () => {
        const eulerDrift = relativeDrift(euler, 2000, 0.01);
        const semiDrift = relativeDrift(semiImplicitEuler, 2000, 0.01);
        expect(semiDrift).toBeLessThan(eulerDrift);
    });

    it('velocityVerlet keeps harmonic oscillator energy near constant', () => {
        const drift = relativeDrift(velocityVerlet, 2000, 0.01);
        expect(drift).toBeLessThan(1e-4);
    });

    it('RK4 is more accurate than velocityVerlet for small step counts', () => {
        const verletDrift = relativeDrift(velocityVerlet, 500, 0.02);
        const rk4Drift = relativeDrift(rk4, 500, 0.02);
        expect(rk4Drift).toBeLessThan(verletDrift);
    });

    it('all integrators return state of the same length as input', () => {
        const s = [1, 0, 0, 1];
        const outE = euler(f, s, 0.01);
        const outS = semiImplicitEuler(f, s, 0.01);
        const outV = velocityVerlet(f, s, 0.01);
        const outR = rk4(f, s, 0.01);
        expect(outE).toHaveLength(4);
        expect(outS).toHaveLength(4);
        expect(outV).toHaveLength(4);
        expect(outR).toHaveLength(4);
    });

    it('integrators do not mutate the input state array', () => {
        const s = [1, 0];
        const before = s.slice();
        euler(f, s, 0.01);
        semiImplicitEuler(f, s, 0.01);
        velocityVerlet(f, s, 0.01);
        rk4(f, s, 0.01);
        expect(s).toEqual(before);
    });
});

describe('central force orbital quantities', () => {
    const mu = 1.0;
    // Circular orbit at r=1 with speed sqrt(mu/r): state [x, y, vx, vy] = [1, 0, 0, 1]
    const circular = [1, 0, 0, 1];

    it('centralForce acceleration points toward origin', () => {
        const a = centralForce(mu)([3, 4, 0, 0]);
        // derivative returns [vx, vy, ax, ay]; |pos|=5 -> k = -1/125
        // ax = k*x = -3/125, ay = k*y = -4/125
        expect(a[2]).toBeCloseTo(-3 / 125, 6);
        expect(a[3]).toBeCloseTo(-4 / 125, 6);
        expect(a[0]).toBe(0);
        expect(a[1]).toBe(0);
    });

    it('specificOrbitalEnergy is constant for a circular orbit', () => {
        const e1 = specificOrbitalEnergy(circular, mu);
        const e2 = specificOrbitalEnergy([0, 1, -1, 0], mu);
        expect(e1).toBeCloseTo(e2, 6);
    });

    it('angularMomentum3 is conserved under centralForce3', () => {
        // state [x, y, z, vx, vy, vz]
        const s = [1, 0, 0, 0, 1, 0];
        const before = angularMomentum3(s);
        // apply one step of centralForce3 derivative to get acceleration
        const acc = centralForce3(1.0)(s);
        const after = [s[0], s[1], s[2],
                       s[3] + acc[3] * 0.01,
                       s[4] + acc[4] * 0.01,
                       s[5] + acc[5] * 0.01];
        const afterL = angularMomentum3(after);
        expect(afterL[0]).toBeCloseTo(before[0], 4);
        expect(afterL[1]).toBeCloseTo(before[1], 4);
        expect(afterL[2]).toBeCloseTo(before[2], 4);
    });
});

describe('METHODS registry', () => {
    it('exposes all four integration methods by id', () => {
        expect(Integrators.METHODS.euler.id).toBe('euler');
        expect(Integrators.METHODS.semi.id).toBe('semi');
        expect(Integrators.METHODS.verlet.id).toBe('verlet');
        expect(Integrators.METHODS.rk4.id).toBe('rk4');
    });

    it('each METHOD step is a function', () => {
        expect(typeof Integrators.METHODS.euler.step).toBe('function');
        expect(typeof Integrators.METHODS.semi.step).toBe('function');
        expect(typeof Integrators.METHODS.verlet.step).toBe('function');
        expect(typeof Integrators.METHODS.rk4.step).toBe('function');
    });

    it('order array lists all methods', () => {
        expect(Integrators.order).toEqual(['euler', 'semi', 'verlet', 'rk4']);
    });
});
