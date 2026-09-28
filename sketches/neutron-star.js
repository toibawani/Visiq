// ===== NEUTRON STAR =====
// Rapidly rotating pulsar with lighthouse-beam emission, accretion disk, and glitch dynamics
// Astrophysics: moment of inertia, spin-down luminosity, magnetic dipole radiation, frame dragging

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'neutron-star',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            spinRate:     { value: 10, min: 1,  max: 716, step: 5,  label: 'Spin Rate',        unit: 'Hz' },
            magneticField:{ value: 12, min: 8,  max: 15,  step: 0.5,label: 'Magnetic Field',   unit: 'log₁₀(B/T)' },
            accretionRate:{ value: 30, min: 0,  max: 100, step: 5,  label: 'Accretion Rate',   unit: '%' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Period':           '0.100 s',
                'Spin-Down L':      '0 W',
                'Beam Angle':       '0°',
                'Object Class':     'Pulsar'
            };
        },
        setup(p, ctx) {
            let rotAngle = 0;          // current rotation in radians
            let pulseHistory = [];     // detector readout
            let glitchCooldown = 0;    // frames until glitch resets
            let glitchFlash = 0;
            let accrDiskParticles = [];

            function reset() {
                rotAngle = 0;
                pulseHistory = [];
                glitchCooldown = 0;
                glitchFlash = 0;
                accrDiskParticles = [];
            }

            ctx.onReset = reset;
            ctx.onResize = reset;

            p.draw = function() {
                p.background(7, 9, 15);
                const W = p.width;
                const H = p.height;
                const spin = ctx.params.spinRate;
                const logB = ctx.params.magneticField;
                const accRate = ctx.params.accretionRate / 100;

                const cx = W * 0.40;
                const cy = H * 0.45;
                const nsR = 28;           // neutron star radius in pixels

                // Rotation speed (radians per frame, capped for visibility)
                const visSpinRate = p.map(spin, 1, 716, 0.015, 0.35);

                // ── Deep space background ──
                // Stars
                p.randomSeed(42);
                for (let i = 0; i < 200; i++) {
                    const sx = p.random(W);
                    const sy = p.random(H);
                    const sr = p.random(0.5, 1.8);
                    const alpha = p.random(60, 200);
                    p.fill(200, 210, 255, alpha);
                    p.noStroke();
                    p.circle(sx, sy, sr * 2);
                }
                p.randomSeed(p.millis());

                // ── Accretion disk ──
                if (accRate > 0.05) {
                    // Spawn hot gas streaming in
                    if (ctx.isPlaying && Math.random() < accRate * 0.12 * ctx.speed) {
                        const ang = Math.random() * Math.PI * 2;
                        const dist = nsR * (2.5 + Math.random() * 3.5);
                        accrDiskParticles.push({
                            x: cx + Math.cos(ang) * dist,
                            y: cy + Math.sin(ang) * dist * 0.28,
                            vx: -Math.sin(ang) * accRate * 1.8,
                            vy: Math.cos(ang) * accRate * 0.5,
                            life: 1.0,
                            temp: 0.7 + Math.random() * 0.3
                        });
                    }

                    // Draw disk (elliptical, edge-on)
                    for (let r = 5; r > 0; r--) {
                        const diskAlpha = accRate * 40 * r;
                        const diskR = nsR * (1.6 + r * 0.7);
                        p.noFill();
                        p.stroke(200 + r * 10, 100 + r * 15, 30, diskAlpha);
                        p.strokeWeight(r * 2);
                        p.ellipse(cx, cy, diskR * 2, diskR * 0.35);
                    }

                    // Hot inner disk
                    p.noFill();
                    p.stroke(255, 200, 100, accRate * 180);
                    p.strokeWeight(2);
                    p.ellipse(cx, cy, nsR * 3.2, nsR * 0.8);
                }

                // ── Accretion particles ──
                p.noStroke();
                for (let i = accrDiskParticles.length - 1; i >= 0; i--) {
                    const ap = accrDiskParticles[i];
                    ap.x += ap.vx * ctx.speed;
                    ap.y += ap.vy * ctx.speed;
                    ap.life -= 0.012 * ctx.speed;
                    const alpha = ap.life * 200;
                    const t = ap.temp;
                    p.fill(255, 150 + t * 80, 30, alpha);
                    p.circle(ap.x, ap.y, 2.5);
                    if (ap.life <= 0) accrDiskParticles.splice(i, 1);
                }

                // ── Magnetic field lines ──
                p.noFill();
                const beamAng = rotAngle;
                for (let pole = 0; pole < 2; pole++) {
                    const poleAng = beamAng + pole * Math.PI;
                    for (let j = -2; j <= 2; j++) {
                        const lineAng = poleAng + j * 0.28;
                        const len = nsR * 4.5 + Math.abs(j) * nsR * 0.5;
                        p.stroke(100, 120, 220, 40 - Math.abs(j) * 8);
                        p.strokeWeight(0.8);
                        // Arc field line
                        p.beginShape();
                        for (let t = 0; t <= 1; t += 0.05) {
                            const r = nsR + (len - nsR) * t;
                            const a = lineAng + j * 0.4 * Math.sin(t * Math.PI);
                            p.vertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                        }
                        p.endShape();
                    }
                }

                // ── Pulsar beam (lighthouse effect) ──
                const beamLen = Math.max(W, H) * 1.2;
                for (let beam = 0; beam < 2; beam++) {
                    const bAng = rotAngle + beam * Math.PI;
                    for (let j = 0; j < 4; j++) {
                        const bAlpha = p.map(j, 0, 3, 180, 10);
                        const bSpread = j * 0.04;
                        p.stroke(180, 220, 255, bAlpha);
                        p.strokeWeight(1.5 - j * 0.3);
                        p.line(
                            cx + Math.cos(bAng + bSpread) * nsR,
                            cy + Math.sin(bAng + bSpread) * nsR,
                            cx + Math.cos(bAng + bSpread) * beamLen,
                            cy + Math.sin(bAng + bSpread) * beamLen
                        );
                        p.line(
                            cx + Math.cos(bAng - bSpread) * nsR,
                            cy + Math.sin(bAng - bSpread) * nsR,
                            cx + Math.cos(bAng - bSpread) * beamLen,
                            cy + Math.sin(bAng - bSpread) * beamLen
                        );
                    }
                }

                // ── Neutron star body ──
                // Extreme gravity glow
                for (let r = 5; r > 0; r--) {
                    p.fill(100, 160, 255, 12 * r);
                    p.noStroke();
                    p.circle(cx, cy, nsR * 2 + r * 10);
                }
                // Body
                p.fill(180, 210, 255);
                p.noStroke();
                p.circle(cx, cy, nsR * 2);
                // Hot spot at magnetic poles
                const hsx = cx + Math.cos(rotAngle) * nsR * 0.7;
                const hsy = cy + Math.sin(rotAngle) * nsR * 0.7;
                p.fill(255, 255, 200, 200);
                p.circle(hsx, hsy, 6);

                // ── Glitch event ──
                if (ctx.isPlaying) {
                    rotAngle += visSpinRate * ctx.speed;
                    glitchCooldown = Math.max(0, glitchCooldown - ctx.speed);
                    glitchFlash = Math.max(0, glitchFlash - ctx.speed);

                    // Glitch probability rises with spin and field
                    const glitchProb = spin * (logB - 7) * 0.00002 * ctx.speed;
                    if (Math.random() < glitchProb && glitchCooldown <= 0) {
                        rotAngle += visSpinRate * 8;  // spin-up glitch
                        glitchCooldown = 300;
                        glitchFlash = 25;
                    }
                }

                if (glitchFlash > 0) {
                    p.fill(255, 200, 100, p.map(glitchFlash, 0, 25, 0, 80));
                    p.noStroke();
                    p.rect(0, 0, W, H);
                    p.fill('#fbbf24'); p.noStroke(); p.textSize(14); p.textAlign(p.CENTER, p.CENTER);
                    p.text('GLITCH EVENT — spin-up', cx, cy - nsR - 30);
                }

                // ── Pulse detector (right panel) ──
                const detX = W * 0.65;
                const detY = H * 0.12;
                const detW = W * 0.32;
                const detH = H * 0.55;

                p.stroke('#1e293b'); p.strokeWeight(1);
                p.fill('rgba(10,12,20,0.85)');
                p.rect(detX, detY, detW, detH, 4);
                p.fill('#94a3b8'); p.noStroke(); p.textSize(9); p.textAlign(p.LEFT, p.TOP);
                p.text('Pulse Detector', detX + 4, detY + 3);

                // Detect beam crossing detector axis (top of canvas)
                const beamAngleDeg = ((rotAngle % (Math.PI * 2)) * 180 / Math.PI);
                const detected = (beamAngleDeg % 360 < visSpinRate * 180 / Math.PI * 12);
                if (ctx.isPlaying) {
                    pulseHistory.push(detected ? 1.0 : 0);
                    if (pulseHistory.length > 160) pulseHistory.shift();
                }

                if (pulseHistory.length > 1) {
                    p.stroke('#60a5fa');
                    p.strokeWeight(1.5);
                    p.noFill();
                    p.beginShape();
                    for (let i = 0; i < pulseHistory.length; i++) {
                        const px2 = detX + (i / 160) * detW;
                        const py2 = detY + detH * 0.85 - pulseHistory[i] * detH * 0.65;
                        p.vertex(px2, py2);
                    }
                    p.endShape();
                }

                // Period label
                const periodMs = (1 / spin * 1000).toFixed(1);
                p.fill('#94a3b8'); p.noStroke(); p.textSize(9); p.textAlign(p.LEFT, p.BOTTOM);
                p.text(`Period: ${periodMs} ms`, detX + 4, detY + detH - 2);

                // ── Legend / labels ──
                p.noStroke(); p.fill('#94a3b8'); p.textSize(10); p.textAlign(p.CENTER, p.TOP);
                p.text('Neutron Star / Pulsar Simulation', W * 0.5, 12);
                p.textAlign(p.LEFT, p.CENTER); p.textSize(9);
                p.fill('#6366f1'); p.text('Magnetic field lines', cx + nsR + 10, cy - nsR * 2.2);
                p.fill(180, 220, 255); p.text('Pulsar beam', cx + nsR + 10, cy - nsR * 1.2);
                if (accRate > 0.1) {
                    p.fill(230, 140, 40); p.text('Accretion disk', cx + nsR + 10, cy + nsR * 1.5);
                }

                // ── Telemetry ──
                const spinDownL = Math.pow(10, 2 * logB - 3) * Math.pow(spin, 4) * 1e-30;
                const objClass = spin > 700 ? 'Millisecond Pulsar' : spin > 10 ? 'Pulsar' : 'Magnetar';
                ctx._telemetry = {
                    'Period':      `${(1 / spin).toFixed(4)} s`,
                    'Spin-Down L': `${spinDownL.toExponential(1)} W`,
                    'Beam Angle':  `${(beamAngleDeg % 360).toFixed(0)}°`,
                    'Object Class': objClass
                };
                ctx.updateTelemetry();

                p.fill('#94a3b8'); p.noStroke(); p.textAlign(p.LEFT, p.BOTTOM); p.textSize(10);
                p.text('Blue beam = radio/X-ray pulsar lighthouse  •  Glitch = crust quake, sudden spin-up  •  High spin + accretion = millisecond pulsar', 14, H - 10);
            };
        }
    });

    sim.mount();
    return sim;
};
