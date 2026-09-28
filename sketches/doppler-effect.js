// ===== DOPPLER EFFECT & MACH CONE =====
// Moving wave emitter showing wavefront compression, pitch shift, and supersonic shock cone
// Physics: f' = f₀ (c / (c ∓ vₛ)), Mach angle sin(μ) = c / vₛ

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'doppler-effect',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            sourceVelocity: { value: 180, min: 0, max: 400, step: 10, label: 'Source Speed (vₛ)', unit: 'm/s' },
            waveSpeed: { value: 240, min: 150, max: 320, step: 10, label: 'Wave Speed (c)', unit: 'm/s' },
            emissionFrequency: { value: 2.0, min: 1.0, max: 4.0, step: 0.2, label: 'Base Frequency (f₀)', unit: 'Hz' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Mach Number (M)': '0.00',
                'Ahead Pitch (f′)': '0.0 Hz',
                'Behind Pitch (f′)': '0.0 Hz',
                'Shock Cone Angle': 'N/A'
            };
        },
        setup(p, ctx) {
            let source = { x: 0, y: 0 };
            let wavefronts = [];
            let lastEmitTime = 0;
            let observer = { x: 0, y: 0 };

            function resetSim() {
                source.x = p.width * 0.1;
                source.y = p.height * 0.5;
                observer.x = p.width * 0.75;
                observer.y = p.height * 0.5 - 60;
                wavefronts = [];
            }

            resetSim();
            ctx.onReset = resetSim;
            ctx.onResize = resetSim;

            p.draw = function() {
                p.background(7, 9, 15);

                const w = p.width;
                const h = p.height;
                const dt = (1 / 60) * ctx.speed;
                const vs = ctx.params.sourceVelocity;
                const c = ctx.params.waveSpeed;
                const f0 = ctx.params.emissionFrequency;
                const period = 1 / f0;

                // 1. Move source
                if (ctx.isPlaying) {
                    source.x += vs * dt;
                    if (source.x > w + 60) {
                        source.x = -40;
                    }

                    // Emit periodic wavefronts
                    lastEmitTime += dt;
                    if (lastEmitTime >= period) {
                        lastEmitTime = 0;
                        wavefronts.push({
                            x: source.x,
                            y: source.y,
                            radius: 0
                        });
                    }

                    // Expand active wavefronts
                    for (let i = wavefronts.length - 1; i >= 0; i--) {
                        const wf = wavefronts[i];
                        wf.radius += c * dt;

                        // Memory clamp: drop wavefronts larger than diagonal
                        if (wf.radius > Math.hypot(w, h)) {
                            wavefronts.splice(i, 1);
                        }
                    }
                }

                // 2. Render expanding wavefronts
                p.noFill();
                p.strokeWeight(1.5);
                for (let i = 0; i < wavefronts.length; i++) {
                    const wf = wavefronts[i];
                    // Fade out older wavefronts
                    const alpha = Math.max(30, Math.floor(220 - (wf.radius / w) * 180));
                    p.stroke(45, 212, 191, alpha); // Teal wave rings
                    p.circle(wf.x, wf.y, wf.radius * 2);
                }

                // 3. Render Mach Shock Cone if supersonic (vs > c)
                const mach = vs / c;
                if (mach > 1.0) {
                    const mu = Math.asin(1 / mach); // Mach angle
                    const coneLen = 350;
                    p.stroke('#f87171'); // Red shock front
                    p.strokeWeight(2.5);

                    const xBack = source.x - coneLen * Math.cos(mu);
                    const yTop = source.y - coneLen * Math.sin(mu);
                    const yBot = source.y + coneLen * Math.sin(mu);

                    p.line(source.x, source.y, xBack, yTop);
                    p.line(source.x, source.y, xBack, yBot);

                    p.fill('rgba(248, 113, 113, 0.08)');
                    p.triangle(source.x, source.y, xBack, yTop, xBack, yBot);
                }

                // 4. Render Moving Emitter
                p.fill('#e8a04c'); // Warm amber
                p.noStroke();
                p.circle(source.x, source.y, 18);
                p.stroke('#ffffff');
                p.strokeWeight(2);
                p.noFill();
                p.circle(source.x, source.y, 24);

                // Velocity vector arrow on source
                if (vs > 5) {
                    const arrowLen = Math.min(50, vs * 0.18);
                    p.stroke('#f1f5f9');
                    p.strokeWeight(2);
                    p.line(source.x, source.y, source.x + arrowLen, source.y);
                }

                // 5. Render Observer Probe (draggable)
                p.fill('#7c6af7'); // Indigo violet
                p.noStroke();
                p.circle(observer.x, observer.y, 16);
                p.fill('#ffffff');
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(10);
                p.text('👂', observer.x, observer.y);

                // Telemetry calculations
                let fAhead = '∞ (Boom!)';
                if (vs < c) {
                    fAhead = `${(f0 * (c / (c - vs))).toFixed(1)} Hz`;
                } else if (vs === c) {
                    fAhead = 'Shock Barrier';
                }
                const fBehind = `${(f0 * (c / (c + vs))).toFixed(1)} Hz`;
                const shockAngle = mach > 1.0 ? `${((Math.asin(1 / mach) * 180) / Math.PI).toFixed(1)}°` : 'Subsonic (< M1)';

                ctx._telemetry = {
                    'Mach Number (M)': `${mach.toFixed(2)}`,
                    'Ahead Pitch (f′)': fAhead,
                    'Behind Pitch (f′)': fBehind,
                    'Shock Cone Angle': shockAngle
                };
                ctx.updateTelemetry();

                // Legend
                p.fill('#94a3b8');
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Amber = Moving Sound Source • Drag the 👂 listener to test position • M > 1.0 produces Mach Cone', 16, h - 14);
            };

            function getPointerPos() {
                if (p.touches && p.touches.length > 0) return { x: p.touches[0].x, y: p.touches[0].y };
                return { x: p.mouseX, y: p.mouseY };
            }

            let draggingObserver = false;
            p.mousePressed = function() {
                const pos = getPointerPos();
                if (Math.hypot(pos.x - observer.x, pos.y - observer.y) < 30) {
                    draggingObserver = true;
                    return false;
                }
            };

            p.mouseDragged = function() {
                if (draggingObserver) {
                    const pos = getPointerPos();
                    observer.x = p.constrain(pos.x, 20, p.width - 20);
                    observer.y = p.constrain(pos.y, 20, p.height - 20);
                    return false;
                }
            };

            p.mouseReleased = function() {
                draggingObserver = false;
            };
        }
    });

    sim.mount();
    return sim;
};
