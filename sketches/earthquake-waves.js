// ===== EARTHQUAKE WAVES =====
// P-waves (compressional) and S-waves (shear) propagate through layered Earth
// Seismology: refraction, reflection, shadow zone, seismograph readout

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'earthquake-waves',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            magnitude:  { value: 6.5, min: 4.0, max: 9.0, step: 0.1, label: 'Magnitude',        unit: 'Mw' },
            depth:      { value: 15,  min: 5,   max: 80,  step: 5,   label: 'Hypocenter Depth',  unit: 'km' },
            waveType:   { value: 0,   min: 0,   max: 1,   step: 1,   label: 'Show Waves',        unit: '0=both 1=P only' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Magnitude':    '6.5 Mw',
                'P-Wave Speed': '6.0 km/s',
                'S-Wave Speed': '3.5 km/s',
                'Time Elapsed': '0.0 s'
            };
        },
        setup(p, ctx) {
            // Wave rings: { cx, cy, rP, rS, alpha, born }
            let waves = [];
            let seismograph = [];         // amplitude over time for readout
            let elapsed = 0;             // seconds since last quake
            let autoTimer = 0;
            let particles = [];          // surface displacement particles
            let quakeX, quakeY;

            function triggerQuake(px, py) {
                quakeX = px;
                quakeY = py;
                elapsed = 0;
                waves = [{ cx: px, cy: py, rP: 0, rS: 0, alpha: 1 }];
                seismograph = [];
                particles = [];
            }

            function reset() {
                elapsed = 0;
                autoTimer = 0;
                waves = [];
                seismograph = [];
                particles = [];
                quakeX = 0; quakeY = 0;
            }

            ctx.onReset = reset;
            ctx.onResize = reset;

            // Click to trigger quake
            p.mouseClicked = function() {
                if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
                    triggerQuake(p.mouseX, p.mouseY);
                }
            };

            p.draw = function() {
                p.background(7, 9, 15);
                const W = p.width;
                const H = p.height;
                const mag = ctx.params.magnitude;
                const depthKm = ctx.params.depth;
                const onlyP = Math.round(ctx.params.waveType) === 1;

                // ── Earth cross-section (layered) ──
                // Crust (top), Upper mantle, Lower mantle, Outer core (liquid), Inner core
                const earthY = H * 0.12;
                const earthH = H * 0.72;

                // Inner core
                p.noStroke();
                p.fill(180, 100, 20);
                const icR = earthH * 0.13;
                p.circle(W * 0.5, earthY + earthH * 0.5, icR * 2);

                // Outer core (blocks S-waves)
                p.fill(210, 130, 30, 180);
                const ocR = earthH * 0.25;
                p.circle(W * 0.5, earthY + earthH * 0.5, ocR * 2);

                // Lower mantle
                p.fill(100, 60, 35);
                const lmR = earthH * 0.42;
                p.circle(W * 0.5, earthY + earthH * 0.5, lmR * 2);

                // Upper mantle
                p.fill(80, 55, 38);
                const umR = earthH * 0.48;
                p.circle(W * 0.5, earthY + earthH * 0.5, umR * 2);

                // Crust
                p.fill(65, 58, 50);
                p.arc(W * 0.5, earthY + earthH * 0.5, earthH * 2, earthH * 2, Math.PI, Math.PI * 2);
                p.arc(W * 0.5, earthY + earthH * 0.5, earthH * 2, earthH * 2, 0, Math.PI);
                // Crust thinner highlight
                p.stroke(90, 75, 62);
                p.strokeWeight(4);
                p.noFill();
                p.arc(W * 0.5, earthY + earthH * 0.5, earthH * 0.98, earthH * 0.98, 0, Math.PI * 2);

                // Layer labels
                p.noStroke();
                p.fill('#94a3b860'); p.textSize(9); p.textAlign(p.CENTER, p.CENTER);
                p.text('Inner Core', W * 0.5, earthY + earthH * 0.5);
                p.text('Outer Core', W * 0.5, earthY + earthH * 0.5 - ocR * 0.6);
                p.text('Mantle', W * 0.5, earthY + earthH * 0.5 - lmR * 0.8);
                p.text('Crust', W * 0.5, earthY + 16);

                // ── Epicenter marker ──
                if (waves.length > 0 || autoTimer > 0) {
                    p.stroke('#fbbf24');
                    p.strokeWeight(2);
                    p.noFill();
                    p.line(quakeX - 8, quakeY, quakeX + 8, quakeY);
                    p.line(quakeX, quakeY - 8, quakeX, quakeY + 8);
                    p.fill('#fbbf24'); p.noStroke(); p.textSize(10); p.textAlign(p.LEFT, p.CENTER);
                    p.text(`Mw ${mag.toFixed(1)}  depth ${depthKm}km`, quakeX + 10, quakeY);
                }

                // ── Auto-trigger if idle ──
                if (ctx.isPlaying) {
                    elapsed += ctx.speed / 60;
                    autoTimer += ctx.speed;
                    if (autoTimer > 220 || waves.length === 0) {
                        autoTimer = 0;
                        const qx = W * 0.3 + Math.random() * W * 0.4;
                        const qy = earthY + H * 0.04;
                        triggerQuake(qx, qy);
                    }
                }

                // ── Wave propagation ──
                const pSpeed = p.map(depthKm, 5, 80, 2.4, 3.6);   // pixel/frame, scales with depth
                const sSpeed = pSpeed * 0.58;
                const maxR = earthH * 0.88;

                if (ctx.isPlaying) {
                    for (const w of waves) {
                        w.rP += pSpeed * ctx.speed;
                        if (!onlyP) w.rS += sSpeed * ctx.speed;
                        w.alpha = Math.max(0, 1 - w.rP / (maxR * 1.2));
                    }
                    waves = waves.filter(w => w.alpha > 0);

                    // Surface displacement particles from P-wave surface arrival
                    for (const w of waves) {
                        if (w.rP > earthH * 0.45 && Math.random() < 0.15 * ctx.speed) {
                            const ang = -Math.PI + Math.random() * Math.PI;
                            particles.push({
                                x: quakeX + Math.cos(ang) * w.rP,
                                y: quakeY + Math.sin(ang) * w.rP,
                                vx: Math.cos(ang) * (mag - 4) * 0.5,
                                vy: Math.sin(ang) * (mag - 4) * 0.5 - 1,
                                life: 30
                            });
                        }
                    }

                    for (let i = particles.length - 1; i >= 0; i--) {
                        const pp = particles[i];
                        pp.x += pp.vx * ctx.speed;
                        pp.y += pp.vy * ctx.speed;
                        pp.vy += 0.1;
                        pp.life -= ctx.speed;
                        if (pp.life <= 0) particles.splice(i, 1);
                    }

                    // Seismograph: sample P-wave amplitude at a station
                    const stationDist = W * 0.72;
                    for (const w of waves) {
                        const diff = Math.abs(w.rP - stationDist);
                        if (diff < pSpeed * 4) {
                            const amp = (mag - 3) * 8 * (1 - w.rP / maxR) * Math.sin(p.frameCount * 0.4);
                            seismograph.push(amp);
                        } else {
                            seismograph.push(0);
                        }
                    }
                    if (seismograph.length > 160) seismograph.shift();
                }

                // ── Draw wave rings ──
                for (const w of waves) {
                    // P-wave (compressional) — blue/white
                    p.noFill();
                    p.stroke(120, 180, 255, w.alpha * 200);
                    p.strokeWeight(2.5);
                    p.circle(w.cx, w.cy, w.rP * 2);

                    // S-wave (shear) — orange, doesn't pass through liquid core
                    if (!onlyP) {
                        // S-wave blocked by outer core
                        const distToCore = p.dist(w.cx, w.cy, W * 0.5, earthY + earthH * 0.5);
                        if (w.rS < ocR + distToCore * 0.6) {
                            p.stroke(255, 140, 60, w.alpha * 200);
                            p.strokeWeight(2);
                            p.circle(w.cx, w.cy, w.rS * 2);
                        }
                    }
                }

                // ── Draw particles ──
                p.noStroke();
                for (const pp of particles) {
                    p.fill(255, 200, 60, p.map(pp.life, 0, 30, 0, 180));
                    p.circle(pp.x, pp.y, 3);
                }

                // ── Seismograph panel ──
                const sgX = 12;
                const sgY = H * 0.86;
                const sgW = W - 24;
                const sgH = H * 0.10;
                p.stroke('#283150');
                p.strokeWeight(1);
                p.fill('rgba(10,12,20,0.8)');
                p.rect(sgX, sgY, sgW, sgH, 4);
                p.fill('#94a3b8'); p.noStroke(); p.textSize(9); p.textAlign(p.LEFT, p.TOP);
                p.text('Seismograph — Station', sgX + 4, sgY + 2);

                if (seismograph.length > 1) {
                    p.stroke('#60a5fa');
                    p.strokeWeight(1.5);
                    p.noFill();
                    p.beginShape();
                    for (let i = 0; i < seismograph.length; i++) {
                        const sx = sgX + (i / 160) * sgW;
                        const sy = sgY + sgH / 2 + seismograph[i];
                        p.vertex(sx, sy);
                    }
                    p.endShape();
                }

                // ── Legend ──
                p.noStroke(); p.textSize(10); p.textAlign(p.LEFT, p.TOP);
                p.fill(120, 180, 255); p.text('— P-wave (compressional)', sgX, sgY - 30);
                if (!onlyP) { p.fill(255, 140, 60); p.text('— S-wave (shear, blocked by liquid outer core)', sgX + 170, sgY - 30); }

                p.fill('#94a3b8'); p.textAlign(p.CENTER, p.TOP); p.textSize(11);
                p.text('Click anywhere inside Earth to trigger a quake', W * 0.5, 14);

                // ── Telemetry ──
                ctx._telemetry = {
                    'Magnitude':    `${mag.toFixed(1)} Mw`,
                    'P-Wave Speed': `${(pSpeed * 1.8).toFixed(1)} km/s`,
                    'S-Wave Speed': `${(sSpeed * 1.8).toFixed(1)} km/s`,
                    'Time Elapsed': `${elapsed.toFixed(1)} s`
                };
                ctx.updateTelemetry();
            };
        }
    });

    sim.mount();
    return sim;
};
