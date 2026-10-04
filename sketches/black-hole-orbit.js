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
            let bodies = [];
            let oscs = [];
            let lastResonance = 'none';
            let trailCap = 110;
            let energyHistory = [];
            let draggedBody = null;
            const dragTracker = VisualKit.createDragTracker({ maxSpeed: 20 });

            function period(r, M) {
                return 2 * Math.PI * Math.sqrt((r * r * r) / (G * M));
            }

            function spawnBodies() {
                const M = ctx.params.centralMass;
                const radii = [70, 110, 165, 220];
                const hues = [
                    [251, 191, 36],   // amber (astronomy accent)
                    [56, 189, 248],   // sky blue
                    [45, 212, 191],   // teal
                    [167, 139, 250]   // violet
                ];
                bodies = radii.map((r, i) => ({
                    id: i + 1,
                    r,
                    radius: 7 + i * 0.8,
                    mass: 1.0 + i * 0.5,
                    theta: i * 0.85,
                    color: hues[i % hues.length],
                    trail: [],
                    T: period(r, M),
                }));
                energyHistory = [];
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

            p.draw = function() {
                p.background(7, 9, 15);
                const cx = p.width / 2;
                const cy = p.height / 2;
                const M = ctx.params.centralMass;
                const dt = (p.deltaTime / 1000) * ctx.params.speed * ctx.speed;
                const showV = ctx.params.showVectors > 0.5;

                // Orbit guide rails
                p.noFill();
                p.stroke(24, 32, 48, 120);
                p.strokeWeight(1);
                bodies.forEach(b => p.circle(cx, cy, b.r * 2));

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
                    b.T = period(b.r, M);
                    periods.push(b.T);
                    const omega = Math.sqrt(G * M / Math.max(1, b.r * b.r * b.r));
                    if (ctx.isPlaying && b !== draggedBody) {
                        b.theta += omega * dt * 60;
                    }
                    const x = cx + Math.cos(b.theta) * b.r;
                    const y = cy + Math.sin(b.theta) * b.r;

                    if (ctx.isPlaying) {
                        b.trail.push({ x, y });
                        if (b.trail.length > trailCap) b.trail.shift();
                    }

                    // Orbital mechanical energy E = -G*M*m / (2*r)
                    const eOrb = - (G * M * b.mass) / (2 * Math.max(10, b.r));
                    totalEnergy += eOrb;

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
                        const vMag = Math.min(b.r * omega * 0.4, 38);
                        // Tangential velocity (white)
                        VisualKit.drawArrow(p, x, y,
                            x - Math.sin(b.theta) * vMag,
                            y + Math.cos(b.theta) * vMag,
                            [241, 245, 249], 210, 1.8, 6);

                        // Centripetal gravitational pull (sky blue)
                        const fMag = Math.min((G * M / (b.r * b.r)) * 140, 42);
                        VisualKit.drawArrow(p, x, y,
                            x - Math.cos(b.theta) * fMag,
                            y - Math.sin(b.theta) * fMag,
                            [56, 189, 248], 190, 1.5, 6);
                    }
                });

                if (ctx.isPlaying) {
                    energyHistory.push(totalEnergy);
                    if (energyHistory.length > 180) energyHistory.shift();
                }

                // Inset Panel: Orbital Energy Sparkline
                if (p.width > 480) {
                    VisualKit.drawSparkline(p, p.width - 188, 12, 180, 60, energyHistory, [251, 191, 36], {
                        label: 'Total Orbital Energy',
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
                    const bx = cx + Math.cos(b.theta) * b.r;
                    const by = cy + Math.sin(b.theta) * b.r;
                    if (Math.hypot(pos.x - bx, pos.y - by) <= b.radius + 14) {
                        draggedBody = b;
                        dragTracker.startAngle(b.theta);
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
                draggedBody.r = newR;
                const newTheta = Math.atan2(pos.y - cy, pos.x - cx);
                dragTracker.dragAngle(newTheta);
                draggedBody.theta = newTheta;
                draggedBody.trail = [];
                return false;
            };

            p.mouseReleased = function() {
                if (!draggedBody) return;
                const dOmega = dragTracker.releaseAngle(1.5, 4);
                draggedBody.theta += dOmega * 0.1;
                draggedBody = null;
            };

            p.touchStarted = p.mousePressed;
            p.touchMoved   = p.mouseDragged;
            p.touchEnded   = p.mouseReleased;
        }
    });

    sim.mount();
    return sim;
};
