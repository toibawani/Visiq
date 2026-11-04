import { describe, it, expect } from 'vitest';

/**
 * Pure gravity math mirroring the gravity-tree worker's inverse-square law:
 *   F = G * m1 * m2 / r^2   (acceleration a = F / m)
 * Direction is along the unit vector from one body to the other.
 */

const G = 6.67430e-11;

function gravityAcceleration(m1, m2, dx, dy) {
    const r2 = dx * dx + dy * dy;
    if (r2 === 0) return { ax: 0, ay: 0 }; // avoid singularity at same point
    const r = Math.sqrt(r2);
    const f = (G * m1 * m2) / r2;
    // Force on m2 is toward m1, i.e. opposite the (dx, dy) displacement.
    const ax = -(f / m2) * (dx / r);
    const ay = -(f / m2) * (dy / r);
    return { ax, ay };
}

describe('gravity inverse-square law', () => {
    it('computes zero acceleration when bodies coincide', () => {
        expect(gravityAcceleration(5.97e24, 1000, 0, 0)).toEqual({ ax: 0, ay: 0 });
    });

    it('acceleration scales inversely with squared distance', () => {
        const m1 = 5.97e24; // Earth mass
        const m2 = 1000;
        const close = gravityAcceleration(m1, m2, 1e6, 0).ax;
        const far = gravityAcceleration(m1, m2, 2e6, 0).ax;
        // Doubling distance quarters the acceleration
        expect(far).toBeCloseTo(close / 4, 6);
    });

    it('acceleration scales linearly with source mass', () => {
        const a1 = gravityAcceleration(1e24, 1000, 1e6, 0).ax;
        const a2 = gravityAcceleration(2e24, 1000, 1e6, 0).ax;
        expect(a2).toBeCloseTo(a1 * 2, 6);
    });

    it('acceleration points toward the source mass', () => {
        // Source at origin, target at (+x, 0): acceleration on target is -x
        const res = gravityAcceleration(5.97e24, 1000, 1e6, 0);
        expect(res.ax).toBeLessThan(0);
        expect(res.ay).toEqual(0);
    });

    it('acceleration magnitude matches Newtonian gravity at Earth surface', () => {
        // Near Earth's surface: g ~ 9.81 m/s^2
        const earthM = 5.972e24;
        const earthR = 6.371e6;
        const res = gravityAcceleration(earthM, 1, earthR, 0);
        expect(Math.abs(res.ax)).toBeCloseTo(9.81, 0);
    });
});
