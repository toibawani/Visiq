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

    // Shared DOM switch so sketches don't reimplement the buttons.
    // options: { container, current, order?, notes?, label?, onChange }
    // Returns { set(id) } for programmatic changes.
    function mountIntegratorSwitch(options) {
        if (typeof document === 'undefined' || !options || !options.container) return null;
        var order = options.order || ['euler', 'semi', 'verlet', 'rk4'];
        var current = options.current || 'rk4';
        var notes = options.notes || {};
        var onChange = options.onChange || function () {};

        var wrap = document.createElement('div');
        wrap.className = 'integrator-switch';
        wrap.style.cssText = 'margin-top:10px;';

        var lbl = document.createElement('div');
        lbl.textContent = options.label || 'Integrator';
        lbl.style.cssText = 'font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase;opacity:0.65;margin-bottom:6px;';
        wrap.appendChild(lbl);

        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
        var buttons = {};
        order.forEach(function (id) {
            if (!METHODS[id]) return;
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = METHODS[id].label;
            b.setAttribute('aria-pressed', id === current ? 'true' : 'false');
            b.style.cssText = 'flex:1 1 auto;padding:6px 8px;cursor:pointer;font-size:0.72rem;border-radius:6px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);color:inherit;';
            b.addEventListener('click', function () { api.set(id); });
            buttons[id] = b;
            row.appendChild(b);
        });
        wrap.appendChild(row);

        var noteEl = document.createElement('div');
        noteEl.textContent = notes[current] || '';
        noteEl.style.cssText = 'font-size:0.72rem;opacity:0.7;margin-top:6px;line-height:1.45;';
        wrap.appendChild(noteEl);
        options.container.appendChild(wrap);

        var api = {
            set: function (id) {
                if (!METHODS[id]) return;
                current = id;
                noteEl.textContent = notes[id] || '';
                Object.keys(buttons).forEach(function (k) {
                    var active = k === id;
                    buttons[k].setAttribute('aria-pressed', active ? 'true' : 'false');
                    buttons[k].style.background = active ? 'rgba(45,212,191,0.25)' : 'rgba(255,255,255,0.05)';
                });
                onChange(id, METHODS[id].step);
            },
            get current() { return current; }
        };
        return api;
    }

    // Derivative for a two-body central force with parameter mu = G*M.
    // State layout [x, y, vx, vy] (positions first, velocities second), so all
    // integrators above apply directly. a = -mu * pos / |pos|^3.
    function centralForce(mu) {
        return function (s) {
            var r = Math.sqrt(s[0] * s[0] + s[1] * s[1]) || 1e-6;
            var k = -mu / (r * r * r);
            return [s[2], s[3], k * s[0], k * s[1]];
        };
    }

    // Specific orbital energy (energy per unit mass): E = v^2/2 - mu/r.
    // Negative for bound orbits; constant only if the integrator conserves it.
    function specificOrbitalEnergy(s, mu) {
        var r = Math.sqrt(s[0] * s[0] + s[1] * s[1]) || 1e-6;
        return 0.5 * (s[2] * s[2] + s[3] * s[3]) - mu / r;
    }

    return {
        euler: euler,
        semiImplicitEuler: semiImplicitEuler,
        velocityVerlet: velocityVerlet,
        rk4: rk4,
        METHODS: METHODS,
        order: ['euler', 'semi', 'verlet', 'rk4'],
        mountIntegratorSwitch: mountIntegratorSwitch,
        centralForce: centralForce,
        specificOrbitalEnergy: specificOrbitalEnergy
    };
}));
