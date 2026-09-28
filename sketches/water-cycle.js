// ===== WATER CYCLE =====
// Evaporation → condensation → precipitation → runoff → groundwater → ocean
// Hydrology: latent heat, adiabatic lapse rate, transpiration, infiltration

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'water-cycle',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            solarIntensity: { value: 70, min: 10, max: 100, step: 5, label: 'Solar Intensity',    unit: '%' },
            humidity:       { value: 55, min: 10, max: 100, step: 5, label: 'Atmospheric Humidity', unit: '%' },
            temperature:    { value: 25, min: -10, max: 45, step: 1, label: 'Surface Temperature', unit: '°C' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Evaporation':    '0 mm/day',
                'Precipitation':  '0 mm/day',
                'Cloud Cover':    '0%',
                'Groundwater':    '0%'
            };
        },
        setup(p, ctx) {
            // Particles for each stage
            let vaporParticles = [];   // rising water vapor
            let droplets = [];         // cloud droplets
            let rainParticles = [];    // falling rain
            let runoffParticles = [];  // surface runoff
            let groundwater = 0;       // 0–1 fill level

            // Cloud state
            let cloudMass = 0;         // 0–1
            let evapRate = 0;
            let precipRate = 0;

            // Terrain shape (fixed for this sim)
            const terrainPts = [
                [0, 0.82], [0.1, 0.78], [0.18, 0.72], [0.3, 0.60],
                [0.38, 0.55], [0.5, 0.58], [0.6, 0.75], [0.72, 0.80],
                [0.85, 0.82], [1.0, 0.80]
            ];

            function getTerrainY(xFrac, W, H) {
                for (let i = 0; i < terrainPts.length - 1; i++) {
                    if (xFrac >= terrainPts[i][0] && xFrac <= terrainPts[i + 1][0]) {
                        const t = (xFrac - terrainPts[i][0]) / (terrainPts[i + 1][0] - terrainPts[i][0]);
                        return (terrainPts[i][1] + t * (terrainPts[i + 1][1] - terrainPts[i][1])) * H;
                    }
                }
                return H * 0.82;
            }

            function reset() {
                vaporParticles = [];
                droplets = [];
                rainParticles = [];
                runoffParticles = [];
                cloudMass = 0;
                groundwater = 0.3;
                evapRate = 0;
                precipRate = 0;
            }

            reset();
            ctx.onReset = reset;
            ctx.onResize = reset;

            p.draw = function() {
                const W = p.width;
                const H = p.height;
                const solar = ctx.params.solarIntensity / 100;
                const hum = ctx.params.humidity / 100;
                const temp = ctx.params.temperature;

                // ── Background sky ──
                p.noStroke();
                const skyTop = p.lerpColor(p.color(15, 25, 55), p.color(90, 140, 210), solar * 0.8);
                const skyBot = p.lerpColor(p.color(30, 50, 90), p.color(160, 200, 240), solar * 0.7);
                for (let y = 0; y < H * 0.78; y++) {
                    const t = y / (H * 0.78);
                    p.fill(p.lerpColor(skyTop, skyBot, t));
                    p.rect(0, y, W, 1);
                }

                // ── Sun ──
                const sunX = W * 0.85;
                const sunY = H * 0.10;
                if (solar > 0.3) {
                    // Glow
                    for (let r = 5; r > 0; r--) {
                        p.fill(255, 200, 60, solar * 25 * r);
                        p.circle(sunX, sunY, 30 + r * 10);
                    }
                    p.fill(255, 220, 80);
                    p.circle(sunX, sunY, 28);
                    // Rays
                    p.stroke(255, 200, 60, 100);
                    p.strokeWeight(1.5);
                    for (let a = 0; a < 8; a++) {
                        const ang = (a / 8) * Math.PI * 2 + p.frameCount * 0.005;
                        p.line(sunX + Math.cos(ang) * 18, sunY + Math.sin(ang) * 18,
                               sunX + Math.cos(ang) * 30, sunY + Math.sin(ang) * 30);
                    }
                }

                // ── Terrain ──
                p.noStroke();
                p.fill(60, 90, 45);
                p.beginShape();
                for (let x = 0; x <= W; x += 4) {
                    p.vertex(x, getTerrainY(x / W, W, H));
                }
                p.vertex(W, H);
                p.vertex(0, H);
                p.endShape(p.CLOSE);

                // Mountain snow cap
                p.fill(220, 225, 235);
                p.beginShape();
                for (let x = W * 0.22; x <= W * 0.48; x += 4) {
                    const ty = getTerrainY(x / W, W, H);
                    if (ty < H * 0.63) p.vertex(x, ty);
                }
                p.vertex(W * 0.38, getTerrainY(0.38, W, H));
                p.endShape(p.CLOSE);

                // ── Ocean ──
                const oceanX = W * 0.72;
                const oceanY = getTerrainY(0.85, W, H);
                p.fill(20, 60, 120, 220);
                p.noStroke();
                p.rect(oceanX, oceanY - 10, W - oceanX, H - oceanY + 10);
                // Ocean waves
                p.stroke(80, 150, 200, 100);
                p.strokeWeight(1.5);
                p.noFill();
                for (let w = 0; w < 3; w++) {
                    p.beginShape();
                    for (let x = oceanX; x < W; x += 8) {
                        const wy = oceanY - 10 + Math.sin((x * 0.05 + p.frameCount * 0.04 + w)) * 3;
                        p.vertex(x, wy);
                    }
                    p.endShape();
                }

                // ── Groundwater aquifer ──
                const gwH = groundwater * 25;
                p.fill(40, 90, 160, 100);
                p.noStroke();
                p.rect(0, H - gwH - 5, W * 0.68, gwH);
                if (groundwater > 0.05) {
                    p.fill(60, 120, 200, 80);
                    p.ellipse(W * 0.12, H - gwH - 2, 30, 8);
                    p.ellipse(W * 0.35, H - gwH - 2, 20, 6);
                }

                // ── Simulate ──
                if (ctx.isPlaying) {
                    // Evaporation: ocean + transpiration from vegetation
                    evapRate = solar * (temp + 10) * 0.004 * ctx.speed;
                    if (Math.random() < evapRate) {
                        const ox = oceanX + Math.random() * (W - oceanX);
                        vaporParticles.push({ x: ox, y: oceanY, vx: (Math.random() - 0.5) * 0.8, vy: -(0.6 + Math.random() * 0.8), alpha: 200 });
                    }
                    // Transpiration from forest
                    if (solar > 0.3 && Math.random() < solar * 0.04 * ctx.speed) {
                        const tx = W * (0.05 + Math.random() * 0.5);
                        const ty = getTerrainY(tx / W, W, H) - 5;
                        vaporParticles.push({ x: tx, y: ty, vx: (Math.random() - 0.5) * 0.5, vy: -(0.4 + Math.random() * 0.6), alpha: 150 });
                    }

                    // Move vapor upward
                    for (let i = vaporParticles.length - 1; i >= 0; i--) {
                        const v = vaporParticles[i];
                        v.x += v.vx * ctx.speed;
                        v.y += v.vy * ctx.speed;
                        v.alpha -= 1.5 * ctx.speed;
                        if (v.y < H * 0.25 || v.alpha <= 0) {
                            // Condense into cloud
                            cloudMass = Math.min(1, cloudMass + 0.003);
                            vaporParticles.splice(i, 1);
                        }
                    }

                    // Cloud droplets form when cloud mass high enough
                    if (cloudMass > 0.15 && Math.random() < cloudMass * 0.3 * ctx.speed) {
                        const cx = W * 0.1 + Math.random() * W * 0.6;
                        const cy = H * 0.2 + Math.random() * H * 0.06;
                        droplets.push({ x: cx, y: cy, r: 1.5 + Math.random() * 2 });
                    }

                    // Cloud slowly dissipates
                    cloudMass = Math.max(0, cloudMass - 0.0005 * ctx.speed);

                    // Precipitation when cloud > threshold and humidity high
                    precipRate = 0;
                    if (cloudMass > 0.35 && hum > 0.45) {
                        precipRate = (cloudMass - 0.35) * hum * 0.06 * ctx.speed;
                        if (Math.random() < precipRate) {
                            const rx = W * 0.05 + Math.random() * W * 0.75;
                            const ry = H * 0.26 + Math.random() * H * 0.04;
                            rainParticles.push({ x: rx, y: ry, vy: 2 + Math.random() * 2 });
                            cloudMass = Math.max(0, cloudMass - 0.001);
                        }
                    }

                    // Move rain
                    for (let i = rainParticles.length - 1; i >= 0; i--) {
                        const r = rainParticles[i];
                        r.x += 0.4 * ctx.speed;
                        r.y += r.vy * ctx.speed;
                        const terrY = getTerrainY(r.x / W, W, H);
                        if (r.y >= terrY) {
                            // Hit ground: become runoff or infiltrate
                            if (Math.random() < 0.4) {
                                runoffParticles.push({ x: r.x, y: terrY, vx: 1.2, vy: 0, life: 80 });
                            } else {
                                groundwater = Math.min(1, groundwater + 0.002);
                            }
                            rainParticles.splice(i, 1);
                        } else if (r.y > H * 0.9) {
                            rainParticles.splice(i, 1);
                        }
                    }

                    // Runoff flows downhill to ocean
                    for (let i = runoffParticles.length - 1; i >= 0; i--) {
                        const r = runoffParticles[i];
                        r.x += r.vx * ctx.speed;
                        r.life -= ctx.speed;
                        const nextTerrY = getTerrainY((r.x + 1) / W, W, H);
                        const currTerrY = getTerrainY(r.x / W, W, H);
                        r.y = Math.min(currTerrY, r.y + 2);
                        if (r.x >= oceanX || r.life <= 0) {
                            runoffParticles.splice(i, 1);
                        }
                    }

                    // Groundwater seeps to ocean
                    groundwater = Math.max(0, groundwater - 0.0002 * ctx.speed);
                }

                // ── Draw cloud ──
                if (cloudMass > 0.05) {
                    const cloudAlpha = p.map(cloudMass, 0.05, 1, 30, 200);
                    p.noStroke();
                    // Cumulus puffs
                    for (let c = 0; c < 5; c++) {
                        const cxPos = W * (0.08 + c * 0.13 + Math.sin(p.frameCount * 0.003 + c) * 0.02);
                        const cyPos = H * 0.22;
                        const cr = p.map(cloudMass, 0, 1, 18, 55) * (0.7 + c * 0.1);
                        for (let j = 0; j < 3; j++) {
                            p.fill(220, 225, 235, cloudAlpha * (1 - j * 0.25));
                            p.ellipse(cxPos + j * cr * 0.4, cyPos - j * 5, cr * (1 + j * 0.2), cr * 0.65);
                        }
                    }
                }

                // Draw cloud droplets
                p.fill(180, 200, 230, 160);
                p.noStroke();
                for (const d of droplets) {
                    p.circle(d.x, d.y, d.r * 2);
                }
                // Cull old droplets
                while (droplets.length > 200) droplets.shift();

                // ── Draw vapor ──
                p.noStroke();
                for (const v of vaporParticles) {
                    p.fill(150, 200, 255, v.alpha * 0.5);
                    p.circle(v.x, v.y, 4);
                }

                // ── Draw rain ──
                p.stroke('#93c5fd90');
                p.strokeWeight(1.5);
                for (const r of rainParticles) {
                    p.line(r.x, r.y - 7, r.x + 0.5, r.y);
                }

                // ── Draw runoff ──
                p.stroke('#60a5fa');
                p.strokeWeight(2);
                for (const r of runoffParticles) {
                    p.point(r.x, r.y);
                }

                // ── Labels ──
                p.noStroke();
                p.fill('#94a3b8'); p.textSize(10);
                p.textAlign(p.CENTER, p.CENTER);
                if (evapRate > 0.01) {
                    p.text('Evaporation', W * 0.85, oceanY - 35);
                    p.text('↑', W * 0.85, oceanY - 22);
                }
                if (cloudMass > 0.15) {
                    p.text('Condensation', W * 0.35, H * 0.13);
                }
                if (precipRate > 0.005) {
                    p.text('Precipitation', W * 0.25, H * 0.16);
                    p.text('↓', W * 0.25, H * 0.19);
                }
                if (groundwater > 0.1) {
                    p.text('Groundwater', W * 0.2, H - 12);
                }

                // ── Telemetry ──
                ctx._telemetry = {
                    'Evaporation':   `${(evapRate * 250).toFixed(1)} mm/day`,
                    'Precipitation': `${(precipRate * 400).toFixed(1)} mm/day`,
                    'Cloud Cover':   `${Math.round(cloudMass * 100)}%`,
                    'Groundwater':   `${Math.round(groundwater * 100)}%`
                };
                ctx.updateTelemetry();

                p.fill('#94a3b8'); p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM); p.textSize(11);
                p.text('Vapor ↑ rises from ocean & plants  •  Condenses into cloud  •  Precipitates as rain  •  Returns as runoff & groundwater', 14, H - 10);
            };
        }
    });

    sim.mount();
    return sim;
};
