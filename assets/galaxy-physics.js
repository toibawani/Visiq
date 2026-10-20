// ===== Galaxy collision — Barnes-Hut quadtree =====
// Faithful extraction of the quadtree and force routine that
// workers/galaxy-physics.worker.js runs off the main thread. The integration
// step (symplectic Euler, dynamical friction, toroidal wrap) is deliberately
// left out: it is the sketch's display choice, not the force law.
//
// Works in the browser (window.VisiqGalaxyPhysics) and in Node (module.exports).
//
// Known answers (external facts, not numbers copied out of the implementation):
//   Far from the system the field converges to the total mass at the CoM:
//                                   a = G M / r^2 toward the CoM
//   A body does not attract itself:   a = 0 at its own position
//   Newton's third law:               F_ij = -F_ji, so the net force on an
//                                     isolated pair is zero
//   The opening-angle test is s/d < theta, so a far node is approximated as a
//                                     point mass at its CoM

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
    if (typeof root !== 'undefined') {
        root.VisiqGalaxyPhysics = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const THETA = 0.8;
    const G = 0.4;
    const EPS2 = 80;

    class QNode {
        constructor(cx, cy, half, theta) {
            this.cx = cx; this.cy = cy; this.half = half;
            this.theta = theta;
            this.mass = 0; this.cmx = 0; this.cmy = 0;
            this.bodyIdx = -1;
            this.nw = null; this.ne = null; this.sw = null; this.se = null;
        }
        get isLeaf() { return this.nw === null; }

        insert(idx, bx, by, bm) {
            if (this.mass === 0) {
                this.mass = bm; this.cmx = bx; this.cmy = by; this.bodyIdx = idx;
                return;
            }
            if (this.isLeaf) {
                this._subdivide();
                this._childFor(this.cmx, this.cmy).insert(this.bodyIdx, this.cmx, this.cmy, this.mass);
                this.bodyIdx = -1;
            }
            const totalMass = this.mass + bm;
            this.cmx = (this.cmx * this.mass + bx * bm) / totalMass;
            this.cmy = (this.cmy * this.mass + by * bm) / totalMass;
            this.mass = totalMass;
            this._childFor(bx, by).insert(idx, bx, by, bm);
        }

        _subdivide() {
            const h = this.half * 0.5;
            this.nw = new QNode(this.cx - h, this.cy - h, h, this.theta);
            this.ne = new QNode(this.cx + h, this.cy - h, h, this.theta);
            this.sw = new QNode(this.cx - h, this.cy + h, h, this.theta);
            this.se = new QNode(this.cx + h, this.cy + h, h, this.theta);
        }

        _childFor(bx, by) {
            if (bx < this.cx) return by < this.cy ? this.nw : this.sw;
            return by < this.cy ? this.ne : this.se;
        }

        // Accumulate gravitational acceleration on (px, py) into out=[ax, ay].
        accelerate(px, py, out) {
            if (this.mass === 0) return;
            const dx = this.cmx - px;
            const dy = this.cmy - py;
            const d2 = dx * dx + dy * dy + EPS2;
            if (this.isLeaf) {
                const inv = G * this.mass / (d2 * Math.sqrt(d2));
                out[0] += dx * inv; out[1] += dy * inv;
                return;
            }
            const s = this.half * 2;
            if ((s * s) < this.theta * this.theta * d2) {
                const inv = G * this.mass / (d2 * Math.sqrt(d2));
                out[0] += dx * inv; out[1] += dy * inv;
                return;
            }
            if (this.nw) this.nw.accelerate(px, py, out);
            if (this.ne) this.ne.accelerate(px, py, out);
            if (this.sw) this.sw.accelerate(px, py, out);
            if (this.se) this.se.accelerate(px, py, out);
        }
    }

    // Build the tree for a set of bodies. bodies is an array of
    // { x, y, mass }. Returns the root QNode.
    function buildTree(bodies, theta) {
        const th = theta === undefined ? THETA : theta;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let i = 0; i < bodies.length; i++) {
            const b = bodies[i];
            if (b.x < minX) minX = b.x; if (b.x > maxX) maxX = b.x;
            if (b.y < minY) minY = b.y; if (b.y > maxY) maxY = b.y;
        }
        const cx = (minX + maxX) * 0.5;
        const cy = (minY + maxY) * 0.5;
        const half = Math.max(maxX - minX, maxY - minY) * 0.5 + 100;
        const root = new QNode(cx, cy, half, th);
        for (let i = 0; i < bodies.length; i++) {
            root.insert(i, bodies[i].x, bodies[i].y, bodies[i].mass);
        }
        return root;
    }

    // Build the tree directly from the worker's packed state, which is a
    // Float32Array of [x, y, vx, vy] per body. This avoids allocating an
    // intermediate object per body on every frame, which matters because the
    // worker rebuilds the tree 60 times a second.
    function buildTreeFromState(state, count, theta) {
        const th = theta === undefined ? THETA : theta;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let i = 0; i < count; i++) {
            const x = state[i * 4], y = state[i * 4 + 1];
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
        const cx = (minX + maxX) * 0.5;
        const cy = (minY + maxY) * 0.5;
        const half = Math.max(maxX - minX, maxY - minY) * 0.5 + 100;
        const root = new QNode(cx, cy, half, th);
        for (let i = 0; i < count; i++) {
            root.insert(i, state[i * 4], state[i * 4 + 1], 1.0);
        }
        return root;
    }

    // Acceleration on a single point, given the tree.
    function accelerateAt(root, px, py) {
        const out = [0, 0];
        root.accelerate(px, py, out);
        return out;
    }

    // Total mass and centre of mass stored in the tree root.
    function treeMassAndCoM(root) {
        return { mass: root.mass, cmx: root.cmx, cmy: root.cmy };
    }

    return {
        QNode,
        buildTree,
        buildTreeFromState,
        accelerateAt,
        treeMassAndCoM,
        THETA, G, EPS2
    };
}));
