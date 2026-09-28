// ===== EROSION & WEATHERING =====
// Particle-based landscape erosion: hydraulic (rain), thermal (freeze-thaw), aeolian (wind)
// Geology: mass wasting, sediment transport, talus formation, river incision

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'erosion-weathering',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            rainfall:     { value: 50, min: 0, max: 100, step: 5,  label: 'Rainfall Intensity', unit: '%' },
            windSpeed:    { value: 30, min: 0, max: 100, step: 5,  label: 'Wind Speed',          unit: 'km/h' },
            rockHardness: { value: 60, min: 10, max: 100, step: 5, label: 'Rock Hardness',       unit: '%' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Material Removed':  '0 m³',
                'Erosion Rate':      '0 mm/yr',
                'River Discharge':   '0 m³/s',
                'Weathering Type':   'Hydraulic'
            };
        },
        setup(p, ctx) {
            const COLS = 200;
            let terrain = [];       // height values 0–1 (1 = tallest peak)
            let sediment = [];      // deposited sediment per column
            let drops = [];         // active raindrop particles
            let grains = [];        // airborne sediment grains
            let totalRemoved = 0;
            let erosionRate = 0;
            let discharge = 0;

            function buildTerrain() {
                terrain = [];
                sediment = [];
                drops = [];
                grains = [];
                totalRemoved = 0;
                erosionRate = 0;
                discharge = 0;

                // Fractal ridge via midpoint displacement
                const n = COLS;
                terrain[0] = 0.3 + Math.random() * 0.2;
                terrain[n - 1] = 0.3 + Math.random() * 0.2;

                function subdivide(lo, hi, rough) {
                    if (hi - lo < 2) return;
                    const mid = Math.floor((lo + hi) / 2);
                    terrain[mid] = ((terrain[lo] + terrain[hi]) / 2) + (Math.random() - 0.5) * rough;
                    terrain[mid] = p.constrain(terrain[mid], 0.05, 1.0);
                    subdivide(lo, mid, rough * 0.6);
                    subdivide(mid, hi, rough * 0.6);
                }
                subdivide(0, n - 1, 0.7);

                // Add central mountain
                for (let i = 0; i < n; i++) {
                    const t = i / (n - 1);
                    terrain[i] = Math.max(terrain[i], Math.exp(-Math.pow((t - 0.5) * 4, 2)) * 0.85);
                }

                for (let i = 0; i < n; i++) sediment[i] = 0;
            }

            buildTerrain();
            ctx.onReset = buildTerrain;
            ctx.onResize = buildTerrain;

            function spawnDrop() {
                const col = Math.floor(Math.random() * COLS);
                drops.push({ col, vy: 0, y: 0 });
            }

            function spawnGrain(col) {
                grains.push({
                    x: col / COLS * p.width,
                    y: getTerrainY(col),
                    vx: (Math.random() - 0.4) * 3,
                    vy: -Math.random() * 2,
                    life: 60 + Math.random() * 40
                });
            }

            function getTerrainY(col) {
                const floorY = p.height * 0.88;
                const peakH = p.height * 0.65;
                return floorY - terrain[p.constrain(Math.floor(col), 0, COLS - 1)] * peakH;
            }

            p.draw = function() {
                p.background(7, 9, 15);

                const W = p.width;
                const H = p.height;
                const colW = W / COLS;
                const floorY = H * 0.88;
                const peakH = H * 0.65;
                const hardness = ctx.params.rockHardness / 100;
                const rainInt = ctx.params.rainfall / 100;
                const wind = ctx.params.windSpeed / 100;

                // ── Sky & atmosphere ──
                p.noStroke();
                for (let y = 0; y < floorY; y++) {
                    const t = y / floorY;
                    p.fill(p.lerpColor(p.color(20, 30, 55), p.color(7, 9, 15), t));
                    p.rect(0, y, W, 1);
                }

                // ── Simulate erosion ──
                if (ctx.isPlaying) {
                    const erosionSample = 0;
                    // Spawn raindrops
                    if (Math.random() < rainInt * 0.5 * ctx.speed) spawnDrop();
                    // Spawn wind grains
                    if (wind > 0.3 && Math.random() < wind * 0.04 * ctx.speed) {
                        const wCol = Math.floor(Math.random() * COLS);
                        if (terrain[wCol] > 0.05) {
                            const removal = wind * 0.0004 * (1 - hardness) * ctx.speed;
                            terrain[wCol] = Math.max(0.04, terrain[wCol] - removal);
                            totalRemoved += removal * 0.5;
                            if (wCol < COLS - 1) sediment[wCol + 1] += removal * 0.4;
                            spawnGrain(wCol);
                        }
                    }

                    // Process raindrops
                    for (let i = drops.length - 1; i >= 0; i--) {
                        const d = drops[i];
                        const terrY = getTerrainY(d.col);
                        d.y += 6 * ctx.speed;

                        if (d.y >= terrY - floorY + floorY) {
                            // Impact: erode, flow downhill
                            const erosion = rainInt * 0.002 * (1 - hardness * 0.8) * ctx.speed;
                            if (terrain[d.col] > 0.04) {
                                terrain[d.col] = Math.max(0.04, terrain[d.col] - erosion);
                                totalRemoved += erosion;
                            }
                            // Flow to lower neighbor
                            const leftH = d.col > 0 ? terrain[d.col - 1] : 1;
                            const rightH = d.col < COLS - 1 ? terrain[d.col + 1] : 1;
                            if (leftH < terrain[d.col]) {
                                sediment[d.col - 1] += erosion * 0.3;
                            } else if (rightH < terrain[d.col]) {
                                sediment[d.col + 1] += erosion * 0.3;
                            } else {
                                sediment[d.col] += erosion * 0.5;
                            }
                            discharge += erosion * 5;
                            drops.splice(i, 1);
                        }
                    }

                    // Apply sediment deposition
                    for (let i = 0; i < COLS; i++) {
                        if (sediment[i] > 0.001) {
                            terrain[i] += sediment[i] * 0.1;
                            sediment[i] *= 0.9;
                        }
                    }

                    // Thermal: smooth steep gradients
                    if (p.frameCount % 3 === 0) {
                        for (let i = 1; i < COLS - 1; i++) {
                            const diff = terrain[i] - Math.min(terrain[i - 1], terrain[i + 1]);
                            if (diff > 0.035 * (1 - hardness * 0.6)) {
                                const slide = diff * 0.04 * ctx.speed;
                                terrain[i] -= slide;
                                if (terrain[i - 1] < terrain[i + 1]) {
                                    terrain[i - 1] += slide;
                                } else {
                                    terrain[i + 1] += slide;
                                }
                            }
                        }
                    }

                    erosionRate = totalRemoved * 0.12;
                    discharge = Math.max(0, discharge * 0.95);
                }

                // ── Draw terrain ──
                // Rock fill (gradient from granite to basalt based on height)
                for (let i = 0; i < COLS - 1; i++) {
                    const x = i * colW;
                    const y1 = floorY - terrain[i] * peakH;
                    const y2 = floorY - terrain[i + 1] * peakH;
                    const h = terrain[i];
                    // Color: snow cap, rock, talus, sediment floor
                    let col;
                    if (h > 0.75) col = p.color(220, 225, 235);           // snow/ice
                    else if (h > 0.5) col = p.color(100, 90, 80);         // grey rock
                    else if (h > 0.2) col = p.color(80, 65, 50);          // brown rock
                    else col = p.color(55, 50, 40);                        // dark talus
                    p.fill(col);
                    p.noStroke();
                    p.beginShape();
                    p.vertex(x, y1);
                    p.vertex(x + colW, y2);
                    p.vertex(x + colW, floorY);
                    p.vertex(x, floorY);
                    p.endShape(p.CLOSE);
                }

                // Sediment overlay (tan/sandy)
                for (let i = 0; i < COLS; i++) {
                    if (sediment[i] > 0.002) {
                        const x = i * colW;
                        const terrY = floorY - terrain[i] * peakH;
                        const sedH = sediment[i] * peakH * 5;
                        p.fill(170, 140, 100, 200);
                        p.noStroke();
                        p.rect(x, terrY - sedH, colW, sedH + 2);
                    }
                }

                // River channel (lowest point flows)
                let riverCol = 0;
                for (let i = 1; i < COLS; i++) {
                    if (terrain[i] < terrain[riverCol]) riverCol = i;
                }
                p.fill(30, 80, 160, 160);
                p.noStroke();
                const rx = riverCol * colW;
                const ry = floorY - terrain[riverCol] * peakH;
                p.rect(rx - colW, ry, colW * 2, floorY - ry);

                // ── Draw raindrops ──
                p.stroke('#60a5fa80');
                p.strokeWeight(1.5);
                for (const d of drops) {
                    const dx = d.col * colW + colW / 2;
                    p.line(dx, d.y - 6, dx, d.y);
                }

                // ── Draw wind grains ──
                p.noStroke();
                for (let i = grains.length - 1; i >= 0; i--) {
                    const g = grains[i];
                    g.x += g.vx * ctx.speed + wind * 2.5 * ctx.speed;
                    g.y += g.vy * ctx.speed;
                    g.vy += 0.08 * ctx.speed;
                    g.life -= ctx.speed;
                    const alpha = p.map(g.life, 0, 60, 0, 200);
                    p.fill(180, 150, 100, alpha);
                    p.circle(g.x, g.y, 2.5);
                    if (g.life <= 0 || g.x < 0 || g.x > W) grains.splice(i, 1);
                }

                // ── Valley floor / alluvial fan ──
                p.fill(90, 75, 55);
                p.noStroke();
                p.rect(0, floorY, W, H - floorY);

                // ── Annotations ──
                p.fill('#94a3b8'); p.noStroke();
                p.textAlign(p.LEFT, p.TOP); p.textSize(11);
                p.text('Erosion & Weathering', 14, 12);
                p.textAlign(p.CENTER, p.TOP);
                if (rainInt > 0.3) p.text('▼ rain', W * 0.5, 30);
                if (wind > 0.4) p.text(`→ wind ${ctx.params.windSpeed} km/h`, W * 0.75, 30);

                // ── Telemetry ──
                const wType = wind > rainInt ? 'Aeolian' : rainInt > 0.5 ? 'Hydraulic' : 'Thermal';
                ctx._telemetry = {
                    'Material Removed': `${(totalRemoved * 800).toFixed(0)} m³`,
                    'Erosion Rate':     `${erosionRate.toFixed(2)} mm/yr`,
                    'River Discharge':  `${discharge.toFixed(1)} m³/s`,
                    'Weathering Type':  wType
                };
                ctx.updateTelemetry();

                p.fill('#94a3b8'); p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM); p.textSize(11);
                p.text('White = snow  •  Grey = bedrock  •  Brown = talus  •  Tan = sediment  •  Blue channel = river', 14, H - 10);
            };
        }
    });

    sim.mount();
    return sim;
};
