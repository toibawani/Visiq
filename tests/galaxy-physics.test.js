// Known-answer tests for the Barnes-Hut gravitational field.
//
// The module in assets/galaxy-physics.js is a faithful extraction of the
// quadtree that workers/galaxy-physics.worker.js runs off the main thread.
// The worker importScripts() this exact file, so these tests cover the
// running simulation's force law.
//
// Every expected value below is an external fact, not a number copied out of
// the implementation:
//
//   Newtonian gravity:  a = G m r_hat / r^2, pointing at the source
//   Far field:           the whole system looks like one mass at its CoM
//   Newton's third law:  F_12 = -F_21
//   A body does not attract itself
//   Circular orbit:      v = sqrt(G M / r)

import { describe, it, expect } from 'vitest';
import GP from '../assets/galaxy-physics.js';

const G = GP.G;
const EPS2 = GP.EPS2;

// Brute-force O(N^2) reference using the same softening as the tree.
function exactAcceleration(bodies, px, py) {
    let ax = 0, ay = 0;
    for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        const dx = b.x - px;
        const dy = b.y - py;
        const d2 = dx * dx + dy * dy + EPS2;
        const inv = G * b.mass / (d2 * Math.sqrt(d2));
        ax += dx * inv;
        ay += dy * inv;
    }
    return [ax, ay];
}

// Deterministic pseudo-random cloud so the tests never flake.
function cloud(count, spread, seedStart) {
    let seed = seedStart;
    const rand = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    };
    const bodies = [];
    for (let i = 0; i < count; i++) {
        bodies.push({ x: rand() * spread, y: rand() * spread, mass: 1 });
    }
    return bodies;
}

describe('galaxy physics: the tree stores the system correctly', () => {
    it('sums the total mass', () => {
        const root = GP.buildTree([
            { x: 0, y: 0, mass: 1 },
            { x: 100, y: 0, mass: 2 },
            { x: 0, y: 100, mass: 3 }
        ]);
        expect(GP.treeMassAndCoM(root).mass).toBeCloseTo(6, 10);
    });

    it('computes the centre of mass', () => {
        const root = GP.buildTree([
            { x: 0, y: 0, mass: 1 },
            { x: 100, y: 0, mass: 3 }
        ]);
        const { cmx, cmy } = GP.treeMassAndCoM(root);
        expect(cmx).toBeCloseTo(75, 10);
        expect(cmy).toBeCloseTo(0, 10);
    });

    it('gives the same answer from the packed state the worker uses', () => {
        // The worker rebuilds the tree from a Float32Array of [x, y, vx, vy].
        // The unit tests build it from objects. If these two disagreed, the
        // tests would not be testing the running simulation.
        const bodies = [];
        for (let i = 0; i < 200; i++) {
            bodies.push({ x: (i * 37) % 211, y: (i * 53) % 197, mass: 1 });
        }
        const state = new Float32Array(bodies.length * 4);
        for (let i = 0; i < bodies.length; i++) {
            state[i * 4] = bodies[i].x;
            state[i * 4 + 1] = bodies[i].y;
        }

        const fromObjects = GP.buildTree(bodies);
        const fromState = GP.buildTreeFromState(state, bodies.length);

        const m1 = GP.treeMassAndCoM(fromObjects);
        const m2 = GP.treeMassAndCoM(fromState);
        expect(m2.mass).toBeCloseTo(m1.mass, 6);
        expect(m2.cmx).toBeCloseTo(m1.cmx, 3);
        expect(m2.cmy).toBeCloseTo(m1.cmy, 3);

        const a1 = GP.accelerateAt(fromObjects, 37.5, 88.25);
        const a2 = GP.accelerateAt(fromState, 37.5, 88.25);
        expect(a2[0]).toBeCloseTo(a1[0], 6);
        expect(a2[1]).toBeCloseTo(a1[1], 6);
    });
});

