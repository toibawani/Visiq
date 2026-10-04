// ===== NEURON ACTION POTENTIAL =====
// Hodgkin-Huxley all-or-nothing electrical spike and saltatory conduction along axon
// Biology: Resting (-70mV) → Depolarization (Na⁺ influx) → Repolarization (K⁺ efflux) → Refractory

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'neuron-firing',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            stimulusCurrent: { value: 15,  min: 2,   max: 35,  step: 1,  label: 'Stimulus Injection', unit: 'μA' },
            myelination:     { value: 1,   min: 0,   max: 1,   step: 1,  label: 'Myelin Sheaths',     unit: 'toggle' },
            axonLength:      { value: 380, min: 250, max: 500, step: 20, label: 'Axon Length',         unit: 'μm' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Membrane Voltage': '-70.0 mV',
                'Firing Status':    'Resting',
                'Axon Spike Pos':   'Soma',
                'Conduction Speed': '0 m/s'
            };
        },

        setup(p, ctx) {
            // ── Color palette ──────────────────────────────────────────
            const BIO    = VisualKit.getCategoryRGB('biology');   // teal – dendrites / terminals
            const VIOLET = [124, 106, 247];  // soma
            const AMBER  = [232, 160,  76];  // action-potential pulse
            const SLATE  = [100, 116, 139];  // axon trunk

            // ── State ──────────────────────────────────────────────────
            let Vm             = -70.0;
            let spikeX         = -1;
            let voltageHistory = [];
            let refractoryTimer = 0;
            // Short trail of past spike positions for motion blur effect
            let spikeTrail     = [];
            const TRAIL_CAP    = 12;
            // Collision flash on depolarization
            let flashes        = [];

            function resetNeuron() {
                Vm             = -70.0;
                spikeX         = -1;
                voltageHistory = [];
                refractoryTimer = 0;
                spikeTrail     = [];
                flashes        = [];
            }

            ctx.onReset  = resetNeuron;
            ctx.onResize = resetNeuron;

            function triggerSpike() {
                if (refractoryTimer > 0) return;
                const stim = ctx.params.stimulusCurrent;
                if (stim >= 12) {
                    spikeX = 0;
                    Vm     = 35.0;
                    refractoryTimer = 40;
                    spikeTrail = [];
                } else {
                    Vm = -70.0 + stim * 0.9;
                }
            }

            p.draw = function() {
                p.background(7, 9, 15);

                const w = p.width;
                const h = p.height;
                const axonY    = h * 0.40;
                const somaX    = 70;
                const dt       = ctx.speed;
                const isMyelinated  = ctx.params.myelination > 0.5;
                const speedMult     = isMyelinated ? 7.0 : 2.5;
                const axonEndX      = somaX + ctx.params.axonLength;

                // ─────────────────────────────────────────────────────
                // 1. Physics
                // ─────────────────────────────────────────────────────
                if (ctx.isPlaying) {
                    if (refractoryTimer > 0) refractoryTimer -= dt;

                    if (spikeX >= 0) {
                        spikeX += speedMult * dt;
                        spikeTrail.push({ x: somaX + spikeX, y: axonY });
                        if (spikeTrail.length > TRAIL_CAP) spikeTrail.shift();

                        if      (spikeX < 60)  Vm = 35.0;
                        else if (spikeX < 140) Vm = -85.0;
                        else                   Vm = -70.0;

                        if (spikeX > ctx.params.axonLength) {
                            // Flash at terminals on arrival
                            flashes.push(VisualKit.createCollisionFlash(axonEndX, axonY, 14, 30));
                            spikeX     = -1;
                            Vm         = -70.0;
                            spikeTrail = [];
                        }
                    } else if (refractoryTimer <= 0) {
                        Vm = Vm * 0.9 + (-70.0) * 0.1;
                    }

                    voltageHistory.push(Vm);
                    if (voltageHistory.length > 140) voltageHistory.shift();
                }

                // ─────────────────────────────────────────────────────
                // 2. Neuron Morphology
                // ─────────────────────────────────────────────────────

                // Axon trunk
                p.push();
                p.stroke(SLATE[0], SLATE[1], SLATE[2]);
                p.strokeWeight(6);
                p.line(somaX, axonY, axonEndX, axonY);
                p.pop();

                // Myelin sheaths (Schwann cells)
                if (isMyelinated) {
                    const sheathLen = 50;
                    const gapLen    = 12;
                    let curX = somaX + 35;
                    p.push();
                    p.strokeWeight(16);
                    p.strokeCap(p.ROUND);
                    while (curX + sheathLen < axonEndX) {
                        p.stroke(BIO[0], BIO[1], BIO[2], 140);
                        p.line(curX, axonY, curX + sheathLen, axonY);
                        // Node of Ranvier glow dot
                        VisualKit.drawGlowBody(p, curX + sheathLen + gapLen / 2, axonY, 3.5, BIO, {
                            outerMult: 2.8, innerMult: 1.6, outerAlpha: 25, innerAlpha: 60, strokeWidth: 1
                        });
                        curX += sheathLen + gapLen;
                    }
                    p.pop();
                }

                // Dendrites
                p.push();
                p.strokeWeight(2);
                const dendriteAngles = [-2.5, -2.0, -1.5, 1.5, 2.0, 2.5];
                for (const angle of dendriteAngles) {
                    const xEnd = somaX + Math.cos(angle) * 52;
                    const yEnd = axonY  + Math.sin(angle) * 52;
                    p.stroke(VIOLET[0], VIOLET[1], VIOLET[2], 160);
                    p.line(somaX, axonY, xEnd, yEnd);
                    VisualKit.drawGlowBody(p, xEnd, yEnd, 3, VIOLET, {
                        outerMult: 2.5, innerMult: 1.5, outerAlpha: 20, innerAlpha: 55, strokeWidth: 1
                    });
                }
                p.pop();

                // Soma — big glow body
                const somaR = refractoryTimer > 0 ? 26 : 28;
                const somaRGB = refractoryTimer > 0 ? SLATE : VIOLET;
                VisualKit.drawGlowBody(p, somaX, axonY, somaR, somaRGB, {
                    outerMult: 1.7, innerMult: 1.25, outerAlpha: 35, innerAlpha: 80,
                    strokeWidth: 2.5, specular: true
                });
                // Nucleus
                p.push();
                p.noStroke();
                p.fill(18, 20, 35);
                p.circle(somaX, axonY, 22);
                p.fill(VIOLET[0], VIOLET[1], VIOLET[2], 60);
                p.circle(somaX, axonY, 14);
                p.pop();

                // Axon terminals
                p.push();
                p.stroke(VIOLET[0], VIOLET[1], VIOLET[2], 180);
                p.strokeWeight(2);
                for (const dy of [-18, 0, 18]) {
                    p.line(axonEndX, axonY, axonEndX + 25, axonY + dy);
                    VisualKit.drawGlowBody(p, axonEndX + 25, axonY + dy, 4, BIO, {
                        outerMult: 2.6, innerMult: 1.5, outerAlpha: 30, innerAlpha: 70, strokeWidth: 1
                    });
                }
                p.pop();

                // ─────────────────────────────────────────────────────
                // 3. Spike trail + pulse
                // ─────────────────────────────────────────────────────
                if (spikeTrail.length >= 2) {
                    VisualKit.drawFadingTrail(p, spikeTrail, AMBER, {
                        exponent: 2.0, maxAlpha: 140,
                        minWeight: 2, maxWeight: 8
                    });
                }

                if (spikeX >= 0) {
                    const pulseX = somaX + spikeX;
                    VisualKit.drawGlowBody(p, pulseX, axonY, 10, AMBER, {
                        outerMult:  3.2, innerMult:  1.8,
                        outerAlpha: 55,  innerAlpha: 110,
                        strokeWidth: 1.5, specular: true
                    });
                }

                // Terminal arrival flash
                flashes = VisualKit.updateCollisionFlashes(p, flashes);

                // ─────────────────────────────────────────────────────
                // 4. Oscilloscope — drawInsetPanel + drawSparkline
                // ─────────────────────────────────────────────────────
                const oscX = 20;
                const oscY = Math.floor(h * 0.56);
                const oscW = w - 40;
                const oscH = Math.floor(h * 0.30);

                VisualKit.drawInsetPanel(p, oscX, oscY, oscW, oscH,
                    'Action Potential — Oscilloscope Trace', { cornerRadius: 8, textSize: 9 });

                // Reference lines
                const mapV = (mv) => {
                    const norm = (mv - (-90)) / 135;
                    return oscY + oscH - 8 - norm * (oscH - 26);
                };
                const y0      = mapV(0);
                const yThresh = mapV(-55);
                const yRest   = mapV(-70);

                p.push();
                p.strokeWeight(1);

                // 0 mV line
                if (p.drawingContext?.setLineDash) p.drawingContext.setLineDash([4, 5]);
                p.stroke(255, 255, 255, 22);
                p.line(oscX + 8, y0, oscX + oscW - 8, y0);

                // Threshold -55 mV
                p.stroke(AMBER[0], AMBER[1], AMBER[2], 55);
                p.line(oscX + 8, yThresh, oscX + oscW - 8, yThresh);

                // Resting -70 mV
                p.stroke(BIO[0], BIO[1], BIO[2], 55);
                p.line(oscX + 8, yRest, oscX + oscW - 8, yRest);

                if (p.drawingContext?.setLineDash) p.drawingContext.setLineDash([]);
                p.pop();

                // Labels
                p.push();
                p.noStroke();
                p.fill(80, 100, 130);
                p.textSize(8.5);
                p.textAlign(p.LEFT, p.CENTER);
                p.text('+35 mV  peak', oscX + 10, oscY + 18);
                p.text('-55 mV  threshold', oscX + 10, yThresh - 7);
                p.fill(BIO[0], BIO[1], BIO[2], 130);
                p.text('-70 mV  resting',  oscX + 10, yRest - 7);
                p.pop();

                // Voltage trace as sparkline
                if (voltageHistory.length > 1) {
                    VisualKit.drawSparkline(
                        p, oscX + 5, oscY + 5, oscW - 10, oscH - 10,
                        voltageHistory, BIO,
                        { drawChrome: false, zeroFloor: false }
                    );
                }

                // ─────────────────────────────────────────────────────
                // 5. Telemetry
                // ─────────────────────────────────────────────────────
                let status = 'Resting (-70mV)';
                if (Vm > 0)          status = 'Depolarized (Na⁺ Open)';
                else if (Vm < -75)   status = 'Hyperpolarized (Refractory)';
                else if (spikeX >= 0) status = 'Propagating Along Axon';

                ctx._telemetry = {
                    'Membrane Voltage': `${Vm.toFixed(1)} mV`,
                    'Firing Status':    status,
                    'Axon Spike Pos':   spikeX >= 0 ? `${spikeX.toFixed(0)} μm` : 'Inactive',
                    'Conduction Speed': isMyelinated ? '100 – 120 m/s (Saltatory)' : '1 – 2 m/s (Continuous)'
                };
                ctx.updateTelemetry();

                // ─────────────────────────────────────────────────────
                // 6. Footer hint
                // ─────────────────────────────────────────────────────
                p.push();
                p.noStroke();
                p.fill(70, 90, 120);
                p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text('Click the soma (cell body) or inject current ≥ 12 μA to trigger all-or-nothing action potential', 16, h - 8);
                p.pop();
            };

            function getPointerPos() {
                if (p.touches && p.touches.length > 0) return { x: p.touches[0].x, y: p.touches[0].y };
                return { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos  = getPointerPos();
                const axonY = p.height * 0.40;
                if (Math.hypot(pos.x - 70, pos.y - axonY) < 45) {
                    triggerSpike();
                    return false;
                }
            };
        }
    });

    sim.mount();
    return sim;
};
