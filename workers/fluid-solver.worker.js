/**
 * fluid-solver.worker.js
 *
 * Navier-Stokes stable fluid simulation using Jos Stam's "Stable Fluids" method (1999).
 *
 * How it works (for a curious 16-year-old):
 * ------------------------------------------
 * Real smoke or water is described by two things at every point in space:
 *   1. A velocity (vx, vy) — how fast the fluid is moving and in what direction.
 *   2. A density/dye value — the "colour" or concentration of smoke.
 *
 * Every frame we do four operations to advance the simulation by one timestep:
 *
 *   Step 1 — Add external forces (mouse drag, gravity).
 *             This is the easy one: just add forces directly to velocity.
 *
 *   Step 2 — Advect: move the velocity/dye along itself.
 *             Imagine a particle at each grid cell. Trace where it came FROM
 *             one timestep ago (by following the velocity field backwards).
 *             The new value at that cell is whatever was at that origin point.
 *             This "semi-Lagrangian" advection is unconditionally stable —
 *             it never blows up regardless of timestep size.
 *
 *   Step 3 — Diffuse: spread the values out a little each frame.
 *             Real fluids have viscosity. We solve a sparse linear system with
 *             Gauss-Seidel iteration (a simple iterative solver that converges
 *             in ~20 iterations, fast enough to do in a worker).
 *
 *   Step 4 — Project: enforce that the velocity field is divergence-free.
 *             "Divergence-free" means fluid can't be created or destroyed —
 *             what flows in must flow out. We compute a "pressure field" that
 *             corrects the velocity so it satisfies this constraint. This uses
 *             the same Gauss-Seidel solver.
 *
 * Why this is simplified vs. professional CFD:
 *   Professional solvers (OpenFOAM, Ansys Fluent) use finite-element methods,
 *   adaptive meshes, multigrid pressure solvers (PCG), turbulence models
 *   (k-ε, LES), and run on GPU clusters. Our grid is 128×128; they use
 *   millions of cells. Our pressure solve takes 20 iterations; theirs takes
 *   thousands. But the underlying equations are the same Navier-Stokes —
 *   ours is just a low-fidelity approximation that's fast enough for real-time.
 *
 * Data protocol:
 *   - main thread sends { type:'step', vx, vy, density, forces, params } as
 *     separate Float32Arrays in a single postMessage (all Transferable).
 *   - worker returns { type:'frame', vx, vy, density } as Transferables.
 *   - No structured-clone copying of large arrays.
 */

'use strict';

const ITER = 20; // Gauss-Seidel iterations — enough for visual stability

let N = 128; // Grid size (N×N cells); updated on 'init' message

function idx(x, y) { return x + (N + 2) * y; }

function setBoundary(b, x) {
    // Reflect boundaries: velocity flips sign at walls, density clamps
    for (let i = 1; i <= N; i++) {
        x[idx(0,     i)] = b === 1 ? -x[idx(1, i)] : x[idx(1, i)];
        x[idx(N + 1, i)] = b === 1 ? -x[idx(N, i)] : x[idx(N, i)];
        x[idx(i,     0)] = b === 2 ? -x[idx(i, 1)] : x[idx(i, 1)];
        x[idx(i, N + 1)] = b === 2 ? -x[idx(i, N)] : x[idx(i, N)];
    }
    // Corners: average of adjacent boundary cells
    x[idx(0,     0)]     = 0.5 * (x[idx(1,     0)] + x[idx(0,     1)]);
    x[idx(0,     N + 1)] = 0.5 * (x[idx(1,     N + 1)] + x[idx(0, N)]);
    x[idx(N + 1, 0)]     = 0.5 * (x[idx(N,     0)] + x[idx(N + 1, 1)]);
    x[idx(N + 1, N + 1)] = 0.5 * (x[idx(N,     N + 1)] + x[idx(N + 1, N)]);
}

/**
 * Diffuse: solve (I - dt·visc·∇²) x = x0 via Gauss-Seidel.
 * This is the implicit form — unconditionally stable for any dt and visc.
 */
function diffuse(b, x, x0, diff, dt) {
    const a = dt * diff * N * N;
    const inv = 1 / (1 + 4 * a);
    for (let k = 0; k < ITER; k++) {
        for (let j = 1; j <= N; j++) {
            for (let i = 1; i <= N; i++) {
                x[idx(i, j)] = (x0[idx(i, j)] + a * (
                    x[idx(i - 1, j)] + x[idx(i + 1, j)] +
                    x[idx(i, j - 1)] + x[idx(i, j + 1)]
                )) * inv;
            }
        }
        setBoundary(b, x);
    }
}

/**
 * Advect: semi-Lagrangian trace-back.
 * For each cell, trace where the particle at that cell came from
 * dt seconds ago using the current velocity field. Sample d0 at that
 * origin point using bilinear interpolation.
 */
