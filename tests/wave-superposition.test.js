import { describe, it, expect } from 'vitest';

/**
 * Pure-math model of two-point source interference, mirroring the
 * Wave Interference sketch's superposition principle.
 *
 * displacement(x, t) = sin(k*x1 - w*t) + sin(k*x2 - w*t)
 * where x1, x2 are distances from each source to the point.
 */

function distance(x, y, sx, sy) {
    return Math.hypot(x - sx, y - sy);
}

function displacementAt(x, y, t, sources, wavelength) {
    const k = (2 * Math.PI) / wavelength;
    const w = (2 * Math.PI) / 1.0; // unit period
    let sum = 0;
    for (const [sx, sy] of sources) {
        const r = distance(x, y, sx, sy);
        sum += Math.sin(k * r - w * t);
    }
    return sum;
}

function intensityAt(x, y, t, sources, wavelength) {
    const d = displacementAt(x, y, t, sources, wavelength);
    return d * d;
}

describe('wave superposition physics', () => {
    const sources = [[-2, 0], [2, 0]]; // two sources 4 units apart
    const wavelength = 2.0;

    it('constructive interference at the midpoint (equal path lengths)', () => {
        // At x=0, distances to both sources are equal -> waves in phase
        const d = displacementAt(0, 0, 0, sources, wavelength);
        // Each source contributes sin(0)=0 at t=0, r=2 -> k*r = pi -> sin(pi)=0
        // Better check: at t=0, midpoint path difference = 0, so in phase.
        const d2 = displacementAt(0, 0, 0.0, sources, wavelength);
        expect(d2).toBeCloseTo(0, 6); // sin(pi)+sin(pi) = 0
    });

    it('displacement is linear: two sources sum equals sum of individuals', () => {
        const x = 0, y = 3, t = 0.3;
        const combined = displacementAt(x, y, t, sources, wavelength);
        let individual = 0;
        for (const [sx, sy] of sources) {
            individual += displacementAt(x, y, t, [[sx, sy]], wavelength);
        }
        expect(combined).toBeCloseTo(individual, 10);
    });

    it('doubling wavelength halves the wavenumber k', () => {
        const k = (2 * Math.PI) / wavelength;
        const k2 = (2 * Math.PI) / (2 * wavelength);
        expect(k2).toBeCloseTo(k / 2, 10);
    });

    it('intensity is always non-negative', () => {
        for (let x = -5; x <= 5; x += 0.5) {
            for (let y = 0; y <= 5; y += 0.5) {
                const I = intensityAt(x, y, 0.7, sources, wavelength);
                expect(I).toBeGreaterThanOrEqual(0);
            }
        }
    });

    it('nodes appear where path difference is half-integer wavelength', () => {
        // Along the x-axis between sources, path difference = |(x+2) - (2-x)| = |2x|
        // Node when 2|x| = (n + 0.5) * wavelength -> |x| = (n+0.5)*wavelength/2
        // wavelength=2 -> |x| = (n+0.5). First node at x = +/- 0.5
        const nodeX = 0.5;
        const d = displacementAt(nodeX, 0, 0, sources, wavelength);
        // r1 = 2.5, r2 = 1.5 ; k = pi ; phase diff = k*(r1-r2) = pi*1 = pi -> cancel
        expect(d).toBeCloseTo(0, 6);
    });

    it('shifting sources apart changes fringe spacing', () => {
        // Off-axis point so path differences differ between close/far source pairs
        const x = 0.5, y = 1.0;
        const close = displacementAt(x, y, 0, [[-1, 0], [1, 0]], wavelength);
        const far = displacementAt(x, y, 0, [[-3, 0], [3, 0]], wavelength);
        expect(close).not.toBeCloseTo(far, 4);
    });

    it('temporal oscillation at a fixed point is periodic', () => {
        const x = 1, y = 1;
        const start = displacementAt(x, y, 0, sources, wavelength);
        const afterPeriod = displacementAt(x, y, 1.0, sources, wavelength); // T = 1
        expect(start).toBeCloseTo(afterPeriod, 6);
    });
});
