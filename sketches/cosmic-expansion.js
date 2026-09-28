// ===== COSMIC EXPANSION =====
// Hubble flow, redshift, and dark energy acceleration in an expanding universe
// Cosmology: Friedmann equation, Hubble constant, ΛCDM model, lookback time

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'cosmic-expansion',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            hubbleConstant: { value: 70,  min: 50,  max: 100, step: 2,   label: 'Hubble Constant H₀', unit: 'km/s/Mpc' },
            darkEnergy:     { value: 0.68, min: 0,  max: 1.0, step: 0.02, label: 'Dark Energy Ω_Λ',    unit: '' },
            lookbackTime:   { value: 0,   min: 0,  max: 13.8, step: 0.1,  label: 'Lookback Time',     unit: 'Gyr' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Scale Factor a':  '1.000',
                'Recession Speed': '0 km/s',
                'Redshift z':      '0.00',
                'Age of Universe': '13.8 Gyr'
            };
        },
        setup(p, ctx) {
            // Galaxies: fixed comoving position, screen position expands
            const NUM_GALAXIES = 55;
            let galaxies = [];
            let scaleFactor = 1.0;    // a(t), starts at 1 = now
            let cosmicTime = 13.8;    // Gyr from Big Bang
            let hubbleFlow = [];      // v vs d data
            let simTime = 0;

            // Galaxy types for variety
            const types = ['spiral', 'elliptical', 'irregular'];

            function initGalaxies() {
                galaxies = [];
                for (let i = 0; i < NUM_GALAXIES; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 0.05 + Math.random() * 0.45;   // comoving distance, 0–0.45 "units"
                    galaxies.push({
                        cx: (Math.random() - 0.5) * 2,          // comoving x (–1 to 1)
                        cy: (Math.random() - 0.5) * 2,          // comoving y
                        type: types[Math.floor(Math.random() * types.length)],
                        size: 3 + Math.random() * 6,
                        hue: Math.random() * 60,                 // 0=red 60=yellow
                        arm: Math.random() * Math.PI * 2,        // spiral arm angle
                        clusterGroup: Math.floor(Math.random() * 6)
                    });
                }
                // Cluster galaxies slightly (large-scale structure)
                const clusterCenters = Array.from({ length: 6 }, () => ({
                    x: (Math.random() - 0.5) * 1.6,
                    y: (Math.random() - 0.5) * 1.6
                }));
                for (const g of galaxies) {
                    const cc = clusterCenters[g.clusterGroup];
                    g.cx = g.cx * 0.3 + cc.x;
                    g.cy = g.cy * 0.3 + cc.y;
                }
            }

            initGalaxies();
            scaleFactor = 1.0;
            ctx.onReset = () => { initGalaxies(); scaleFactor = 1.0; cosmicTime = 13.8; simTime = 0; hubbleFlow = []; };
            ctx.onResize = () => { initGalaxies(); };
            ctx.onParamChange = (k) => { if (k === 'lookbackTime') simTime = 0; };

            function drawSpiral(p, gx, gy, size, arm, redshift) {
                const alpha = p.map(redshift, 0, 5, 220, 40);
                p.noFill();
                p.strokeWeight(0.8);
                for (let s = 0; s < 2; s++) {
                    p.stroke(200 - redshift * 30, 180 - redshift * 20, 255, alpha * 0.6);
                    p.beginShape();
                    for (let t = 0; t < Math.PI * 2.5; t += 0.1) {
                        const r = size * 0.15 * t;
                        p.vertex(gx + Math.cos(t + arm + s * Math.PI) * r, gy + Math.sin(t + arm + s * Math.PI) * r * 0.55);
                    }
                    p.endShape();
                }
                p.fill(255, 240, 200, alpha);
                p.noStroke();
                p.circle(gx, gy, size * 0.6);
            }

            function drawElliptical(p, gx, gy, size, redshift) {
                const alpha = p.map(redshift, 0, 5, 200, 30);
                for (let r = 3; r > 0; r--) {
                    p.fill(220 - redshift * 20, 200 - redshift * 15, 180, alpha * 0.35 * r);
                    p.noStroke();
                    p.ellipse(gx, gy, size * r * 0.7, size * r * 0.45);
                }
                p.fill(240, 230, 210, alpha);
                p.circle(gx, gy, size * 0.5);
            }

            function drawIrregular(p, gx, gy, size, redshift) {
                const alpha = p.map(redshift, 0, 5, 180, 25);
                p.fill(100, 180, 255, alpha);
                p.noStroke();
                for (let j = 0; j < 5; j++) {
                    p.circle(gx + p.random(-size * 0.5, size * 0.5),
                             gy + p.random(-size * 0.4, size * 0.4),
                             size * p.random(0.2, 0.5));
                }
            }

            p.draw = function() {
                p.background(7, 9, 15);
                const W = p.width;
                const H = p.height;
                const H0 = ctx.params.hubbleConstant;
                const OmL = ctx.params.darkEnergy;
                const OmM = 1 - OmL;   // simplified: matter + dark energy = 1

                // Observer at center (Milky Way)
                const obsX = W * 0.42;
                const obsY = H * 0.45;

                // Scale factor: in lookback mode, freeze at param; otherwise animate
                if (ctx.isPlaying) {
                    // Friedmann-inspired: a_dot ≈ H0 * sqrt(OmM/a + OmL*a^2) (simplified)
                    const aDot = H0 * 0.0000015 * Math.sqrt(OmM / scaleFactor + OmL * scaleFactor * scaleFactor);
                    scaleFactor += aDot * ctx.speed;
                    cosmicTime += 0.001 * ctx.speed;
                    simTime += ctx.speed / 60;
                }

                // Lookback mode overrides
                const a = ctx.params.lookbackTime > 0
                    ? p.map(13.8 - ctx.params.lookbackTime, 0, 13.8, 0.05, 1.0)
                    : scaleFactor;
                const redshift = Math.max(0, 1 / a - 1);

                // Cosmic microwave background when z > 3
                if (redshift > 1.5) {
                    const cmbAlpha = p.map(redshift, 1.5, 10, 0, 120);
                    p.fill(40, 20, 10, cmbAlpha);
                    p.noStroke();
                    p.rect(0, 0, W, H);
                }

                // ── Draw cosmic web filaments ──
                p.stroke('#283150'); p.strokeWeight(0.5); p.noFill();
                for (let i = 0; i < galaxies.length; i++) {
                    for (let j = i + 1; j < galaxies.length; j++) {
                        if (galaxies[i].clusterGroup === galaxies[j].clusterGroup) {
                            const x1 = obsX + galaxies[i].cx * a * obsX * 0.85;
                            const y1 = obsY + galaxies[i].cy * a * obsY * 0.85;
                            const x2 = obsX + galaxies[j].cx * a * obsX * 0.85;
                            const y2 = obsY + galaxies[j].cy * a * obsY * 0.85;
                            const d = p.dist(x1, y1, x2, y2);
                            if (d < 80) {
                                p.stroke(40, 50, 70, p.map(d, 0, 80, 80, 0));
                                p.line(x1, y1, x2, y2);
                            }
                        }
                    }
                }

                // ── Draw galaxies ──
                p.randomSeed(999);
                hubbleFlow = [];
                for (const g of galaxies) {
                    const screenX = obsX + g.cx * a * obsX * 0.85;
                    const screenY = obsY + g.cy * a * obsY * 0.85;

                    // Skip if off-screen
                    if (screenX < -50 || screenX > W + 50 || screenY < -50 || screenY > H + 50) continue;

                    const comovingDist = Math.sqrt(g.cx * g.cx + g.cy * g.cy);
                    const physDist = comovingDist * a;             // Mpc (arbitrary units)
                    const recessionV = H0 * physDist;              // km/s

                    // Redshift color shift (blueish → reddish)
                    p.randomSeed(g.cx * 1000 + g.cy * 100);
                    if (g.type === 'spiral') {
                        drawSpiral(p, screenX, screenY, g.size * (0.6 + a * 0.4), g.arm, redshift);
                    } else if (g.type === 'elliptical') {
                        drawElliptical(p, screenX, screenY, g.size * (0.6 + a * 0.4), redshift);
                    } else {
                        drawIrregular(p, screenX, screenY, g.size, redshift);
                    }

                    hubbleFlow.push({ dist: physDist, v: recessionV });
                }
                p.randomSeed(p.millis());

                // ── Milky Way (observer) ──
                for (let r = 4; r > 0; r--) {
                    p.fill(100, 180, 255, 15 * r);
                    p.noStroke();
                    p.circle(obsX, obsY, 20 + r * 8);
                }
                p.fill(180, 220, 255);
                p.noStroke();
                p.circle(obsX, obsY, 12);
                p.fill('#94a3b8'); p.textSize(9); p.textAlign(p.CENTER, p.BOTTOM);
                p.text('You are here', obsX, obsY - 8);

                // ── Hubble diagram (right panel) ──
                const hdX = W * 0.68;
                const hdY = H * 0.08;
                const hdW = W * 0.30;
                const hdH = H * 0.55;
                p.stroke('#1e293b'); p.strokeWeight(1);
                p.fill('rgba(10,12,20,0.88)');
                p.rect(hdX, hdY, hdW, hdH, 4);
                p.fill('#94a3b8'); p.noStroke(); p.textSize(9); p.textAlign(p.LEFT, p.TOP);
                p.text('Hubble Diagram  v = H₀·d', hdX + 4, hdY + 3);

                // Axes
                p.stroke('#283150'); p.strokeWeight(1);
                p.line(hdX + 10, hdY + hdH - 12, hdX + hdW - 5, hdY + hdH - 12);
                p.line(hdX + 10, hdY + 16, hdX + 10, hdY + hdH - 12);

                // Hubble line
                p.stroke('#fbbf2460'); p.strokeWeight(1.5); p.noFill();
                p.beginShape();
                for (let d = 0; d <= 1; d += 0.05) {
                    const v = H0 * d;
                    const hx = hdX + 10 + d * (hdW - 15);
                    const hy = (hdY + hdH - 12) - p.map(v, 0, 100, 0, hdH - 28);
                    p.vertex(hx, hy);
                }
                p.endShape();

                // Data points
                for (const pt of hubbleFlow) {
                    const hx = hdX + 10 + p.map(pt.dist, 0, 1.0, 0, hdW - 15);
                    const hy = (hdY + hdH - 12) - p.map(pt.v, 0, H0, 0, hdH - 28);
                    p.fill('#60a5fa'); p.noStroke();
                    p.circle(hx, p.constrain(hy, hdY + 16, hdY + hdH - 12), 3.5);
                }

                p.fill('#94a3b8'); p.noStroke(); p.textSize(8.5);
                p.textAlign(p.CENTER, p.BOTTOM);
                p.text('Distance (Mpc) →', hdX + hdW / 2, hdY + hdH + 1);
                p.push(); p.translate(hdX + 2, hdY + hdH * 0.5); p.rotate(-Math.PI / 2);
                p.textAlign(p.CENTER, p.BOTTOM); p.text('Recession velocity (km/s)', 0, 0);
                p.pop();

                // ── Scale factor timeline ──
                const tfX = W * 0.02;
                const tfY = H * 0.79;
                const tfW = W * 0.94;
                const tfH = H * 0.10;
                p.stroke('#1e293b'); p.strokeWeight(1);
                p.fill('rgba(10,12,20,0.85)');
                p.rect(tfX, tfY, tfW, tfH, 4);
                p.fill('#94a3b8'); p.noStroke(); p.textSize(9); p.textAlign(p.LEFT, p.TOP);
                p.text('Scale factor a(t) — universe size over time', tfX + 4, tfY + 2);

                // Approximate ΛCDM a(t) curve
                p.stroke('#a78bfa'); p.strokeWeight(1.5); p.noFill();
                p.beginShape();
                for (let t = 0; t <= 1; t += 0.01) {
                    const tGyr = t * 20;
                    const aT = Math.pow(OmM / OmL, 1 / 3) * Math.pow(Math.sinh(1.5 * Math.sqrt(OmL) * tGyr / 14), 2 / 3);
                    const tx = tfX + t * tfW;
                    const ty = (tfY + tfH - 6) - p.constrain(p.map(aT, 0, 2.5, 0, tfH - 10), 0, tfH - 6);
                    p.vertex(tx, ty);
                }
                p.endShape();

                // Current time marker
                const nowX = tfX + p.map(cosmicTime % 20, 0, 20, 0, tfW);
                p.stroke('#fbbf24'); p.strokeWeight(1.5);
                p.line(nowX, tfY + 4, nowX, tfY + tfH - 4);
                p.fill('#fbbf24'); p.noStroke(); p.textSize(8); p.textAlign(p.CENTER, p.TOP);
                p.text('now', nowX, tfY + tfH - 12);

                // ── Annotations ──
                p.noStroke(); p.fill('#94a3b8'); p.textSize(10);
                p.textAlign(p.CENTER, p.TOP);
                p.text(`Cosmic Expansion — ΛCDM Model`, W * 0.5, 12);

                // ── Telemetry ──
                const maxV = hubbleFlow.length > 0 ? Math.max(...hubbleFlow.map(pt => pt.v)) : 0;
                ctx._telemetry = {
                    'Scale Factor a':  `${a.toFixed(3)}`,
                    'Recession Speed': `${maxV.toFixed(0)} km/s`,
                    'Redshift z':      `${redshift.toFixed(2)}`,
                    'Age of Universe': `${Math.min(cosmicTime, 99).toFixed(1)} Gyr`
                };
                ctx.updateTelemetry();

                p.fill('#94a3b8'); p.noStroke(); p.textAlign(p.LEFT, p.BOTTOM); p.textSize(10);
                p.text('Hubble flow: distant galaxies recede faster  •  Dark energy Ω_Λ accelerates expansion  •  CMB at z > 1000', 14, H - 10);
            };
        }
    });

    sim.mount();
    return sim;
};