function advect(b, d, d0, u, v, dt) {
    const dt0 = dt * N;
    for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
            // Trace back
            let x = i - dt0 * u[idx(i, j)];
            let y = j - dt0 * v[idx(i, j)];
            // Clamp to domain
            if (x < 0.5) x = 0.5; if (x > N + 0.5) x = N + 0.5;
            if (y < 0.5) y = 0.5; if (y > N + 0.5) y = N + 0.5;
            const i0 = Math.floor(x), i1 = i0 + 1;
            const j0 = Math.floor(y), j1 = j0 + 1;
            // Bilinear weights
            const s1 = x - i0, s0 = 1 - s1;
            const t1 = y - j0, t0 = 1 - t1;
            d[idx(i, j)] =
                s0 * (t0 * d0[idx(i0, j0)] + t1 * d0[idx(i0, j1)]) +
                s1 * (t0 * d0[idx(i1, j0)] + t1 * d0[idx(i1, j1)]);
        }
    }
    setBoundary(b, d);
}

/**
 * Project: enforce incompressibility (divergence-free velocity field).
 * Compute pressure from div(u), then subtract ∇pressure from velocity.
 * This is Helmholtz decomposition — splits v into divergence-free + gradient parts.
 */
function project(u, v, p, div) {
    const h = 1.0 / N;
    // Compute divergence
    for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
            div[idx(i, j)] = -0.5 * h * (
                u[idx(i + 1, j)] - u[idx(i - 1, j)] +
                v[idx(i, j + 1)] - v[idx(i, j - 1)]
            );
            p[idx(i, j)] = 0;
        }
    }
    setBoundary(0, div);
    setBoundary(0, p);

    // Solve pressure Poisson equation via Gauss-Seidel
    for (let k = 0; k < ITER; k++) {
        for (let j = 1; j <= N; j++) {
            for (let i = 1; i <= N; i++) {
                p[idx(i, j)] = (div[idx(i, j)] + (
                    p[idx(i - 1, j)] + p[idx(i + 1, j)] +
                    p[idx(i, j - 1)] + p[idx(i, j + 1)]
                )) * 0.25;
            }
        }
        setBoundary(0, p);
    }

    // Subtract pressure gradient from velocity
    for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
            u[idx(i, j)] -= 0.5 * (p[idx(i + 1, j)] - p[idx(i - 1, j)]) / h;
            v[idx(i, j)] -= 0.5 * (p[idx(i, j + 1)] - p[idx(i, j - 1)]) / h;
        }
    }
    setBoundary(1, u);
    setBoundary(2, v);
}

// Per-sim persistent arrays (allocated once on init)
let vx, vy, vx0, vy0, dens, dens0, pressure, divArr;
let paused = false;

function allocate() {
    const sz = (N + 2) * (N + 2);
    vx       = new Float32Array(sz);
    vy       = new Float32Array(sz);
    vx0      = new Float32Array(sz);
    vy0      = new Float32Array(sz);
    dens     = new Float32Array(sz);
    dens0    = new Float32Array(sz);
    pressure = new Float32Array(sz);
    divArr   = new Float32Array(sz);
}

function step(data) {
    const { dt, visc, diff, forces, params } = data;

    // Apply forces: mouse drag adds velocity, dye source adds density
    for (const f of forces) {
        const gi = Math.round(f.x * N);
        const gj = Math.round(f.y * N);
        if (gi >= 1 && gi <= N && gj >= 1 && gj <= N) {
            vx0[idx(gi, gj)] += f.dvx * 200 * dt;
            vy0[idx(gi, gj)] += f.dvy * 200 * dt;
            dens0[idx(gi, gj)] += f.dye * 4;
        }
    }

    // Velocity step
    // 1. Add forces (already done above via vx0/vy0)
    // 2. Diffuse velocity
    diffuse(1, vx, vx0, visc, dt);
    diffuse(2, vy, vy0, visc, dt);
    // 3. Project to divergence-free
    project(vx, vy, pressure, divArr);
    // 4. Advect velocity with itself
    vx0.set(vx); vy0.set(vy);
    advect(1, vx, vx0, vx0, vy0, dt);
    advect(2, vy, vy0, vx0, vy0, dt);
    // 5. Project again (fixes drift from advection)
    project(vx, vy, pressure, divArr);

    // Density step
    // Decay density slightly each frame (smoke dissipates)
    const decay = params.decay || 0.998;
    for (let i = 0; i < dens.length; i++) dens[i] *= decay;
    // Diffuse and advect dye
    diffuse(0, dens0, dens, diff, dt);
    advect(0, dens, dens0, vx, vy, dt);

    // Prepare output: clone arrays for transfer
    // We copy dens and vx/vy into fresh buffers so the persistent sim arrays
    // stay allocated in the worker (no re-allocation next frame)
    const outDens = new Float32Array(dens);
    const outVx   = new Float32Array(vx);
    const outVy   = new Float32Array(vy);

    // Clear force accumulators for next frame
    vx0.fill(0);
    vy0.fill(0);
    dens0.fill(0);

    self.postMessage({
        type: 'frame',
        dens: outDens.buffer,
        vx:   outVx.buffer,
        vy:   outVy.buffer,
        N,
    }, [outDens.buffer, outVx.buffer, outVy.buffer]);
}

self.onmessage = function(e) {
    switch (e.data.type) {
        case 'init':
            N = e.data.N || 128;
            allocate();
            self.postMessage({ type: 'ready', N });
            break;
        case 'step':
            if (!paused) step(e.data);
            break;
        case 'reset':
            allocate();
            self.postMessage({ type: 'ready', N });
            break;
        case 'pause':  paused = true;  break;
        case 'resume': paused = false; break;
    }
};
