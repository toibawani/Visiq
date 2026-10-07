// ===== QUANTUM TUNNELING =====
// Wave packet transmission and reflection across a finite rectangular potential barrier
// Physics: 1D Time-dependent Schrödinger equation approximation with exponential evanescent decay

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'quantum-tunnel',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            particleEnergy: { value: 3.5, min: 1.0, max: 8.0,  step: 0.1, label: 'Particle Energy (E)', unit: 'eV' },
            barrierHeight:  { value: 5.0, min: 2.0, max: 10.0, step: 0.1, label: 'Barrier Height (V₀)',  unit: 'eV' },
            barrierWidth:   { value: 40,  min: 15,  max: 90,   step: 5,   label: 'Barrier Width (L)',    unit: 'nm' }
        },
        // The barrier is drawn 1 px per nm (barrierWidth feeds the geometry directly).
        scale: { unit: 'nm', pxPerUnit: 1 },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Transmission (T)': '0.0%',
                'Reflection (R)':   '100.0%',
                'Decay Factor (κ)': '0.0 nm⁻¹',
                'E / V₀ Ratio':     '0.00'
            };
        },

        setup(p, ctx) {
            // ── Color palette ──────────────────────────────────────────
            const PHYS    = VisualKit.getCategoryRGB('physics');  // cyan
            const VIOLET  = [124, 106, 247];   // reflected wave
            const AMBER   = [232, 160,  76];   // potential barrier
            const TEAL    = [ 45, 212, 191];   // energy line / transmitted

            // ── State ──────────────────────────────────────────────────
            let packetX = 0;
            const sigma = 35; // packet spatial width (px)
            // Sparkline for transmission coefficient over time
            let transmissionHistory = [];

            function resetPacket() {
                packetX = p.width * 0.18;
            }

            resetPacket();
            ctx.onReset  = resetPacket;
            ctx.onResize = resetPacket;

            p.draw = function() {
                p.background(7, 9, 15);

                const w = p.width;
                const h = p.height;

                // ── Layout ─────────────────────────────────────────────
                const groundY       = h * 0.68;
                const barrierCenter = w * 0.52;
                const bWidth        = ctx.params.barrierWidth;
                const bLeft         = barrierCenter - bWidth / 2;
                const bRight        = barrierCenter + bWidth / 2;

                const E   = ctx.params.particleEnergy;
                const V0  = ctx.params.barrierHeight;
                const dt  = ctx.speed;
                const vScale = 22; // px per eV

                // ── Physics ────────────────────────────────────────────
                if (ctx.isPlaying) {
                    packetX += 1.8 * dt;
                    if (packetX > w + 120) resetPacket();
                }

                // Tunneling transmission coefficient (analytical 1D WKB)
                let T = 0, kappa = 0;
                if (E < V0) {
                    kappa = Math.sqrt(Math.max(0.01, V0 - E)) * 0.15;
                    const sinhVal = Math.sinh(kappa * bWidth * 0.1);
                    T = 1 / (1 + (V0 * V0 * sinhVal * sinhVal) / (4 * E * (V0 - E)));
                } else {
                    const kPrime = Math.sqrt(Math.max(0.01, E - V0)) * 0.15;
                    const sinVal = Math.sin(kPrime * bWidth * 0.1);
                    T = 1 / (1 + (V0 * V0 * sinVal * sinVal) / (4 * E * (E - V0)));
                }
                const R = Math.max(0, 1 - T);

                const barrierTopY = groundY - V0 * vScale;
                const energyY     = groundY - E  * vScale;

                // ── Ground line ────────────────────────────────────────
                p.push();
                p.stroke(35, 48, 70);
                p.strokeWeight(1.5);
                p.line(0, groundY, w, groundY);
                p.pop();

                // ── Potential barrier block ────────────────────────────
                // Glow fill
                p.push();
                p.noStroke();
                p.fill(AMBER[0], AMBER[1], AMBER[2], 28);
                p.rect(bLeft, barrierTopY, bWidth, groundY - barrierTopY, 3);
                p.pop();

                // Barrier outline with glow
                p.push();
                p.noFill();
                p.stroke(AMBER[0], AMBER[1], AMBER[2], 200);
                p.strokeWeight(2);
                p.line(bLeft,  groundY,     bLeft,  barrierTopY);
                p.line(bLeft,  barrierTopY, bRight, barrierTopY);
                p.line(bRight, barrierTopY, bRight, groundY);

                // Soft inner glow band
                p.stroke(AMBER[0], AMBER[1], AMBER[2], 50);
                p.strokeWeight(8);
                p.line(bLeft + 2,  barrierTopY + 4, bRight - 2, barrierTopY + 4);

                // V₀ label
                p.noStroke();
                p.fill(AMBER[0], AMBER[1], AMBER[2], 200);
                p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text(`V₀ = ${V0.toFixed(1)} eV`, bRight + 8, barrierTopY + 14);
                p.pop();

                // ── Energy level E (dashed) ────────────────────────────
                p.push();
                if (p.drawingContext?.setLineDash) p.drawingContext.setLineDash([6, 6]);
                p.stroke(TEAL[0], TEAL[1], TEAL[2], 160);
                p.strokeWeight(1.5);
                p.line(0, energyY, w, energyY);
                if (p.drawingContext?.setLineDash) p.drawingContext.setLineDash([]);
                p.noStroke();
                p.fill(TEAL[0], TEAL[1], TEAL[2], 210);
                p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text(`E = ${E.toFixed(1)} eV`, 16, energyY - 4);
                p.pop();

                // ── Wave packet wavefunction Re(ψ) ─────────────────────
                const k0   = Math.sqrt(E) * 0.45;
                const time = (p.millis() / 300) * ctx.speed;

                // Build vertex arrays for incident, reflected, transmitted
                // so we can colour them separately
                const incidentPts    = [];
                const reflectedPts   = [];
                const transmittedPts = [];
                const evanescentPts  = [];

                for (let x = 0; x <= w; x += 2) {
                    let amp = 0;
                    let zone = 'incident';

                    if (packetX < bLeft) {
                        // Incident side: single gaussian wave packet
                        const dist = x - packetX;
                        const env  = Math.exp(-(dist * dist) / (2 * sigma * sigma));
                        amp = env * Math.cos(k0 * dist - time);
                        zone = 'incident';
                    } else {
                        const elapsed = packetX - bLeft;

                        // Reflected (left side)
                        const refCenter = bLeft - elapsed;
                        const distRef   = x - refCenter;
                        const refEnv    = Math.sqrt(R) * Math.exp(-(distRef * distRef) / (2 * sigma * sigma));
                        const refWave   = refEnv * Math.cos(-k0 * distRef - time);

                        // Transmitted (right side)
                        const transCenter = bRight + elapsed;
                        const distTrans   = x - transCenter;
                        const transEnv    = Math.sqrt(T) * Math.exp(-(distTrans * distTrans) / (2 * sigma * sigma));
                        const transWave   = transEnv * Math.cos(k0 * distTrans - time);

                        if (x < bLeft) {
                            amp  = refWave;
                            zone = 'reflected';
                        } else if (x > bRight) {
                            amp  = transWave;
                            zone = 'transmitted';
                        } else {
                            // Evanescent decay inside barrier
                            const depth = x - bLeft;
                            amp  = Math.exp(-kappa * depth * 0.8) * Math.cos(time * 0.5) * 0.6;
                            zone = 'evanescent';
                        }
                    }

                    const wy = energyY - amp * 45;
                    if      (zone === 'incident')    incidentPts.push({ x, y: wy });
                    else if (zone === 'reflected')   reflectedPts.push({ x, y: wy });
                    else if (zone === 'transmitted') transmittedPts.push({ x, y: wy });
                    else                             evanescentPts.push({ x, y: wy });
                }

                function drawCurve(pts, r, g, b, alpha = 220, weight = 2) {
                    if (pts.length < 2) return;
                    p.push();
                    p.noFill();
                    p.stroke(r, g, b, alpha);
                    p.strokeWeight(weight);
                    p.beginShape();
                    for (const pt of pts) p.vertex(pt.x, pt.y);
                    p.endShape();
                    // Subtle glow pass
                    p.stroke(r, g, b, 35);
                    p.strokeWeight(weight + 5);
                    p.beginShape();
                    for (const pt of pts) p.vertex(pt.x, pt.y);
                    p.endShape();
                    p.pop();
                }

                drawCurve(incidentPts,    PHYS[0],   PHYS[1],   PHYS[2],   200, 2.5);
                drawCurve(reflectedPts,   VIOLET[0], VIOLET[1], VIOLET[2], 200, 2.5);
                drawCurve(transmittedPts, TEAL[0],   TEAL[1],   TEAL[2],   210, 2.5);
                drawCurve(evanescentPts,  AMBER[0],  AMBER[1],  AMBER[2],  150, 1.5);

                // ── Inset transmission panel (top-left) ───────────────
                transmissionHistory.push(T * 100);
                if (transmissionHistory.length > 80) transmissionHistory.shift();

                const spkW = 160;
                const spkH = 56;
                const spkX = 14;
                const spkY = 14;
                if (transmissionHistory.length >= 2) {
                    VisualKit.drawSparkline(
                        p, spkX, spkY, spkW, spkH,
                        transmissionHistory, TEAL,
                        { label: 'Transmission T (%)', zeroFloor: true, cornerRadius: 7, textSize: 8.5 }
                    );
                }

                // ── Colour-coded wave legend ───────────────────────────
                const legItems = [
                    { label: 'Incident',    rgb: PHYS   },
                    { label: 'Reflected',   rgb: VIOLET },
                    { label: 'Transmitted', rgb: TEAL   },
                    { label: 'Evanescent',  rgb: AMBER  },
                ];
                const legX = spkX + spkW + 10;
                const legY = spkY;
                VisualKit.drawInsetPanel(p, legX, legY, 120, 58, 'Wave Zones', { cornerRadius: 7, textSize: 8.5 });
                for (let i = 0; i < legItems.length; i++) {
                    const li = legItems[i];
                    p.push();
                    p.noStroke();
                    p.fill(li.rgb[0], li.rgb[1], li.rgb[2], 220);
                    p.circle(legX + 10, legY + 17 + i * 12, 5);
                    p.fill(120, 145, 180);
                    p.textSize(8);
                    p.textAlign(p.LEFT, p.CENTER);
                    p.text(li.label, legX + 18, legY + 17 + i * 12);
                    p.pop();
                }

                // ── Telemetry ──────────────────────────────────────────
                ctx._telemetry = {
                    'Transmission (T)': `${(T * 100).toFixed(1)}%`,
                    'Reflection (R)':   `${(R * 100).toFixed(1)}%`,
                    'Decay Factor (κ)': `${kappa.toFixed(2)} nm⁻¹`,
                    'E / V₀ Ratio':     `${(E / V0).toFixed(2)}`
                };
                ctx.updateTelemetry();

                // ── Footer hint ────────────────────────────────────────
                p.push();
                p.noStroke();
                p.fill(70, 90, 120);
                p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text('Wave packet splits into transmitted and reflected probability waves  ·  R to re-fire', 16, h - 10);
                p.pop();
            };
        }
    });

    sim.mount();
    return sim;
};