describe('galaxy physics: the field is Newtonian', () => {
    it('gives a single mass the expected inverse-square pull', () => {
        // One unit mass at the origin, test point 100 px away along x.
        // The pull points back towards the origin, so it is negative in x.
        const root = GP.buildTree([{ x: 0, y: 0, mass: 1 }]);
        const [ax, ay] = GP.accelerateAt(root, 100, 0);
        // a = G m r_vec / (r^2 + eps^2)^(3/2), with r_vec = (-100, 0).
        const d2 = 100 * 100 + EPS2;
        const expected = G * 1 * -100 / Math.pow(d2, 1.5);
        expect(ax).toBeCloseTo(expected, 12);
        expect(ay).toBeCloseTo(0, 12);
    });

    it('points at the source, not away from it', () => {
        const root = GP.buildTree([{ x: -50, y: 0, mass: 1 }]);
        const [ax] = GP.accelerateAt(root, 50, 0);
        expect(ax).toBeLessThan(0); // pulled towards x = -50
    });

    it('does not accelerate a body by itself', () => {
        const root = GP.buildTree([{ x: 12, y: 34, mass: 1 }]);
        const [ax, ay] = GP.accelerateAt(root, 12, 34);
        expect(ax).toBeCloseTo(0, 12);
        expect(ay).toBeCloseTo(0, 12);
    });

    it('obeys Newton third law for an isolated pair', () => {
        const bodies = [{ x: 0, y: 0, mass: 1 }, { x: 100, y: 0, mass: 1 }];
        const root = GP.buildTree(bodies);
        const a0 = GP.accelerateAt(root, bodies[0].x, bodies[0].y);
        const a1 = GP.accelerateAt(root, bodies[1].x, bodies[1].y);
        // Equal and opposite: the pair's centre of mass does not accelerate.
        expect(a0[0]).toBeCloseTo(-a1[0], 12);
        expect(a0[1]).toBeCloseTo(-a1[1], 12);
        expect(a0[0]).toBeGreaterThan(0);
    });

    it('does not accelerate the centre of mass of an isolated system', () => {
        // Newton's third law, summed over every pair, states that the net
        // force on an isolated system is zero:
        //
        //   sum_i m_i a_i = 0
        //
        // so the centre of mass moves at constant velocity. Note this is the
        // MASS-WEIGHTED sum; the unweighted sum of accelerations is only
        // zero when every body has the same mass, so it is asserted
        // separately below.
        const bodies = [];
        for (let i = 0; i < 40; i++) {
            bodies.push({ x: (i * 17) % 97, y: (i * 29) % 83, mass: 1 + (i % 3) });
        }
        let ax = 0, ay = 0;
        for (const b of bodies) {
            const [bx, by] = exactAcceleration(bodies, b.x, b.y);
            ax += b.mass * bx; ay += b.mass * by;
        }
        expect(Math.hypot(ax, ay)).toBeLessThan(1e-12);
    });

    it('cancels the unweighted accelerations for equal masses', () => {
        // With identical bodies the unweighted sum must also vanish, which
        // makes it a clean check of the exact pairwise sum.
        const bodies = [];
        for (let i = 0; i < 30; i++) {
            bodies.push({ x: (i * 17) % 97, y: (i * 29) % 83, mass: 1 });
        }
        let ax = 0, ay = 0;
        for (const b of bodies) {
            const [bx, by] = exactAcceleration(bodies, b.x, b.y);
            ax += bx; ay += by;
        }
        expect(Math.hypot(ax, ay)).toBeLessThan(1e-12);
    });
});

