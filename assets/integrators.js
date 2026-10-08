// ===== VISIQ SHARED NUMERICAL INTEGRATORS =====
// Integrators for first-order systems s' = f(s), where the state array holds
// positions in the first half and velocities in the second half
// (e.g. double pendulum s = [t1, t2, w1, w2] with f(s) = [w1, w2, a1, a2]).
//
// Works both in the browser (window.VisiqIntegrators) and in Node tests
// (module.exports), so energy-drift behaviour can be asserted without a canvas.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.VisiqIntegrators = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Forward Euler: explicit, first order. Injects energy into oscillators.
    function euler(f, s, dt) {
        const k = f(s);
        return s.map((v, i) => v + dt * k[i]);
    }

    // Semi-implicit (symplectic) Euler: advance velocities first, then positions
    // using the NEW velocities. Symplectic for separable systems, so it conserves
    // energy far better than explicit Euler.
    function semiImplicitEuler(f, s, dt) {
        const n = s.length / 2;
        const k = f(s);
        const out = s.slice();
        for (let i = n; i < 2 * n; i++) out[i] = s[i] + dt * k[i];
        for (let i = 0; i < n; i++) out[i] = s[i] + dt * out[i + n];
        return out;
    }

    // Velocity Verlet: position update uses current + half-step acceleration,
    // then velocities use the average of old and new acceleration.
    function velocityVerlet(f, s, dt) {
        const n = s.length / 2;
        const k0 = f(s);
        const a0 = k0.slice(n);
        const v0 = s.slice(n);
        const q1 = [];
        for (let i = 0; i < n; i++) {
            q1[i] = s[i] + dt * v0[i] + 0.5 * dt * dt * a0[i];
        }
        const k1 = f(q1.concat(v0));
        const a1 = k1.slice(n);
        const v1 = [];
        for (let i = 0; i < n; i++) {
            v1[i] = v0[i] + 0.5 * dt * (a0[i] + a1[i]);
        }
        return q1.concat(v1);
    }

    // Classic RK4: fourth order, high accuracy per step at 4x the cost.
    function rk4(f, s, dt) {
        const k1 = f(s);
        const s2 = s.map((v, i) => v + k1[i] * dt * 0.5);
        const k2 = f(s2);
        const s3 = s.map((v, i) => v + k2[i] * dt * 0.5);
        const k3 = f(s3);
        const s4 = s.map((v, i) => v + k3[i] * dt);
        const k4 = f(s4);
        return s.map((v, i) => v + (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) * (dt / 6));
    }

    var METHODS = {
        euler:  { id: 'euler',  label: 'Euler',               step: euler },
        semi:   { id: 'semi',   label: 'Semi-implicit Euler', step: semiImplicitEuler },
        verlet: { id: 'verlet', label: 'Verlet',              step: velocityVerlet },
        rk4:    { id: 'rk4',    label: 'RK4',                 step: rk4 }
    };

    return {
        euler: euler,
        semiImplicitEuler: semiImplicitEuler,
        velocityVerlet: velocityVerlet,
        rk4: rk4,
        METHODS: METHODS,
        order: ['euler', 'semi', 'verlet', 'rk4']
    };
}));
