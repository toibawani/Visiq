// ===== VOLCANIC ERUPTION =====
// Magma chamber pressure, pyroclastic flow, lava effusion, and ash plume dynamics
// Volcanology: Volcanic Explosivity Index, effusive vs explosive eruption types

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'volcanic-eruption',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            magmaPressure: { value: 40, min: 5,  max: 100, step: 5, label: 'Magma Pressure',    unit: 'MPa' },
            silicaContent: { value: 55, min: 20, max: 90,  step: 5, label: 'Silica (SiO₂)',     unit: '%' },
            gasContent:    { value: 40, min: 5,  max: 90,  step: 5, label: 'Dissolved Gas',     unit: '%' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'VEI':           '2',
                'Eruption Type': 'Effusive',
                'Plume Height':  '0 km',
                'Lava Temp':     '1100°C'
            };
        },
        setup(p, ctx) {
            // Particles
            let ashParticles = [];
            let lavaParticles = [];
            let pyroclastics = [];
            let lavaBlobsLeft = [];
            let lavaBlobsRight = [];

            // Magma chamber fill level (0–1)
            let chamberFill = 0.5;
            let erupting = false;
            let eruptionPhase = 0;   // 0 = building, 1 = eruption
            let eruptionPower = 0;
            let plumeHeight = 0;
            let totalAsh = 0;

            function reset() {
                ashParticles = [];
                lavaParticles = [];
                pyroclastics = [];
                lavaBlobsLeft = [];
                lavaBlobsRight = [];
                chamberFill = 0.5;
                erupting = false;
                eruptionPhase = 0;
                eruptionPower = 0;
                plumeHeight = 0;
                totalAsh = 0;
            }

            ctx.onReset = reset;
            ctx.onResize = reset;

            p.draw = function() {
                p.background(7, 9, 15);
                const W = p.width;
                const H = p.height;
                const pressure = ctx.params.magmaPressure / 100;
                const silica = ctx.params.silicaContent / 100;
                const gas = ctx.params.gasContent / 100;

                // Explosive if high silica + high gas (viscous magma traps gas)
                const explosive = silica * gas;
                const effusive = (1 - silica) * (1 - gas * 0.5);
                const VEI = Math.round(explosive * 7 + pressure * 2);

                const volcX = W * 0.5;
                const volcBase = H * 0.88;
                const volcH = H * 0.40;
                const volcW = H * 0.28;

                // ── Sky gradient (darkens with ash) ──
                const ashAlpha = p.map(totalAsh, 0, 500, 0, 140);
                for (let y = 0; y < volcBase; y++) {
                    const t = y / volcBase;
                    const skyBase = p.lerpColor(p.color(15, 20, 45), p.color(40, 30, 20), t);
                    p.fill(skyBase);
                    p.rect(0, y, W, 1);
                }
                // Ash haze
                if (ashAlpha > 10) {
                    p.fill(60, 50, 40, ashAlpha);
                    p.rect(0, 0, W, volcBase);
                }

                // ── Ground ──
                p.noStroke();
                p.fill(38, 33, 28);
                p.rect(0, volcBase, W, H - volcBase);

                // ── Lava flows (ground level) ──
                for (const lb of lavaBlobsLeft) {
                    p.fill(p.lerpColor(p.color(240, 80, 10), p.color(60, 25, 10), lb.age / 120), 200);
                    p.noStroke();
                    p.ellipse(lb.x, volcBase + 6, lb.r * 2, lb.r * 0.6);
                }
                for (const lb of lavaBlobsRight) {
                    p.fill(p.lerpColor(p.color(240, 80, 10), p.color(60, 25, 10), lb.age / 120), 200);
                    p.noStroke();
                    p.ellipse(lb.x, volcBase + 6, lb.r * 2, lb.r * 0.6);
                }

                // ── Volcano cone ──
                // Outer rock
                p.fill(55, 45, 38);
                p.triangle(
                    volcX - volcW, volcBase,
                    volcX + volcW, volcBase,
                    volcX, volcBase - volcH
                );
                // Lava channel down flanks when erupting
                if (erupting && effusive > explosive * 0.5) {
                    p.stroke(200, 60, 10, 180);
                    p.strokeWeight(4);
                    p.line(volcX, volcBase - volcH + 8, volcX - volcW * 0.55, volcBase);
                    p.line(volcX, volcBase - volcH + 8, volcX + volcW * 0.55, volcBase);
                }

                // Crater rim
                p.fill(44, 36, 30);
                p.noStroke();
                p.ellipse(volcX, volcBase - volcH + 2, volcW * 0.32, 16);

                // ── Magma chamber (underground) ──
                const chX = volcX;
                const chY = volcBase + 80;
                const chW = 110;
                const chH = 55;
                // Rock around chamber
                p.fill(30, 25, 20);
                p.ellipse(chX, chY, chW + 30, chH + 20);
                // Molten fill
                const fillH = chamberFill * chH;
                p.fill(200, 60, 10, 200);
                p.ellipse(chX, chY + (chH - fillH) / 2, chW, fillH);
                p.fill(240, 120, 30, 120);
                p.ellipse(chX, chY - chH * 0.1, chW * 0.8, chH * 0.25);
                // Conduit connecting chamber to crater
                p.fill(180, 50, 10, erupting ? 200 : 80);
                p.rect(volcX - 8, chY - chH / 2, 16, volcBase - chY + chH / 2 - volcH + 18);

                // Chamber pressure indicator
                p.stroke(pressure > 0.6 ? '#f87171' : '#94a3b8');
                p.strokeWeight(1.5);
                p.noFill();
                p.arc(chX + chW * 0.5 + 8, chY, 24, 24, -Math.PI, 0);
                const needleAng = -Math.PI + pressure * Math.PI;
                p.stroke(pressure > 0.7 ? '#f87171' : '#fbbf24');
                p.line(chX + chW * 0.5 + 8, chY, chX + chW * 0.5 + 8 + Math.cos(needleAng) * 10, chY + Math.sin(needleAng) * 10);
                p.fill('#94a3b8'); p.noStroke(); p.textSize(8); p.textAlign(p.CENTER, p.CENTER);
                p.text('P', chX + chW * 0.5 + 8, chY + 14);

                // ── Simulate ──
                if (ctx.isPlaying) {
                    // Chamber fills with incoming magma
                    chamberFill = Math.min(1, chamberFill + pressure * 0.001 * ctx.speed);

                    if (!erupting && (chamberFill > 0.85 || pressure > 0.72)) {
                        erupting = true;
                        eruptionPhase = 1;
                    }

                    if (erupting) {
                        eruptionPower = Math.min(1, eruptionPower + 0.02 * ctx.speed);
                        chamberFill = Math.max(0.1, chamberFill - eruptionPower * 0.006 * ctx.speed);
                        plumeHeight = Math.min(H * 0.75, plumeHeight + eruptionPower * pressure * 3.5 * ctx.speed);

                        // Spawn ash + pyroclastics
                        if (explosive > 0.3) {
                            const numAsh = Math.floor(explosive * eruptionPower * 5 * ctx.speed);
                            for (let i = 0; i < numAsh; i++) {
                                ashParticles.push({
                                    x: volcX + (Math.random() - 0.5) * 20,
                                    y: volcBase - volcH,
                                    vx: (Math.random() - 0.5) * (2 + explosive * 3),
                                    vy: -(3 + Math.random() * eruptionPower * 8 * pressure),
                                    r: 2 + Math.random() * 4 * explosive,
                                    life: 1.0,
                                    color: Math.random() < 0.5 ? 'ash' : 'cinder'
                                });
                                totalAsh++;
                            }

                            // Pyroclastic flows when very explosive
                            if (explosive > 0.5 && Math.random() < explosive * 0.02 * ctx.speed) {
                                pyroclastics.push({
                                    x: volcX + (Math.random() < 0.5 ? -5 : 5),
                                    y: volcBase - volcH + 20,
                                    vx: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 4),
                                    vy: 0, r: 12, life: 1.0
                                });
                            }
                        }

                        // Lava effusion (low-silica)
                        if (effusive > 0.2 && Math.random() < effusive * 0.12 * ctx.speed) {
                            lavaParticles.push({
                                x: volcX + (Math.random() - 0.5) * 18,
                                y: volcBase - volcH,
                                vx: (Math.random() - 0.5) * 1.5,
                                vy: -(1 + Math.random() * 2),
                                r: 4 + Math.random() * 5,
                                life: 1.0
                            });
                        }

                        if (chamberFill < 0.2) {
                            erupting = false;
                            eruptionPower = 0;
                            plumeHeight = Math.max(0, plumeHeight - 2);
                        }
                    } else {
                        plumeHeight = Math.max(0, plumeHeight - 1.5 * ctx.speed);
                        eruptionPower = Math.max(0, eruptionPower - 0.01);
                    }

                    totalAsh = Math.max(0, totalAsh - 0.5);

                    // Update particles
                    for (let i = ashParticles.length - 1; i >= 0; i--) {
                        const a = ashParticles[i];
                        a.x += a.vx * ctx.speed;
                        a.y += a.vy * ctx.speed;
                        a.vy += 0.04 * ctx.speed;  // gravity
                        a.vx += (Math.random() - 0.5) * 0.1; // turbulence
                        a.life -= 0.008 * ctx.speed;
                        if (a.life <= 0) ashParticles.splice(i, 1);
                    }

                    for (let i = lavaParticles.length - 1; i >= 0; i--) {
                        const lv = lavaParticles[i];
                        lv.x += lv.vx * ctx.speed;
                        lv.y += lv.vy * ctx.speed;
                        lv.vy += 0.12 * ctx.speed;
                        lv.life -= 0.006 * ctx.speed;
                        if (lv.y > volcBase) {
                            // Deposit on flank
                            const side = lv.x < volcX ? lavaBlobsLeft : lavaBlobsRight;
                            side.push({ x: lv.x, r: lv.r * 1.5, age: 0 });
                            lavaParticles.splice(i, 1);
                        } else if (lv.life <= 0) {
                            lavaParticles.splice(i, 1);
                        }
                    }

                    // Age lava blobs (cool and darken)
                    for (const lb of [...lavaBlobsLeft, ...lavaBlobsRight]) lb.age += ctx.speed;
                    lavaBlobsLeft = lavaBlobsLeft.filter(lb => lb.age < 300);
                    lavaBlobsRight = lavaBlobsRight.filter(lb => lb.age < 300);

                    for (let i = pyroclastics.length - 1; i >= 0; i--) {
                        const py = pyroclastics[i];
                        py.x += py.vx * ctx.speed;
                        py.y += py.vy * ctx.speed;
                        py.vy += 0.3 * ctx.speed;
                        py.vx *= 0.99;
                        py.r += 0.5;
                        py.life -= 0.008 * ctx.speed;
                        if (py.life <= 0 || py.y > volcBase + 20) pyroclastics.splice(i, 1);
                    }
                }

                // ── Draw eruption plume ──
                if (plumeHeight > 5) {
                    const plumeY = volcBase - volcH - plumeHeight;
                    for (let j = 0; j < 5; j++) {
                        const pAlpha = p.map(j, 0, 4, 160, 20);
                        const pW = p.map(j, 0, 4, volcW * 0.2, plumeHeight * 0.45);
                        const pY = volcBase - volcH - plumeHeight * (j / 4);
                        p.noStroke();
                        p.fill(80, 70, 65, pAlpha);
                        p.ellipse(volcX, pY, pW, plumeHeight * 0.15 + j * 20);
                    }
                }

                // ── Draw ash particles ──
                p.noStroke();
                for (const a of ashParticles) {
                    const alpha = a.life * 200;
                    if (a.color === 'ash') {
                        p.fill(100, 90, 80, alpha);
                    } else {
                        p.fill(200, 80, 20, alpha);
                    }
                    p.circle(a.x, a.y, a.r * 2);
                }

                // ── Draw lava particles ──
                for (const lv of lavaParticles) {
                    const alpha = lv.life * 220;
                    p.fill(240, 100 + lv.life * 60, 10, alpha);
                    p.noStroke();
                    p.circle(lv.x, lv.y, lv.r * 2);
                }

                // ── Draw pyroclastic flows ──
                for (const py of pyroclastics) {
                    p.fill(180, 100, 30, py.life * 200);
                    p.noStroke();
                    p.ellipse(py.x, py.y, py.r * 2.5, py.r);
                }

                // ── Status label ──
                const eruptTypeLabel = explosive > effusive ? 'Explosive (Plinian)' : 'Effusive (Hawaiian)';
                const lavoTemp = Math.round(900 + (1 - silica) * 300);

                p.fill(erupting ? '#fbbf24' : '#94a3b8');
                p.noStroke(); p.textSize(11); p.textAlign(p.CENTER, p.TOP);
                p.text(erupting ? `⚡ ERUPTING — ${eruptTypeLabel}` : `Magma chamber filling… ${Math.round(chamberFill * 100)}% capacity`, volcX, 14);

                p.fill('#94a3b8'); p.textSize(9.5); p.textAlign(p.LEFT, p.BOTTOM);
                p.text(`High silica + high gas = explosive Plinian eruption  •  Low silica = effusive Hawaiian lava flow`, 14, H - 10);

                // ── Telemetry ──
                ctx._telemetry = {
                    'VEI':           `${Math.min(8, VEI)}`,
                    'Eruption Type': eruptTypeLabel.split(' ')[0],
                    'Plume Height':  `${(plumeHeight * 0.05).toFixed(1)} km`,
                    'Lava Temp':     `${lavoTemp}°C`
                };
                ctx.updateTelemetry();
            };
        }
    });

    sim.mount();
    return sim;
};