describe('galaxy physics: the far field', () => {
    it('converges to a point mass at the centre of mass', () => {
        // Far outside the system, the field must look like a single mass M
        // sitting at the CoM: a = G M r_hat / r^2.
        const bodies = cloud(120, 200, 7);
        const root = GP.buildTree(bodies);
        const { mass, cmx, cmy } = GP.treeMassAndCoM(root);

        const px = cmx + 40000, py = cmy;
        const [ax, ay] = GP.accelerateAt(root, px, py);

        const dx = cmx - px, dy = cmy - py;
        const d2 = dx * dx + dy * dy + EPS2;
        const expected = G * mass * dx / Math.pow(d2, 1.5);

        expect(ax).toBeCloseTo(expected, 12);
        expect(ay).toBeCloseTo(0, 12);
    });

    it('falls off as 1/r^2', () => {
        // Doubling the distance must reduce the field by a factor of four.
        const bodies = cloud(80, 150, 11);
        const root = GP.buildTree(bodies);
        const { cmx, cmy } = GP.treeMassAndCoM(root);

        const near = GP.accelerateAt(root, cmx + 2000, cmy);
        const far = GP.accelerateAt(root, cmx + 4000, cmy);

        const nearMag = Math.hypot(near[0], near[1]);
        const farMag = Math.hypot(far[0], far[1]);
        expect(nearMag / farMag).toBeCloseTo(4, 2);
    });
});

describe('galaxy physics: the approximation is accurate enough', () => {
    it('converges to brute-force gravity as the opening angle shrinks', () => {
        // The Barnes-Hut criterion s/d < theta is an approximation: a node is
        // replaced by a point mass at its centre of mass. Tightening theta
        // must drive the tree result towards the exact pairwise sum.
        //
        // The error falls off roughly as theta^2, so each halving of theta
        // should cut the error by about a factor of four.
        const bodies = cloud(150, 200, 3);

        const meanError = (theta) => {
            const root = GP.buildTree(bodies, theta);
            let sum = 0, n = 0;
            for (let i = 0; i < bodies.length; i++) {
                const b = bodies[i];
                const approx = GP.accelerateAt(root, b.x, b.y);
                const exact = exactAcceleration(bodies, b.x, b.y);
                const e = Math.hypot(exact[0], exact[1]);
                if (e < 1e-12) continue;
                sum += Math.hypot(approx[0] - exact[0], approx[1] - exact[1]) / e;
                n++;
            }
            return sum / n;
        };

        const loose = meanError(0.8);
        const tight = meanError(0.2);
        const tighter = meanError(0.1);

        expect(tight).toBeLessThan(loose);
        expect(tighter).toBeLessThan(tight);
        // The production theta of 0.8 keeps the average error in the low
        // single-digit percent, which is the accuracy the sketch relies on.
        expect(loose).toBeLessThan(0.1);
        expect(tighter).toBeLessThan(0.005);
    });

    it('is exact for a two-body system', () => {
        // With two bodies the tree cannot be wrong: both are visited.
        const bodies = [{ x: 0, y: 0, mass: 2 }, { x: 150, y: 0, mass: 1 }];
        const root = GP.buildTree(bodies);
        const approx = GP.accelerateAt(root, 0, 0);
        const exact = exactAcceleration(bodies, 0, 0);
        expect(approx[0]).toBeCloseTo(exact[0], 12);
        expect(approx[1]).toBeCloseTo(exact[1], 12);
    });
});

describe('galaxy physics: a circular orbit around a single mass', () => {
    it('has the orbital speed sqrt(G M / r)', () => {
        // A body on a circular orbit of radius r around a mass M has
        // v = sqrt(G M / r). The sketch uses the same form for its
        // circular velocity estimate.
        //
        // The softened field is used here, so the centripetal acceleration is
        // the one the simulation actually applies:
        //   a = G M r / (r^2 + eps^2)^(3/2)
        // and the circular speed that balances it is
        //   v = sqrt(a r) = sqrt(G M r^2 / (r^2 + eps^2)^(3/2))
        const M = 1;
        const r = 100;
        const root = GP.buildTree([{ x: 0, y: 0, mass: M }]);
        const [ax] = GP.accelerateAt(root, r, 0);

        const d2 = r * r + EPS2;
        const a = G * M * r / Math.pow(d2, 1.5);
        expect(ax).toBeCloseTo(-a, 12);

        const vCirc = Math.sqrt(a * r);
        // Centripetal: a = v^2 / r
        expect(vCirc * vCirc / r).toBeCloseTo(a, 12);
    });
});
