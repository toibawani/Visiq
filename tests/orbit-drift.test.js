import { describe, it, expect } from 'vitest';
import Integrators from '../assets/integrators.js';

const { euler, rk4, centralForce, specificOrbitalEnergy } = Integrators;

// Two-body circular orbit, matching the black-hole-orbit sketch defaults:
// G = 1.15, central mass M = 120  ->  mu = 138, start at r = 70 with
// circular speed sqrt(mu/r). Fixed timestep H = 1 (the sketch's STEP_H),
// N = 2000 steps (~1 orbit period is 2*pi*sqrt(r^3/mu) ≈ 313 steps).
//
// Stated tolerances (relative |E - E0| / |E0| after N steps):
//   - RK4:   < 1e-6   (measured ~3.6e-9)
//   - Euler: > 1e-2   (measured ~4.5e-1)
// The test asserts BOTH an absolute tolerance for RK4 and that Euler's
// drift exceeds RK4's, so a regression in either direction fails loudly.
const MU = 1.15 * 120;
const H = 1;
const N = 2000;
const RK4_TOLERANCE = 1e-6;
const EULER_MIN_DRIFT = 1e-2;

function runOrbit(stepFn, n) {
    const r0 = 70;
    const v0 = Math.sqrt(MU / r0);
    let s = [r0, 0, 0, v0];
    const f = centralForce(MU);
    const e0 = specificOrbitalEnergy(s, MU);
    for (let i = 0; i < n; i++) s = stepFn(f, s, H);
    return Math.abs((specificOrbitalEnergy(s, MU) - e0) / e0);
}

describe('orbital energy drift (circular two-body, H=1, N=2000)', () => {
    it('RK4 stays under the stated tolerance of 1e-6', () => {
        const drift = runOrbit(rk4, N);
        expect(drift).toBeLessThan(RK4_TOLERANCE);
    });

    it('Euler drift is larger than RK4 drift (and above 1e-2)', () => {
        const eulerDrift = runOrbit(euler, N);
        const rk4Drift = runOrbit(rk4, N);
        expect(eulerDrift).toBeGreaterThan(EULER_MIN_DRIFT);
        expect(eulerDrift).toBeGreaterThan(rk4Drift);
    });
});
