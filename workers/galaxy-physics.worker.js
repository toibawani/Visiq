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

// The Barnes-Hut quadtree lives in assets/galaxy-physics.js so that the
// force law has a single implementation shared by this worker and the unit
// tests in tests/galaxy-physics.test.js.
importScripts('../assets/galaxy-physics.js');

const { buildTreeFromState, accelerateAt } = self.VisiqGalaxyPhysics;

const DT = 0.016;// Fixed timestep per frame (~60 fps baseline)

let paused = false;

// ── Physics step ───────────────────────────────────────────────────────────
function step(data) {
    const { buf, count, speed, wrapW, wrapH } = data;
    const arr = new Float32Array(buf);
    const dt  = DT * speed;

    // 1. Build the quadtree — O(N log N)
    const root = buildTreeFromState(arr, count);

    // 2. Compute forces and integrate — O(N log N) via Barnes-Hut
    for (let i = 0; i < count; i++) {
        const acc = accelerateAt(root, arr[i * 4], arr[i * 4 + 1]);

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
