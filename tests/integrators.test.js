import { describe, it, expect } from 'vitest';
import Integrators from '../assets/integrators.js';

const { euler, rk4 } = Integrators;

// Simple harmonic oscillator: s = [q, p], s' = [p, -q]. Energy E = 0.5*(q^2 + p^2)
// is a conserved quantity, so any drift over time is integration error.
const f = ([q, p]) => [p, -q];
const energy = ([q, p]) => 0.5 * (q * q + p * p);

function relativeDrift(method, steps, dt) {
    let s = [1, 0];
    const e0 = energy(s);
    for (let i = 0; i < steps; i++) s = method(f, s, dt);
    return Math.abs(energy(s) - e0) / e0;
}

describe('integrator energy drift (harmonic oscillator)', () => {
    it('RK4 drift stays under tolerance', () => {
        const drift = relativeDrift(rk4, 1000, 0.01);
        expect(drift).toBeLessThan(1e-6);
    });

    it('Euler drifts more than RK4', () => {
        const eulerDrift = relativeDrift(euler, 1000, 0.01);
        const rk4Drift = relativeDrift(rk4, 1000, 0.01);
        expect(eulerDrift).toBeGreaterThan(rk4Drift);
    });
});
