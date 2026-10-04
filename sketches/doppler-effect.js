// ===== DOPPLER EFFECT & MACH CONE =====
// Moving wave emitter showing wavefront compression, pitch shift, and supersonic shock cone
// Physics: f' = f₀ (c / (c ∓ vₛ)), Mach angle sin(μ) = c / vₛ

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'doppler-effect',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            sourceVelocity:    { value: 180, min: 0,   max: 400, step: 10,  label: 'Source Speed (vₛ)',    unit: 'm/s' },
            waveSpeed:         { value: 240, min: 150, max: 320, step: 10,  label: 'Wave Speed (c)',        unit: 'm/s' },
            emissionFrequency: { value: 2.0, min: 1.0, max: 4.0, step: 0.2, label: 'Base Frequency (f₀)',  unit: 'Hz'  }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Mach Number (M)':    '0.00',
                'Ahead Pitch (f′)':   '0.0 Hz',
                'Behind Pitch (f′)':  '0.0 Hz',
                'Shock Cone Angle':   'N/A'
            };
        },

        setup(p, ctx) {
            // ── Color palette ──────────────────────────────────────────
            const PHYS   = VisualKit.getCategoryRGB('physics');  // cyan rings
            const AMBER  = [232, 160, 76];   // source body
            const VIOLET = [124, 106, 247];  // observer
            const RED    = [248, 113, 113];  // shock cone

            // ── State ──────────────────────────────────────────────────
            let source      = { x: 0, y: 0 };
            let wavefronts  = [];   // { x, y, radius, age }
            let lastEmitTime = 0;
            let observer    = { x: 0, y: 0 };
            let drag        = VisualKit.createDragTracker();
            let draggingObs = false;
            // Trail of past source positions for motion blur
            let sourceTrail = [];
            const TRAIL_CAP = 14;
            // Mach-number sparkline
            let machHistory = [];

            function resetSim() {
                source.x     = p.width  * 0.1;
                source.y     = p.height * 0.5;
                observer.x   = p.width  * 0.75;
                observer.y   = p.height * 0.5 - 60;
                wavefronts   = [];
                sourceTrail  = [];
                machHistory  = [];
                lastEmitTime = 0;
            }

            resetSim();
            ctx.onReset  = resetSim;
            ctx.onResize = resetSim;

            p.draw = function() {
                p.background(7, 9, 15);

                const w   = p.width;
                const h   = p.height;
                const dt  = (1 / 60) * ctx.speed;
                const vs  = ctx.params.sourceVelocity;
                const c   = ctx.params.waveSpeed;
                const f0  = ctx.params.emissionFrequency;
                const period = 1 / f0;
                const mach   = vs / c;

                // ─────────────────────────────────────────────────────
                // 1. Physics
                // ─────────────────────────────────────────────────────
                if (ctx.isPlaying) {
                    source.x += vs * dt;
                    sourceTrail.push({ x: source.x, y: source.y });
                    if (sourceTrail.length > TRAIL_CAP) sourceTrail.shift();

                    if (source.x > w + 60) {
                        source.x = -40;
                        wavefronts = [];
                        sourceTrail = [];
                    }

                    lastEmitTime += dt;
                    if (lastEmitTime >= period) {
                        lastEmitTime = 0;
                        wavefronts.push({ x: source.x, y: source.y, radius: 0, age: 0 });
                    }

                    for (let i = wavefronts.length - 1; i >= 0; i--) {
                        const wf = wavefronts[i];
                        wf.radius += c * dt;
                        wf.age++;
                        if (wf.radius > Math.hypot(w, h)) wavefronts.splice(i, 1);
                    }
                }

                // ─────────────────────────────────────────────────────
                // 2. Wavefronts (fading rings)
                // ─────────────────────────────────────────────────────
                p.push();
                p.noFill();
                for (const wf of wavefronts) {
                    const ageFrac = wf.radius / Math.max(w, h);
                    const alpha   = Math.max(18, 200 * Math.pow(1 - ageFrac, 1.6));
                    const weight  = Math.max(0.8, 1.8 * (1 - ageFrac));
                    p.stroke(PHYS[0], PHYS[1], PHYS[2], alpha);
                    p.strokeWeight(weight);
                    p.circle(wf.x, wf.y, wf.radius * 2);
                }
                p.pop();

                // ─────────────────────────────────────────────────────
                // 3. Mach shock cone (if supersonic)
                // ─────────────────────────────────────────────────────
                if (mach > 1.0) {
                    const mu       = Math.asin(1 / mach);
                    const coneLen  = Math.min(500, w * 0.7);

                    // Filled triangle (very faint)
                    p.push();
                    p.noStroke();
                    p.fill(RED[0], RED[1], RED[2], 14);
                    const xBack = source.x - coneLen * Math.cos(mu);
                    const yTop  = source.y - coneLen * Math.sin(mu);
                    const yBot  = source.y + coneLen * Math.sin(mu);
                    p.triangle(source.x, source.y, xBack, yTop, xBack, yBot);
                    p.pop();

                    // Shock lines with glow
                    p.push();
                    p.noFill();
                    p.stroke(RED[0], RED[1], RED[2], 50);
                    p.strokeWeight(8);
                    p.line(source.x, source.y, xBack, yTop);
                    p.line(source.x, source.y, xBack, yBot);
                    p.stroke(RED[0], RED[1], RED[2], 200);
                    p.strokeWeight(2);
                    p.line(source.x, source.y, xBack, yTop);
                    p.line(source.x, source.y, xBack, yBot);
                    p.pop();

                    // Mach angle label
                    p.push();
                    p.noStroke();
                    p.fill(RED[0], RED[1], RED[2], 180);
                    p.textSize(10.5);
                    p.textAlign(p.LEFT, p.CENTER);
                    p.text(`μ = ${((mu * 180) / Math.PI).toFixed(1)}°`, xBack - 50, source.y - 18);
                    p.pop();
                }

                // ─────────────────────────────────────────────────────
                // 4. Source trail
                // ─────────────────────────────────────────────────────
                if (sourceTrail.length >= 2) {
                    VisualKit.drawFadingTrail(p, sourceTrail, AMBER, {
                        exponent: 2.0, maxAlpha: 90,
                        minWeight: 1.5, maxWeight: 6
                    });
                }

                // ─────────────────────────────────────────────────────
                // 5. Velocity arrow on source
                // ─────────────────────────────────────────────────────
                if (vs > 5) {
                    const arrowLen = Math.min(55, vs * 0.18);
                    VisualKit.drawArrow(
                        p,
                        source.x, source.y,
                        source.x + arrowLen, source.y,
                        [240, 240, 255], 190, 2, 8
                    );
                }

                // ─────────────────────────────────────────────────────
                // 6. Source glow body
                // ─────────────────────────────────────────────────────
                VisualKit.drawGlowBody(p, source.x, source.y, 10, AMBER, {
                    outerMult:  3.0, innerMult:  1.8,
                    outerAlpha: 45,  innerAlpha: 100,
                    strokeWidth: 2,  specular: true
                });

                // ─────────────────────────────────────────────────────
                // 7. Observer probe (draggable)
                // ─────────────────────────────────────────────────────
                VisualKit.drawGlowBody(p, observer.x, observer.y, 10, VIOLET, {
                    outerMult:  2.8, innerMult:  1.6,
                    outerAlpha: 40,  innerAlpha: 85,
                    strokeWidth: 2, specular: false
                });
                p.push();
                p.noStroke();
                p.fill(255, 255, 255, 220);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(12);
                p.text('👂', observer.x, observer.y + 1);
                p.pop();

                // Dashed line from source to observer
                p.push();
                if (p.drawingContext?.setLineDash) p.drawingContext.setLineDash([4, 6]);
                p.stroke(255, 255, 255, 18);
                p.strokeWeight(1);
                p.line(source.x, source.y, observer.x, observer.y);
                if (p.drawingContext?.setLineDash) p.drawingContext.setLineDash([]);
                p.pop();

                // ─────────────────────────────────────────────────────
                // 8. Mach sparkline inset (top-right)
                // ─────────────────────────────────────────────────────
                machHistory.push(mach);
                if (machHistory.length > 80) machHistory.shift();

                const spkW = 150;
                const spkH = 50;
                const spkX = w - spkW - 14;
                const spkY = 14;
                if (machHistory.length >= 2) {
                    VisualKit.drawSparkline(
                        p, spkX, spkY, spkW, spkH,
                        machHistory,
                        mach > 1 ? RED : PHYS,
                        { label: 'Mach Number M', zeroFloor: true, cornerRadius: 7, textSize: 8.5,
                          baseline: 1.0 }
                    );
                }

                // ─────────────────────────────────────────────────────
                // 9. Telemetry
                // ─────────────────────────────────────────────────────
                let fAhead = '∞ (Boom!)';
                if (vs < c)       fAhead = `${(f0 * (c / (c - vs))).toFixed(1)} Hz`;
                else if (vs === c) fAhead = 'Shock Barrier';
                const fBehind    = `${(f0 * (c / (c + vs))).toFixed(1)} Hz`;
                const shockAngle = mach > 1.0
                    ? `${((Math.asin(1 / mach) * 180) / Math.PI).toFixed(1)}°`
                    : 'Subsonic (< M1)';

                ctx._telemetry = {
                    'Mach Number (M)':   `${mach.toFixed(2)}`,
                    'Ahead Pitch (f′)':  fAhead,
                    'Behind Pitch (f′)': fBehind,
                    'Shock Cone Angle':  shockAngle
                };
                ctx.updateTelemetry();

                // ─────────────────────────────────────────────────────
                // 10. Footer hint
                // ─────────────────────────────────────────────────────
                p.push();
                p.noStroke();
                p.fill(70, 90, 120);
                p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text('Amber = Moving Sound Source  ·  Drag the 👂 listener  ·  M > 1.0 produces Mach Cone', 16, h - 10);
                p.pop();
            };

            // ── Pointer handling ───────────────────────────────────────
            function getPointerPos() {
                if (p.touches && p.touches.length > 0) return { x: p.touches[0].x, y: p.touches[0].y };
                return { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos = getPointerPos();
                if (Math.hypot(pos.x - observer.x, pos.y - observer.y) < 30) {
                    draggingObs = true;
                    drag.start(pos.x, pos.y);
                    return false;
                }
            };

            p.mouseDragged = function() {
                if (draggingObs) {
                    const pos = getPointerPos();
                    observer.x = p.constrain(pos.x, 20, p.width  - 20);
                    observer.y = p.constrain(pos.y, 20, p.height - 20);
                    drag.drag(pos.x, pos.y);
                    return false;
                }
            };

            p.mouseReleased = function() { draggingObs = false; };
            p.touchStarted  = p.mousePressed;
            p.touchMoved    = p.mouseDragged;
            p.touchEnded    = p.mouseReleased;
        }
    });

    sim.mount();
    return sim;
};
