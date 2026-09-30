/**
 * gravity-tree.worker.js
 *
 * Barnes-Hut self-gravity + spatial-hash merging, off the main thread.
 *
 * Algorithm: Barnes-Hut quadtree (same criterion as galaxy-physics.worker.js)
 * ----------------------------------------------------------------------
 * Naive pairwise gravity is O(N²). With N=800 bodies that is ~640,000
 * force evaluations per frame on the UI thread.
 *
 * Barnes-Hut inserts every body into a quadtree. Each node stores total mass
 * and center-of-mass. When walking the tree for body i:
 *   if (node_width / distance_to_CoM) < theta, treat the whole node as one
 *   point mass; otherwise recurse into children.
 * Complexity is O(N log N) for a reasonably uniform distribution.
 *
 * Merges (this sim's "tree" growth) use a uniform spatial hash: bodies are
 * bucketed into cells of size ~max radius. Only same-cell and 8-neighbour
 * cells are tested for overlap. That is O(N) average, not O(N²).
 *
 * Layout: Float32Array [x, y, vx, vy, mass, radius] × count.
 * Transferable ArrayBuffer in both directions. No structured clone of the
 * particle list.
 */

'use strict';

const THETA = 0.85;
const EPS2  = 64;
const DT    = 0.016;

let paused = false;

class QNode {
    constructor(cx, cy, half) {
        this.cx = cx; this.cy = cy; this.half = half;
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
        const total = this.mass + bm;
        this.cmx = (this.cmx * this.mass + bx * bm) / total;
        this.cmy = (this.cmy * this.mass + by * bm) / total;
        this.mass = total;
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

    accelerate(px, py, skipIdx, out) {
        if (this.mass === 0) return;
        if (this.isLeaf && this.bodyIdx === skipIdx) return;

        const dx = this.cmx - px;
        const dy = this.cmy - py;
        const d2 = dx * dx + dy * dy + EPS2;

        if (this.isLeaf) {
            const inv = this.mass / (d2 * Math.sqrt(d2));
            out[0] += dx * inv;
            out[1] += dy * inv;
            return;
        }

        const s = this.half * 2;
        if ((s * s) < THETA * THETA * d2) {
            const inv = this.mass / (d2 * Math.sqrt(d2));
            out[0] += dx * inv;
            out[1] += dy * inv;
            return;
        }
        if (this.nw) this.nw.accelerate(px, py, skipIdx, out);
        if (this.ne) this.ne.accelerate(px, py, skipIdx, out);
        if (this.sw) this.sw.accelerate(px, py, skipIdx, out);
        if (this.se) this.se.accelerate(px, py, skipIdx, out);
    }
}

function step(data) {
    const { buf, count, G, gDown, damping, wrapW, wrapH, speed } = data;
    const arr = new Float32Array(buf);
    const dt = DT * speed;
    const stride = 6;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < count; i++) {
        const x = arr[i * stride], y = arr[i * stride + 1];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;
    const half = Math.max(maxX - minX, maxY - minY) * 0.5 + 80;

    const root = new QNode(cx, cy, half);
    for (let i = 0; i < count; i++) {
        root.insert(i, arr[i * stride], arr[i * stride + 1], arr[i * stride + 4]);
    }

    const acc = [0, 0];
    for (let i = 0; i < count; i++) {
        acc[0] = 0; acc[1] = 0;
        root.accelerate(arr[i * stride], arr[i * stride + 1], i, acc);
        arr[i * stride + 2] += acc[0] * G * dt;
        arr[i * stride + 3] += acc[1] * G * dt + gDown * dt;
        arr[i * stride + 2] *= damping;
        arr[i * stride + 3] *= damping;
        arr[i * stride]     += arr[i * stride + 2] * dt * 60;
        arr[i * stride + 1] += arr[i * stride + 3] * dt * 60;

        const r = arr[i * stride + 5];
        if (arr[i * stride] < r) { arr[i * stride] = r; arr[i * stride + 2] *= -0.8; }
        if (arr[i * stride] > wrapW - r) { arr[i * stride] = wrapW - r; arr[i * stride + 2] *= -0.8; }
        if (arr[i * stride + 1] < r) { arr[i * stride + 1] = r; arr[i * stride + 3] *= -0.45; }
        if (arr[i * stride + 1] > wrapH - r) { arr[i * stride + 1] = wrapH - r; arr[i * stride + 3] *= -0.45; }
    }

    // Spatial hash merge
    const cell = 16;
    const cols = Math.max(1, Math.ceil(wrapW / cell));
    const buckets = new Map();
    for (let i = 0; i < count; i++) {
        const cxb = Math.floor(arr[i * stride] / cell);
        const cyb = Math.floor(arr[i * stride + 1] / cell);
        const key = cxb + cyb * cols;
        let list = buckets.get(key);
        if (!list) { list = []; buckets.set(key, list); }
        list.push(i);
    }

    const alive = new Uint8Array(count);
    alive.fill(1);

    function tryMerge(i, j) {
        if (!alive[i] || !alive[j]) return;
        const dx = arr[j * stride] - arr[i * stride];
        const dy = arr[j * stride + 1] - arr[i * stride + 1];
        const minD = arr[i * stride + 5] + arr[j * stride + 5];
        if (dx * dx + dy * dy > minD * minD) return;
        const keep = arr[i * stride + 4] >= arr[j * stride + 4] ? i : j;
        const drop = keep === i ? j : i;
        const m1 = arr[keep * stride + 4];
        const m2 = arr[drop * stride + 4];
        const m = m1 + m2;
        arr[keep * stride + 2] = (arr[keep * stride + 2] * m1 + arr[drop * stride + 2] * m2) / m;
        arr[keep * stride + 3] = (arr[keep * stride + 3] * m1 + arr[drop * stride + 3] * m2) / m;
        arr[keep * stride + 4] = m;
        arr[keep * stride + 5] = Math.cbrt(m) * 3;
        alive[drop] = 0;
    }

    for (const [key, list] of buckets) {
        const cxb = key % cols;
        const cyb = (key / cols) | 0;
        const neighbours = [];
        for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
                const n = buckets.get((cxb + ox) + (cyb + oy) * cols);
                if (n) neighbours.push(n);
            }
        }
        for (let a = 0; a < list.length; a++) {
            const i = list[a];
            for (const nlist of neighbours) {
                for (let b = 0; b < nlist.length; b++) {
                    const j = nlist[b];
                    if (j <= i) continue;
                    tryMerge(i, j);
                }
            }
        }
    }

    let write = 0;
    for (let i = 0; i < count; i++) {
        if (!alive[i]) continue;
        if (write !== i) {
            arr.copyWithin(write * stride, i * stride, i * stride + stride);
        }
        write++;
    }

    const outCount = write;
    const out = arr.buffer.slice(0, outCount * stride * 4);
    self.postMessage({ type: 'frame', buf: out, count: outCount }, [out]);
}

self.onmessage = function(e) {
    switch (e.data.type) {
        case 'step':   if (!paused) step(e.data); break;
        case 'pause':  paused = true; break;
        case 'resume': paused = false; break;
    }
};
