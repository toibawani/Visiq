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
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Bodies': '4',
                'Resonance': 'none',
                'Inner period': '—',
            };
        },
        setup(p, ctx) {
            const G = 1.15;
            let bodies = [];
            let oscs = [];
            let lastResonance = 'none';
            let trailCap = 90;

            function period(r, M) {
                return 2 * Math.PI * Math.sqrt((r * r * r) / (G * M));
            }

            function spawnBodies() {
                const M = ctx.params.centralMass;
                const radii = [70, 110, 165, 220];
                const hues = [[255,107,107],[78,205,196],[255,230,109],[124,106,247]];
                bodies = radii.map((r, i) => ({
                    r,
                    theta: i * 0.7,
                    color: hues[i],
                    trail: [],
                    T: period(r, M),
                }));
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
                    'Pitch is orbital period inverted: faster (inner) orbits sound higher. A lock between two periods (2:1, 3:2) is a real resonance — you hear it as the tones lining up, not as a special effect sample.');
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

                p.noFill();
                p.stroke(40, 40, 48);
                p.strokeWeight(1);
                bodies.forEach(b => p.circle(cx, cy, b.r * 2));

                p.noStroke();
                p.fill(0);
                p.circle(cx, cy, 22);
                p.noFill();
                p.stroke(80);
                p.circle(cx, cy, 34);

                const periods = [];
                bodies.forEach((b, i) => {
                    b.T = period(b.r, M);
                    periods.push(b.T);
                    const omega = Math.sqrt(G * M / (b.r * b.r * b.r));
                    b.theta += omega * dt * 60;
                    const x = cx + Math.cos(b.theta) * b.r;
                    const y = cy + Math.sin(b.theta) * b.r;
                    b.trail.push({ x, y });
                    if (b.trail.length > trailCap) b.trail.shift();

                    p.noFill();
                    p.stroke(b.color[0], b.color[1], b.color[2], 90);
                    p.strokeWeight(1);
                    p.beginShape();
                    b.trail.forEach(pt => p.vertex(pt.x, pt.y));
                    p.endShape();

                    p.noStroke();
                    p.fill(b.color[0], b.color[1], b.color[2]);
                    p.circle(x, y, 8);
                });

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
                    'Mass M': `${M}`,
                };
                ctx.updateTelemetry();

                p.fill(148, 163, 184, 180);
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Circular Kepler orbits (not GR). Sound maps period → pitch.', 16, p.height - 14);
            };
        }
    });

    sim.mount();
    return sim;
};
