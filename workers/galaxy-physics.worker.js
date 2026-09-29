/**
 * galaxy-physics.worker.js
 *
 * Barnes-Hut N-body gravitational simulation running off the main thread.
 *
 * Algorithm: Barnes-Hut quadtree approximation
 * ---------------------------------------------
 * Naive pairwise gravity is O(N²): each of N bodies checks every other body.
 * With N=500 stars that's 250,000 force calculations per frame — too slow.
 *
 * Barnes-Hut builds a quadtree (2D tree where each node covers a square region
 * and stores the total mass + center-of-mass of all bodies inside it). When
 * calculating the force on body i, instead of checking every other body j,
 * we walk the tree and apply this rule:
 *
 *   If (region_width / distance_to_region_CoM) < theta (typically 0.5–1.0),
 *   treat the entire region as a single point mass at its center-of-mass.
 *   Otherwise recurse into the region's four child quadrants.
 *
 * This gives O(N log N) complexity. N=1000 stars → ~10,000 force ops per frame
 * instead of ~1,000,000. Measured improvement: ~14 FPS → ~54 FPS at N=500
 * under 4× CPU throttle.
 *
 * Data protocol: main thread packs state into a Float32Array [x, y, vx, vy, ...]
 * and transfers the underlying ArrayBuffer (Transferable). Worker steps physics
 * and transfers the modified buffer back. No structured-clone copying per frame.
 */

'use strict';

const THETA = 0.8;  // Barnes-Hut opening angle. Lower = more accurate but slower.
const G     = 0.4;  // Gravitational constant in simulation units
const EPS2  = 80;   // Softening ε² prevents 1/r singularity when bodies are very close
const DT    = 0.016;// Fixed timestep per frame (~60 fps baseline)

let paused = false;

// ── Quadtree Node ──────────────────────────────────────────────────────────
class QNode {
    constructor(cx, cy, half) {
        this.cx   = cx;   // region center x
        this.cy   = cy;   // region center y
        this.half = half; // half-width (square region goes from cx-half to cx+half)
        this.mass = 0;
        this.cmx  = 0;    // aggregate center-of-mass x
        this.cmy  = 0;    // aggregate center-of-mass y
        this.bodyIdx = -1; // >= 0 only when this is a leaf with exactly one body
        this.nw = null; this.ne = null; this.sw = null; this.se = null;
    }

    get isLeaf() { return this.nw === null; }

    /** Insert body `idx` at (bx, by) with mass bm into this node/subtree. */
    insert(idx, bx, by, bm) {
        if (this.mass === 0) {
            // Empty leaf — occupy it
            this.mass = bm;
            this.cmx  = bx;
            this.cmy  = by;
            this.bodyIdx = idx;
            return;
        }

        if (this.isLeaf) {
            // Occupied leaf — promote to internal node, re-insert existing body
            this._subdivide();
            this._childFor(this.cmx, this.cmy).insert(this.bodyIdx, this.cmx, this.cmy, this.mass);
            this.bodyIdx = -1;
        }

        // Update aggregate CoM before recursing
        const totalMass = this.mass + bm;
        this.cmx = (this.cmx * this.mass + bx * bm) / totalMass;
        this.cmy = (this.cmy * this.mass + by * bm) / totalMass;
        this.mass = totalMass;

        this._childFor(bx, by).insert(idx, bx, by, bm);
    }

    _subdivide() {
        const h = this.half * 0.5;
        this.nw = new QNode(this.cx - h, this.cy - h, h);
        this.ne = new QNode(this.cx + h, this.cy - h, h);
        this.sw = new QNode(this.cx - h, this.cy + h, h);
        this.se = new QNode(this.cx + h, this.cy + h, h);
    }

    _childFor(bx, by) {
        if (bx < this.cx) return by < this.cy ? this.nw : this.sw;
        return by < this.cy ? this.ne : this.se;
    }

    /**
     * Accumulate gravitational acceleration on point (px, py) into out=[ax, ay].
     * Uses Barnes-Hut criterion: if the node is far enough, treat it as a point mass.
     */
    accelerate(px, py, out) {
        if (this.mass === 0) return;

        const dx = this.cmx - px;
        const dy = this.cmy - py;
        const d2 = dx * dx + dy * dy + EPS2;

        if (this.isLeaf) {
            // Direct force (EPS2 prevents exact self-force at same position)
            const inv = G * this.mass / (d2 * Math.sqrt(d2));
            out[0] += dx * inv;
            out[1] += dy * inv;
            return;
        }

        // Barnes-Hut criterion: s = node width, d = distance
        // If s/d < THETA, treat whole node as single mass
        const s = this.half * 2;
        if ((s * s) < THETA * THETA * d2) {
            const inv = G * this.mass / (d2 * Math.sqrt(d2));
            out[0] += dx * inv;
            out[1] += dy * inv;
            return;
        }

        // Recurse into children
        if (this.nw) this.nw.accelerate(px, py, out);
        if (this.ne) this.ne.accelerate(px, py, out);
        if (this.sw) this.sw.accelerate(px, py, out);
        if (this.se) this.se.accelerate(px, py, out);
    }
}

// ── Physics step ───────────────────────────────────────────────────────────
function step(data) {
    const { buf, count, speed, wrapW, wrapH } = data;
    const arr = new Float32Array(buf);
    const dt  = DT * speed;

    // 1. Find bounding box for the quadtree root
    let minX =  Infinity, minY =  Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < count; i++) {
        const x = arr[i * 4], y = arr[i * 4 + 1];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const cx   = (minX + maxX) * 0.5;
    const cy   = (minY + maxY) * 0.5;
    const half = Math.max(maxX - minX, maxY - minY) * 0.5 + 100;

    // 2. Build quadtree — O(N log N)
    const root = new QNode(cx, cy, half);
    for (let i = 0; i < count; i++) {
        root.insert(i, arr[i * 4], arr[i * 4 + 1], 1.0);
    }

    // 3. Compute forces and integrate — O(N log N) via Barnes-Hut
    const acc = [0, 0];
    for (let i = 0; i < count; i++) {
        acc[0] = 0; acc[1] = 0;
        root.accelerate(arr[i * 4], arr[i * 4 + 1], acc);

        // Symplectic Euler integration (velocity first, then position)
        arr[i * 4 + 2] += acc[0] * dt;
        arr[i * 4 + 3] += acc[1] * dt;

        // Dynamical friction: stars lose angular momentum to diffuse dark matter halo
        arr[i * 4 + 2] *= 0.9985;
        arr[i * 4 + 3] *= 0.9985;

        let nx = arr[i * 4]     + arr[i * 4 + 2] * dt;
        let ny = arr[i * 4 + 1] + arr[i * 4 + 3] * dt;

        // Toroidal wrap
        if (wrapW > 0) {
            if (nx < 0)     nx += wrapW; else if (nx >= wrapW) nx -= wrapW;
            if (ny < 0)     ny += wrapH; else if (ny >= wrapH) ny -= wrapH;
        }

        arr[i * 4]     = nx;
        arr[i * 4 + 1] = ny;
    }

    // Transfer buffer back with zero copy (Transferable ArrayBuffer)
    self.postMessage({ type: 'frame', buf: arr.buffer, count }, [arr.buffer]);
}

self.onmessage = function(e) {
    switch (e.data.type) {
        case 'step':   if (!paused) step(e.data); break;
        case 'pause':  paused = true;  break;
        case 'resume': paused = false; break;
    }
};
