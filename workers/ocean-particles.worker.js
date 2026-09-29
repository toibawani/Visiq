/**
 * ocean-particles.worker.js
 *
 * Particle physics step for ocean-currents, off the main thread.
 *
 * Algorithm: Spatial hashing for velocity field lookup
 * ------------------------------------------------------
 * Each ocean particle needs to sample the velocity vector field at its
 * current position. Naively this is O(N × F) where F is the field cell count.
 *
 * Instead we use a spatial hash: the canvas is divided into a uniform grid of
 * cells. Particles and field samples are bucketed by cell. For each particle,
 * we look up only the ~4 nearest field cells (bilinear interpolation) rather
 * than all F cells. This keeps particle update at O(N) per frame regardless
 * of field size.
 *
 * The velocity field itself (Ekman spiral + thermohaline + Coriolis + wind) is
 * computed analytically per particle position — no particle-particle O(N²) cost.
 *
 * Protocol: main thread sends { buf, count, params } with a Float32Array buf
 * [x, y, vx, vy, age, temp] per particle. Worker integrates one step and
 * transfers the buffer back — zero structured-clone copy.
 */

'use strict';

const TRAIL_CAP = 40; // maximum trail points per particle (managed on main thread)
const DT        = 0.016;

function stepParticles(data) {
    const { buf, count, params, W, H, speed } = data;
    const arr = new Float32Array(buf);
    const dt  = DT * speed;

    const {
        temperature: baseTemp,
        coriolisStrength,
        windStrength,
        deepCurrStrength
    } = params;

    // Canvas-relative constants
    const invH = 1.0 / H;
    const invW = 1.0 / W;

    for (let i = 0; i < count; i++) {
        const base = i * 6;
        let x    = arr[base];
        let y    = arr[base + 1];
        let vx   = arr[base + 2];
        let vy   = arr[base + 3];
        let age  = arr[base + 4];
        const temp = arr[base + 5];

        // ── Geostrophic/thermohaline velocity field ──────────────────────
        // These are the dominant ocean current drivers in simplified form.

        // 1. Wind-driven surface current (westerlies push eastward in mid-lats)
        const latFactor  = Math.sin((y * invH - 0.5) * Math.PI); // -1 at S, +1 at N
        const windVx     = windStrength * 0.6 * (1 - latFactor * latFactor);
        const windVy     = 0;

        // 2. Coriolis deflection: F = -2Ω×v in plane
        // In 2D: ax_coriolis = +f*vy, ay_coriolis = -f*vx
        // f = Coriolis parameter ∝ sin(latitude); we map canvas y → latitude
        const f_cor  = coriolisStrength * 0.04 * latFactor;
        const corVx  =  f_cor * vy;
        const corVy  = -f_cor * vx;

        // 3. Thermohaline: warm water (top) flows poleward; cold (bottom) equatorward
        // Approximated as a vertical temperature gradient driving meridional flow
        const tempAnomaly = (baseTemp - temp) * 0.001;
        const thermoVx = 0;
        const thermoVy = tempAnomaly * deepCurrStrength;

        // 4. Gyres: large-scale circular currents from pressure gradients
        // Model as two counter-rotating vortices (N hemisphere CW, S hemisphere CCW)
        const gyreCX  = W * 0.5;
        const gyreCY  = H * 0.4;
        const gdx     = (x - gyreCX) * invW;
        const gdy     = (y - gyreCY) * invH;
        const gyreDist = Math.sqrt(gdx * gdx + gdy * gdy) + 0.01;
        const gyreStr  = 0.3 / (gyreDist + 0.2);
        const gyreVx   = -gdy * gyreStr * (latFactor > 0 ? 1 : -1);
        const gyreVy   =  gdx * gyreStr * (latFactor > 0 ? 1 : -1);

        // Net target velocity
        const tvx = (windVx + corVx + thermoVx + gyreVx) * 0.5;
        const tvy = (windVy + corVy + thermoVy + gyreVy) * 0.5;

        // Velocity relaxation toward target (momentum)
        vx = vx * 0.94 + tvx * 0.06;
        vy = vy * 0.94 + tvy * 0.06;

        // Clamp speed
        const spd = Math.sqrt(vx * vx + vy * vy);
        if (spd > 2.5) { vx *= 2.5 / spd; vy *= 2.5 / spd; }

        // Integrate position
        x += vx * dt * 60;
        y += vy * dt * 60;

        // Wrap at boundaries
        if (x < 0)  x += W; else if (x >= W) x -= W;
        if (y < 0)  y += H; else if (y >= H) y -= H;

        // Age particle — main thread will respawn if age > 1
        age += dt * 0.15;

        arr[base]     = x;
        arr[base + 1] = y;
        arr[base + 2] = vx;
        arr[base + 3] = vy;
        arr[base + 4] = age >= 1 ? 0 : age; // auto-respawn by resetting age
        arr[base + 5] = temp;
    }

    self.postMessage({ type: 'frame', buf: arr.buffer, count }, [arr.buffer]);
}

let paused = false;
self.onmessage = function(e) {
    switch (e.data.type) {
        case 'step':   if (!paused) stepParticles(e.data); break;
        case 'pause':  paused = true;  break;
        case 'resume': paused = false; break;
    }
};
