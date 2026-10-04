// ===== NEUTRON STAR =====
// Rapidly rotating pulsar with lighthouse-beam emission, accretion disk, and glitch dynamics
// Astrophysics: moment of inertia, spin-down luminosity, magnetic dipole radiation, frame dragging

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'neutron-star',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            spinRate:      { value: 10, min: 1,   max: 716, step: 5,   label: 'Spin Rate',       unit: 'Hz'        },
            magneticField: { value: 12, min: 8,   max: 15,  step: 0.5, label: 'Magnetic Field',  unit: 'log₁₀(B/T)'},
            accretionRate: { value: 30, min: 0,   max: 100, step: 5,   label: 'Accretion Rate',  unit: '%'         }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Period':       '0.100 s',
                'Spin-Down L':  '0 W',
                'Beam Angle':   '0°',
                'Object Class': 'Pulsar'
            };
        },

        setup(p, ctx) {
            // ── Color palette ──────────────────────────────────────────
            const ASTRO = VisualKit.getCategoryRGB('astronomy');  // amber-gold
            const NS_RGB  = [180, 210, 255]; // neutron star blue-white
            const BEAM_RGB = [180, 220, 255]; // pulsar beam
            const ACCR_RGB = [255, 160, 40];  // accretion disk orange

            // ── State ──────────────────────────────────────────────────
            let rotAngle          = 0;
            let pulseHistory      = [];
            let glitchCooldown    = 0;
            let glitchFlash       = 0;
            let accrDiskParticles = [];
            let flashes           = [];

            function reset() {
                rotAngle          = 0;
                pulseHistory      = [];
                glitchCooldown    = 0;
                glitchFlash       = 0;
                accrDiskParticles = [];
                flashes           = [];
            }

            ctx.onReset  = reset;
            ctx.onResize = reset;

            p.draw = function() {
                p.background(7, 9, 15);
                const W       = p.width;
                const H       = p.height;
                const spin    = ctx.params.spinRate;
                const logB    = ctx.params.magneticField;
                const accRate = ctx.params.accretionRate / 100;

                const cx  = W * 0.40;
                const cy  = H * 0.45;
                const nsR = 28;

                const visSpinRate = p.map(spin, 1, 716, 0.015, 0.35);

                // ─────────────────────────────────────────────────────
                // 1. Deep-space star field
                // ─────────────────────────────────────────────────────
                p.randomSeed(42);
                p.noStroke();
                for (let i = 0; i < 220; i++) {
                    const sx = p.random(W);
                    const sy = p.random(H);
                    const sr = p.random(0.5, 1.8);
                    p.fill(200, 215, 255, p.random(50, 180));
                    p.circle(sx, sy, sr * 2);
                }
                p.randomSeed(p.millis());

                // ─────────────────────────────────────────────────────
                // 2. Accretion disk (elliptical layered rings)
                // ─────────────────────────────────────────────────────
                if (accRate > 0.05) {
                    // Spawn hot gas particles
                    if (ctx.isPlaying && Math.random() < accRate * 0.12 * ctx.speed) {
                        const ang  = Math.random() * Math.PI * 2;
                        const dist = nsR * (2.5 + Math.random() * 3.5);
                        accrDiskParticles.push({
                            x:    cx + Math.cos(ang) * dist,
                            y:    cy + Math.sin(ang) * dist * 0.28,
                            vx:  -Math.sin(ang) * accRate * 1.8,
                            vy:   Math.cos(ang) * accRate * 0.5,
                            life: 1.0,
                            temp: 0.7 + Math.random() * 0.3
                        });
                    }

                    // Disk rings
                    for (let r = 5; r > 0; r--) {
                        p.noFill();
                        p.stroke(200 + r * 10, 100 + r * 15, 30, accRate * 40 * r);
                        p.strokeWeight(r * 2.2);
                        p.ellipse(cx, cy, nsR * (1.6 + r * 0.7) * 2, nsR * (1.6 + r * 0.7) * 0.35);
                    }
                    // Hot inner ring
                    p.noFill();
                    p.stroke(255, 200, 100, accRate * 180);
                    p.strokeWeight(2.5);
                    p.ellipse(cx, cy, nsR * 3.2, nsR * 0.8);
                }

                // Accretion particles
                p.noStroke();
                for (let i = accrDiskParticles.length - 1; i >= 0; i--) {
                    const ap = accrDiskParticles[i];
                    ap.x    += ap.vx * ctx.speed;
                    ap.y    += ap.vy * ctx.speed;
                    ap.life -= 0.012 * ctx.speed;
                    p.fill(255, 150 + ap.temp * 80, 30, ap.life * 200);
                    p.circle(ap.x, ap.y, 2.5);
                    if (ap.life <= 0) accrDiskParticles.splice(i, 1);
                }

                // ─────────────────────────────────────────────────────
                // 3. Magnetic field lines
                // ─────────────────────────────────────────────────────
                p.noFill();
                const beamAng = rotAngle;
                for (let pole = 0; pole < 2; pole++) {
                    const poleAng = beamAng + pole * Math.PI;
                    for (let j = -2; j <= 2; j++) {
                        const lineAng = poleAng + j * 0.28;
                        const len     = nsR * 4.5 + Math.abs(j) * nsR * 0.5;
                        p.stroke(100, 120, 220, 38 - Math.abs(j) * 8);
                        p.strokeWeight(0.9);
                        p.beginShape();
                        for (let t = 0; t <= 1; t += 0.05) {
                            const r = nsR + (len - nsR) * t;
                            const a = lineAng + j * 0.4 * Math.sin(t * Math.PI);
                            p.vertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                        }
                        p.endShape();
                    }
                }

                // ─────────────────────────────────────────────────────
                // 4. Pulsar beam (lighthouse — multi-layer glow)
                // ─────────────────────────────────────────────────────
                const beamLen = Math.max(W, H) * 1.2;
                for (let beam = 0; beam < 2; beam++) {
                    const bAng = rotAngle + beam * Math.PI;
                    // Wide glow fan
                    p.push();
                    p.noFill();
                    for (let layer = 4; layer >= 0; layer--) {
                        const alpha   = p.map(layer, 4, 0, 8, 160);
                        const spread  = layer * 0.055;
                        p.stroke(BEAM_RGB[0], BEAM_RGB[1], BEAM_RGB[2], alpha);
                        p.strokeWeight(layer === 0 ? 1.5 : layer * 1.2);
                        p.line(
                            cx + Math.cos(bAng + spread) * nsR,
                            cy + Math.sin(bAng + spread) * nsR,
                            cx + Math.cos(bAng + spread) * beamLen,
                            cy + Math.sin(bAng + spread) * beamLen
                        );
                        p.line(
                            cx + Math.cos(bAng - spread) * nsR,
                            cy + Math.sin(bAng - spread) * nsR,
                            cx + Math.cos(bAng - spread) * beamLen,
                            cy + Math.sin(bAng - spread) * beamLen
                        );
                    }
                    p.pop();
                }

                // ─────────────────────────────────────────────────────
                // 5. Neutron star body (glow body)
                // ─────────────────────────────────────────────────────
                VisualKit.drawGlowBody(p, cx, cy, nsR, NS_RGB, {
                    outerMult:  2.4, innerMult:  1.5,
                    outerAlpha: 40,  innerAlpha: 85,
                    strokeWidth: 2, specular: true
                });

                // Magnetic hotspot at pole
                const hsx = cx + Math.cos(rotAngle) * nsR * 0.7;
                const hsy = cy + Math.sin(rotAngle) * nsR * 0.7;
                VisualKit.drawGlowBody(p, hsx, hsy, 4, [255, 255, 200], {
                    outerMult: 3.0, innerMult: 1.8, outerAlpha: 60, innerAlpha: 120,
                    strokeWidth: 1, specular: false
                });

                // ─────────────────────────────────────────────────────
                // 6. Glitch event
                // ─────────────────────────────────────────────────────
                if (ctx.isPlaying) {
                    rotAngle     += visSpinRate * ctx.speed;
                    glitchCooldown = Math.max(0, glitchCooldown - ctx.speed);
                    glitchFlash    = Math.max(0, glitchFlash    - ctx.speed);

                    const glitchProb = spin * (logB - 7) * 0.00002 * ctx.speed;
                    if (Math.random() < glitchProb && glitchCooldown <= 0) {
                        rotAngle      += visSpinRate * 8;
                        glitchCooldown = 300;
                        glitchFlash    = 25;
                        flashes.push(VisualKit.createCollisionFlash(cx, cy, nsR + 20, 40));
                    }
                }

                flashes = VisualKit.updateCollisionFlashes(p, flashes);

                if (glitchFlash > 0) {
                    p.push();
                    p.fill(255, 200, 100, p.map(glitchFlash, 0, 25, 0, 55));
                    p.noStroke();
                    p.rect(0, 0, W, H);
                    p.noStroke();
                    p.fill(251, 191, 36, 200);
                    p.textSize(14);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.text('GLITCH EVENT — spin-up', cx, cy - nsR - 32);
                    p.pop();
                }

                // ─────────────────────────────────────────────────────
                // 7. Pulse detector panel (right)
                // ─────────────────────────────────────────────────────
                const detX = W * 0.65;
                const detY = H * 0.10;
                const detW = W * 0.32;
                const detH = H * 0.58;

                VisualKit.drawInsetPanel(p, detX, detY, detW, detH,
                    'Pulse Detector', { cornerRadius: 8, textSize: 9 });

                const beamAngleDeg = ((rotAngle % (Math.PI * 2)) * 180 / Math.PI);
                const detected     = (beamAngleDeg % 360 < visSpinRate * 180 / Math.PI * 12);

                if (ctx.isPlaying) {
                    pulseHistory.push(detected ? 1.0 : 0);
                    if (pulseHistory.length > 160) pulseHistory.shift();
                }

                if (pulseHistory.length > 1) {
                    p.push();
                    // Glow pass
                    p.noFill();
                    p.stroke(BEAM_RGB[0], BEAM_RGB[1], BEAM_RGB[2], 30);
                    p.strokeWeight(7);
                    p.beginShape();
                    for (let i = 0; i < pulseHistory.length; i++) {
                        const px2 = detX + 6 + (i / 160) * (detW - 12);
                        const py2 = detY + detH * 0.85 - pulseHistory[i] * detH * 0.65;
                        p.vertex(px2, py2);
                    }
                    p.endShape();
                    // Core line
                    p.stroke(BEAM_RGB[0], BEAM_RGB[1], BEAM_RGB[2], 210);
                    p.strokeWeight(1.8);
                    p.beginShape();
                    for (let i = 0; i < pulseHistory.length; i++) {
                        const px2 = detX + 6 + (i / 160) * (detW - 12);
                        const py2 = detY + detH * 0.85 - pulseHistory[i] * detH * 0.65;
                        p.vertex(px2, py2);
                    }
                    p.endShape();
                    p.pop();
                }

                // Period label inside panel
                p.push();
                p.noStroke();
                p.fill(80, 100, 130);
                p.textSize(8.5);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text(`Period: ${(1 / spin * 1000).toFixed(1)} ms`, detX + 6, detY + detH - 5);
                p.pop();

                // ─────────────────────────────────────────────────────
                // 8. Labels & annotations
                // ─────────────────────────────────────────────────────
                p.push();
                p.noStroke();
                p.fill(148, 163, 184, 180);
                p.textSize(11);
                p.textAlign(p.CENTER, p.TOP);
                p.text('Neutron Star / Pulsar Simulation', W * 0.5, 10);

                p.textAlign(p.LEFT, p.CENTER);
                p.textSize(9);
                p.fill(100, 120, 220, 160);
                p.text('Magnetic field lines', cx + nsR + 10, cy - nsR * 2.2);
                p.fill(BEAM_RGB[0], BEAM_RGB[1], BEAM_RGB[2], 160);
                p.text('Pulsar beam', cx + nsR + 10, cy - nsR * 1.2);
                if (accRate > 0.1) {
                    p.fill(230, 140, 40, 160);
                    p.text('Accretion disk', cx + nsR + 10, cy + nsR * 1.5);
                }
                p.pop();

                // ─────────────────────────────────────────────────────
                // 9. Telemetry
                // ─────────────────────────────────────────────────────
                const spinDownL = Math.pow(10, 2 * logB - 3) * Math.pow(spin, 4) * 1e-30;
                const objClass  = spin > 700 ? 'Millisecond Pulsar' : spin > 10 ? 'Pulsar' : 'Magnetar';

                ctx._telemetry = {
                    'Period':       `${(1 / spin).toFixed(4)} s`,
                    'Spin-Down L':  `${spinDownL.toExponential(1)} W`,
                    'Beam Angle':   `${(beamAngleDeg % 360).toFixed(0)}°`,
                    'Object Class': objClass
                };
                ctx.updateTelemetry();

                // ─────────────────────────────────────────────────────
                // 10. Footer hint
                // ─────────────────────────────────────────────────────
                p.push();
                p.noStroke();
                p.fill(70, 90, 120);
                p.textSize(10);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text('Blue beam = radio/X-ray pulsar lighthouse  ·  Glitch = crust quake, sudden spin-up  ·  High spin + accretion = ms pulsar', 14, H - 8);
                p.pop();
            };
        }
    });

    sim.mount();
    return sim;
};
