// ===== BLACK HOLE ORBIT =====
// Circular Kepler orbits around a central mass. Periods map to oscillator pitch
// so 2:1 / 3:2 resonances are audible, not just drawn.
//
// Sound: each orbit is a sine at f = 110 × (T_ref / T). Inner orbits tick higher.
// When two periods lock to a small-integer ratio (within 2%), a short click
// marks the resonance. This is the same idea as Laplace resonances in moons —
// simplified to circular coplanar orbits, no GR, no disk.

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'black-hole-orbit',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            centralMass: { value: 120, min: 40, max: 280, step: 10, label: 'Central mass (M)', unit: 'sim' },
            speed: { value: 1, min: 0.25, max: 3, step: 0.25, label: 'Time scale', unit: '×' },
            showVectors: { value: 1, min: 0, max: 1, step: 1, label: 'Show Vectors', unit: '' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Bodies': '4',
                'Resonance': 'none',
                'Inner period': '—',
                'Orbital Energy': '0.0'
            };
        },
        setup(p, ctx) {
            const G = 1.15;
            const Integrators = window.VisiqIntegrators;
            let bodies = [];
            let oscs = [];
            let lastResonance = 'none';
            let trailCap = 110;
            let energyHistory = [];   // relative energy drift in %, since baseEnergy
            let baseEnergy = null;
            let draggedBody = null;
            // Integrator state: shared widget from assets/integrators.js
            let currentIntegrator = 'rk4';
            let activeStep = Integrators ? Integrators.METHODS.rk4.step : null;
            // Fixed-timestep accumulator. H = 1 sim-second; at 60 fps and
            // time scale 1, one step per frame — same visual speed as the old
            // analytic theta += omega*dt*60 update.
            const STEP_H = 1;
            const MAX_STEPS_PER_FRAME = 8;
            let stepAccum = 0;
            const dragTracker = VisualKit.createDragTracker({ maxSpeed: 20 });

            function period(r, M) {
                return 2 * Math.PI * Math.sqrt((r * r * r) / (G * M));
            }

            // Advance one body's state [x, y, vx, vy] by h seconds of sim time.
            function stepBody(b, h) {
                if (!activeStep) return;
                const mu = G * ctx.params.centralMass;
                b.s = activeStep(Integrators.centralForce(mu), b.s, h);
            }

            // Circular orbit velocity at radius r, tangent to the circle.
            function circularVelocity(x, y, mu) {
                const r = Math.max(10, Math.hypot(x, y));
                const v = Math.sqrt(mu / r);
                return [-y / r * v, x / r * v];
            }

            function spawnBodies() {
                const M = ctx.params.centralMass;
                const mu = G * M;
                const radii = [70, 110, 165, 220];
                const hues = [
                    [251, 191, 36],   // amber (astronomy accent)
                    [56, 189, 248],   // sky blue
                    [45, 212, 191],   // teal
                    [167, 139, 250]   // violet
                ];
                bodies = radii.map((r, i) => {
                    const theta = i * 0.85;
                    const x = r * Math.cos(theta);
                    const y = r * Math.sin(theta);
                    const [vx, vy] = circularVelocity(x, y, mu);
                    return {
                        id: i + 1,
                        r,
                        radius: 7 + i * 0.8,
                        mass: 1.0 + i * 0.5,
                        s: [x, y, vx, vy],
                        color: hues[i % hues.length],
                        trail: [],
                        T: period(r, M),
                    };
                });
                energyHistory = [];
                baseEnergy = null;
                stepAccum = 0;
            }

            // Total orbital energy of all bodies (uses real state, not a formula).
            function totalOrbitalEnergy() {
                const mu = G * ctx.params.centralMass;
                let E = 0;
                for (const b of bodies) {
                    E += b.mass * Integrators.specificOrbitalEnergy(b.s, mu);
                }
                return E;
            }

            function stopSound() {
                oscs.forEach(n => {
                    try { n.osc.stop(); n.gain.disconnect(); } catch (e) {}
                });
                oscs = [];
            }

            function startSound() {
                stopSound();
                if (!window.VisiqAudio || VisiqAudio.muted) return;
                const ctxA = VisiqAudio.getContext();
                if (!ctxA) return;
                const Tref = bodies[bodies.length - 1].T;
                oscs = bodies.map(b => {
                    const f = 110 * (Tref / b.T);
                    return VisiqAudio.createPitchNode(Math.min(880, f), 'sine', 0.035);
                }).filter(Boolean);
            }

            function nearestResonance(ratios) {
                const targets = [[2,1],[3,2],[4,3],[3,1],[5,2]];
                let best = null;
                for (let i = 0; i < ratios.length; i++) {
                    for (let j = i + 1; j < ratios.length; j++) {
                        const q = ratios[i] / ratios[j];
                        for (const [a, b] of targets) {
                            const target = a / b;
                            const err = Math.abs(q - target) / target;
                            if (err < 0.02 && (!best || err < best.err)) {
                                best = { err, label: `${i + 1}:${j + 1} ≈ ${a}:${b}` };
                            }
                        }
                    }
                }
                return best;
            }

            spawnBodies();

            ctx.onReset = () => { spawnBodies(); stopSound(); startSound(); };
            ctx.onResize = spawnBodies;
            ctx.onDestroy = stopSound;
            ctx.onParamChange = (key) => {
                if (key === 'centralMass') {
                    spawnBodies();
                    stopSound();
                    startSound();
                }
            };

            const controls = document.getElementById(ctx.controlsContainerId);
            if (window.VisiqAudio && controls) {
                VisiqAudio.requestGate();
                VisiqAudio.attachMuteToggle(controls,
                    'Pitch is orbital period inverted: faster (inner) orbits sound higher. A lock between two periods (2:1, 3:2) is a real resonance.');
                const enableBtn = document.createElement('button');
                enableBtn.type = 'button';
                enableBtn.className = 'visiq-mute-btn';
                enableBtn.textContent = 'Start orbit tones';
                enableBtn.style.cssText = 'margin-top:8px;display:block;width:100%;padding:8px;cursor:pointer;';
                enableBtn.addEventListener('click', async () => {
                    await VisiqAudio.ensureContext();
                    startSound();
                });
                controls.appendChild(enableBtn);
            }

            // Integrator switch + drift notes (shared widget, no copied code)
            if (controls && Integrators && Integrators.mountIntegratorSwitch) {
                Integrators.mountIntegratorSwitch({
                    container: controls,
                    current: currentIntegrator,
                    notes: {
                        euler: 'Euler adds energy every step, so orbits spiral outward instead of closing.',
                        semi: 'Semi-implicit Euler updates velocity first, so it stays stable and barely drifts.',
                        verlet: 'Verlet averages old and new acceleration, so energy stays nearly flat over long runs.',
                        rk4: 'RK4 samples the slope four times per step, so it tracks the true orbit most faithfully.'
                    },
                    onChange: (id, step) => {
                        currentIntegrator = id;
                        activeStep = step;
                    }
                });
            }

            p.draw = function() {
                p.background(7, 9, 15);
                const cx = p.width / 2;
                const cy = p.height / 2;
                const M = ctx.params.centralMass;
                const showV = ctx.params.showVectors > 0.5;

                // Fixed-timestep physics: accumulate requested sim time, step
                // in whole STEP_H chunks (capped so a stall can't snowball).
                if (ctx.isPlaying && activeStep) {
                    const want = (p.deltaTime / 1000) * ctx.params.speed * ctx.speed * 60;
                    stepAccum += want;
                    let steps = Math.min(Math.floor(stepAccum / STEP_H), MAX_STEPS_PER_FRAME);
                    stepAccum -= steps * STEP_H;
                    if (stepAccum > STEP_H * MAX_STEPS_PER_FRAME) stepAccum = 0;
                    for (let k = 0; k < steps; k++) {
                        for (const b of bodies) {
                            if (b === draggedBody) continue;
                            stepBody(b, STEP_H);
                        }
                    }
                }

                // Orbit guide rails (at each body's current radius)
                p.noFill();
                p.stroke(24, 32, 48, 120);
                p.strokeWeight(1);
                bodies.forEach(b => p.circle(cx, cy, Math.hypot(b.s[0], b.s[1]) * 2));

                // Central Black Hole with accretion photon glow
                p.noStroke();
                p.fill(251, 191, 36, 25);
                p.circle(cx, cy, 54);
                p.fill(251, 191, 36, 60);
                p.circle(cx, cy, 38);
                p.fill(5, 7, 12);
                p.stroke(251, 191, 36, 200);
                p.strokeWeight(1.8);
                p.circle(cx, cy, 26);
                p.noStroke();
                p.fill(255, 255, 255, 45);
                p.circle(cx - 4, cy - 4, 6);

                const periods = [];
                let totalEnergy = 0;

                bodies.forEach((b) => {
                    const [bx, by, bvx, bvy] = b.s;
                    b.r = Math.max(10, Math.hypot(bx, by));
                    b.T = period(b.r, M);
                    periods.push(b.T);
                    const x = cx + bx;
                    const y = cy + by;
                    const speed = Math.hypot(bvx, bvy);

                    if (ctx.isPlaying) {
                        b.trail.push({ x, y });
                        if (b.trail.length > trailCap) b.trail.shift();
                    }

                    // Real orbital energy of this body's state
                    const mu = G * M;
                    totalEnergy += b.mass * Integrators.specificOrbitalEnergy(b.s, mu);

                    // 1. Fading trail
                    VisualKit.drawFadingTrail(p, b.trail, b.color, {
                        exponent: 1.6,
                        maxAlpha: 180,
                        minWeight: 1.0,
                        maxWeight: 2.2
                    });

                    // 2. Glow body
                    VisualKit.drawGlowBody(p, x, y, b.radius, b.color, {
                        outerMult: 1.7,
                        innerMult: 1.25,
                        outerAlpha: 32,
                        innerAlpha: 75,
                        specularAlpha: 55
                    });

                    // 3. Force and Velocity vectors
                    if (showV) {
                        const vMag = Math.min(speed * 0.4, 38);
                        const vLen = speed > 1e-6 ? speed : 1;
                        // Velocity (white), along the actual velocity vector
                        VisualKit.drawArrow(p, x, y,
                            x + (bvx / vLen) * vMag,
                            y + (bvy / vLen) * vMag,
                            [241, 245, 249], 210, 1.8, 6);

                        // Centripetal gravitational pull (sky blue), toward center
                        const fMag = Math.min((G * M / (b.r * b.r)) * 140, 42);
                        VisualKit.drawArrow(p, x, y,
                            x - (bx / b.r) * fMag,
                            y - (by / b.r) * fMag,
                            [56, 189, 248], 190, 1.5, 6);
                    }
                });

                if (ctx.isPlaying) {
                    if (baseEnergy === null) baseEnergy = totalEnergy;
                    const drift = Math.abs(totalEnergy) > 1e-9
                        ? ((totalEnergy - baseEnergy) / Math.abs(baseEnergy)) * 100
                        : 0;
                    energyHistory.push(drift);
                    if (energyHistory.length > 180) energyHistory.shift();
                }

                // Inset Panel: energy drift since start (%), zero line = baseline
                if (p.width > 480) {
                    VisualKit.drawSparkline(p, p.width - 188, 12, 180, 60, energyHistory, [251, 191, 36], {
                        label: `Energy drift % (${currentIntegrator})`,
                        baseline: 0,
                        cornerRadius: 6
                    });
                }

                if (oscs.length && window.VisiqAudio && VisiqAudio.context && !VisiqAudio.muted) {
                    const Tref = periods[periods.length - 1];
                    const now = VisiqAudio.context.currentTime;
                    oscs.forEach((n, i) => {
                        const f = Math.min(880, 110 * (Tref / periods[i]));
                        n.osc.frequency.setTargetAtTime(f, now, 0.05);
                    });
                }

                const res = nearestResonance(periods);
                lastResonance = res ? res.label : 'none';

                ctx._telemetry = {
                    'Inner period': `${periods[0].toFixed(2)} s (sim)`,
                    'Outer period': `${periods[periods.length - 1].toFixed(2)} s (sim)`,
                    'Resonance': lastResonance,
                    'Orbital Energy': `${totalEnergy.toFixed(1)} J`,
                    'Mass M': `${M}`
                };
                ctx.updateTelemetry();

                // Standard legend & interaction caption
                p.noStroke();
                p.fill(65, 85, 120);
                p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text('White = velocity  |  Blue = gravity (GM/r²)  |  Drag bobs to fling into new orbits', 14, p.height - 10);
            };

            function ptr() {
                return p.touches && p.touches.length > 0
                    ? { x: p.touches[0].x, y: p.touches[0].y }
                    : { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos = ptr();
                const cx = p.width / 2;
                const cy = p.height / 2;
                for (let i = bodies.length - 1; i >= 0; i--) {
                    const b = bodies[i];
                    const bx = cx + b.s[0];
                    const by = cy + b.s[1];
                    if (Math.hypot(pos.x - bx, pos.y - by) <= b.radius + 14) {
                        draggedBody = b;
                        dragTracker.startAngle(Math.atan2(b.s[1], b.s[0]));
                        return false;
                    }
                }
            };

            p.mouseDragged = function() {
                if (!draggedBody) return;
                const pos = ptr();
                const cx = p.width / 2;
                const cy = p.height / 2;
                const newR = p.constrain(Math.hypot(pos.x - cx, pos.y - cy), 45, Math.min(p.width, p.height) * 0.46);
                const newTheta = Math.atan2(pos.y - cy, pos.x - cx);
                dragTracker.dragAngle(newTheta);
                // Held body follows the cursor on a circular orbit at the new radius
                const nx = newR * Math.cos(newTheta);
                const ny = newR * Math.sin(newTheta);
                const [vx, vy] = circularVelocity(nx, ny, G * ctx.params.centralMass);
                draggedBody.s = [nx, ny, vx, vy];
                draggedBody.r = newR;
                draggedBody.trail = [];
                return false;
            };

            p.mouseReleased = function() {
                if (!draggedBody) return;
                const dOmega = dragTracker.releaseAngle(1.5, 4);
                // Fling: nudge position along the orbit, matching the old
                // theta += dOmega * 0.1 behaviour, and re-circularize velocity.
                const a = dOmega * 0.1;
                const [ox, oy] = draggedBody.s;
                const c = Math.cos(a), sn = Math.sin(a);
                const nx = ox * c - oy * sn;
                const ny = ox * sn + oy * c;
                const [vx, vy] = circularVelocity(nx, ny, G * ctx.params.centralMass);
                draggedBody.s = [nx, ny, vx, vy];
                draggedBody = null;
                // The fling changed the energy on purpose; re-base the drift graph
                baseEnergy = null;
                energyHistory = [];
            };

            p.touchStarted = p.mousePressed;
            p.touchMoved   = p.mouseDragged;
            p.touchEnded   = p.mouseReleased;
        }
    });

    sim.mount();
    return sim;
};
