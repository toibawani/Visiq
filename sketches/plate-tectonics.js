// ===== PLATE TECTONICS =====
// Lithospheric plate motion, subduction, seafloor spreading, and mountain formation
// Geology: divergent, convergent, and transform boundaries; Wilson cycle

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'plate-tectonics',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            spreadRate:   { value: 1.0, min: 0.2, max: 3.0, step: 0.1, label: 'Spreading Rate', unit: 'cm/yr' },
            mantleTemp:   { value: 1300, min: 900, max: 1600, step: 50, label: 'Mantle Temperature', unit: '°C' },
            boundaryType: { value: 1, min: 0, max: 2, step: 1, label: 'Boundary Type', unit: '0=div 1=conv 2=trans' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Boundary Type': 'Convergent',
                'Plate Speed':   '1.0 cm/yr',
                'Crust Age':     '0 Myr',
                'Magma Temp':    '1300°C'
            };
        },
        setup(p, ctx) {
            // Plate state
            let offset = 0;           // cumulative drift in pixels
            let crustAge = 0;         // simulated Myr
            let quakeFlash = 0;       // frame counter for earthquake flash
            let volcanoErupt = 0;

            function reset() {
                offset = 0;
                crustAge = 0;
                quakeFlash = 0;
                volcanoErupt = 0;
            }
            ctx.onReset = reset;
            ctx.onResize = reset;

            // Helper: draw hatched rock fill
            function hatch(p, x, y, w, h, col, gap) {
                p.stroke(col);
                p.strokeWeight(1);
                for (let i = x; i < x + w; i += gap) {
                    p.line(i, y, i - h, y + h);
                }
            }

            p.draw = function() {
                p.background(7, 9, 15);

                const W = p.width;
                const H = p.height;
                const cx = W / 2;
                const mid = H * 0.52;   // ocean floor level
                const type = Math.round(ctx.params.boundaryType);
                const rate = ctx.params.spreadRate;

                if (ctx.isPlaying) {
                    offset += rate * ctx.speed * 0.18;
                    crustAge += rate * ctx.speed * 0.004; // Myr accumulate
                    if (type === 1) volcanoErupt += ctx.speed * 0.4;
                    if (type === 2 && p.frameCount % 90 === 0) quakeFlash = 18;
                    if (quakeFlash > 0) quakeFlash--;
                }

                // ── Background: mantle ──
                const mantleCol = p.lerpColor(
                    p.color(60, 20, 10),
                    p.color(200, 60, 10),
                    p.map(ctx.params.mantleTemp, 900, 1600, 0, 1)
                );
                p.noStroke();
                p.fill(mantleCol);
                p.rect(0, mid + 60, W, H - mid - 60);

                // ── Mantle convection cells ──
                p.noFill();
                p.strokeWeight(1.2);
                p.stroke(255, 120, 50, 80);
                for (let c = 0; c < 4; c++) {
                    const cx2 = (c + 0.5) * W / 4;
                    const top = mid + 65;
                    const bot = H - 18;
                    const ch = bot - top;
                    // left limb rises, right limb sinks
                    p.beginShape();
                    for (let t = 0; t <= 1; t += 0.05) {
                        const bx = cx2 - 30 + Math.sin(t * Math.PI) * 28;
                        const by = top + t * ch;
                        p.vertex(bx, by);
                    }
                    p.endShape();
                    p.beginShape();
                    for (let t = 0; t <= 1; t += 0.05) {
                        const bx = cx2 + 30 - Math.sin(t * Math.PI) * 28;
                        const by = bot - t * ch;
                        p.vertex(bx, by);
                    }
                    p.endShape();
                }

                // ── Left plate ──
                const leftEdge = type === 0 ? cx - 20 - offset : cx - 20 + offset * 0.5;
                p.noStroke();
                p.fill(80, 65, 55);
                p.rect(0, mid - 55, leftEdge, 60 + 55);
                // Ocean sediment layer
                p.fill(45, 55, 70);
                p.rect(0, mid - 10, leftEdge, 10);

                // ── Right plate ──
                const rightEdge = type === 0 ? cx + 20 + offset : cx + 20 - offset * 0.5;
                p.fill(80, 65, 55);
                p.rect(rightEdge, mid - 55, W - rightEdge, 60 + 55);
                p.fill(45, 55, 70);
                p.rect(rightEdge, mid - 10, W - rightEdge, 10);

                // ── Boundary-specific rendering ──
                if (type === 0) {
                    // DIVERGENT: rift valley, magma upwelling
                    const riftW = rightEdge - leftEdge;
                    // Ocean water fill
                    p.fill(20, 40, 80, 200);
                    p.rect(leftEdge, 0, riftW, mid - 10);
                    // Rift floor (fresh basalt)
                    p.fill(50, 45, 40);
                    p.rect(leftEdge, mid - 10, riftW, 15);
                    // Magma plume
                    const plumePulse = Math.sin(p.frameCount * 0.07) * 8;
                    for (let i = 0; i < 3; i++) {
                        const pw = riftW * 0.12 * (1 - i * 0.2);
                        const ph = 60 + i * 15 + plumePulse;
                        const palpha = 180 - i * 50;
                        p.fill(220, 80 + i * 30, 20, palpha);
                        p.ellipse(cx, mid + 50, pw, ph);
                    }
                    // Arrow labels
                    p.fill('#94a3b8'); p.noStroke(); p.textSize(11);
                    p.textAlign(p.RIGHT, p.CENTER);
                    p.text('← plate drifts', leftEdge - 6, mid - 35);
                    p.textAlign(p.LEFT, p.CENTER);
                    p.text('plate drifts →', rightEdge + 6, mid - 35);
                    p.textAlign(p.CENTER, p.TOP);
                    p.text('Divergent — seafloor spreading', cx, 14);
                    p.text('Mid-ocean ridge', cx, mid - 65);

                } else if (type === 1) {
                    // CONVERGENT: subduction (oceanic under continental)
                    // Right plate (continental) rises
                    p.fill(90, 75, 60);
                    p.beginShape();
                    p.vertex(cx - 60, mid - 55);
                    p.vertex(cx + 80, mid - 55);
                    p.vertex(cx + 80, mid - 100);
                    p.vertex(cx + 160, mid - 100);
                    p.vertex(cx + W * 0.4, mid - 55);
                    p.vertex(W, mid - 55);
                    p.vertex(W, mid + 50);
                    p.vertex(cx, mid + 50);
                    p.endShape(p.CLOSE);

                    // Subducting left plate dips under
                    p.fill(65, 55, 48);
                    p.beginShape();
                    p.vertex(0, mid - 55);
                    p.vertex(cx - 10, mid - 55);
                    p.vertex(cx + 60, mid + 80);
                    p.vertex(cx + 120, mid + 150);
                    p.vertex(0, mid + 150);
                    p.endShape(p.CLOSE);

                    // Trench water
                    p.fill(15, 30, 70, 220);
                    p.beginShape();
                    p.vertex(0, 0);
                    p.vertex(cx - 10, 0);
                    p.vertex(cx - 10, mid - 55);
                    p.vertex(cx - 50, mid - 55);
                    p.vertex(0, mid - 55);
                    p.endShape(p.CLOSE);

                    // Volcano (on continental side)
                    const vx = cx + 100;
                    const vBase = mid - 100;
                    p.fill(80, 70, 62);
                    p.triangle(vx - 28, vBase, vx + 28, vBase, vx, vBase - 72);
                    // Eruption plume
                    if (volcanoErupt > 0) {
                        const plPhase = (volcanoErupt % 80) / 80;
                        const plH = plPhase * 90;
                        p.noStroke();
                        for (let j = 0; j < 5; j++) {
                            const pAlpha = p.map(j, 0, 4, 200, 20);
                            p.fill(220, 100, 20, pAlpha);
                            p.ellipse(vx, vBase - 72 - plH * (j * 0.25 + 0.3), 8 + j * 6, 8 + j * 5);
                        }
                    }

                    if (quakeFlash > 0) {
                        p.fill(255, 200, 50, p.map(quakeFlash, 0, 18, 0, 120));
                        p.rect(0, 0, W, H);
                    }

                    p.fill('#94a3b8'); p.noStroke(); p.textSize(11);
                    p.textAlign(p.CENTER, p.TOP);
                    p.text('Convergent — subduction zone', cx, 14);
                    p.text('Trench', cx - 80, mid - 80);
                    p.text('Volcano', vx, vBase - 155);

                } else {
                    // TRANSFORM: plates slide laterally
                    // Left plate shifted by offset
                    p.noStroke();
                    p.fill(72, 60, 52);
                    p.rect(0, mid - 55 + (offset % 40) * 0.3, cx - 5, 100);
                    p.fill(72, 60, 52);
                    p.rect(cx + 5, mid - 55 - (offset % 40) * 0.3, W - cx - 5, 100);

                    // Fault line
                    p.stroke(240, 180, 60, quakeFlash > 0 ? 255 : 120);
                    p.strokeWeight(3);
                    p.line(cx, 0, cx, H);
                    p.stroke(200, 100, 20, 60);
                    p.strokeWeight(1);
                    p.line(cx - 6, 0, cx - 6, H);
                    p.line(cx + 6, 0, cx + 6, H);

                    if (quakeFlash > 0) {
                        p.noStroke();
                        p.fill(255, 200, 50, p.map(quakeFlash, 0, 18, 0, 90));
                        p.rect(0, 0, W, H);
                        p.fill('#fff'); p.noStroke();
                        p.textAlign(p.CENTER, p.CENTER);
                        p.textSize(15);
                        p.text('EARTHQUAKE', cx, H * 0.35);
                    }

                    p.fill('#94a3b8'); p.noStroke(); p.textSize(11);
                    p.textAlign(p.CENTER, p.TOP);
                    p.text('Transform — strike-slip fault (San Andreas style)', cx, 14);
                    p.textAlign(p.RIGHT, p.CENTER);
                    p.text('→', cx - 20, mid - 25);
                    p.textAlign(p.LEFT, p.CENTER);
                    p.text('←', cx + 20, mid + 25);
                }

                // ── Ocean water overlay (always) ──
                if (type !== 1) {
                    p.fill(20, 40, 80, 170);
                    p.noStroke();
                    p.rect(0, 0, W, mid - 55);
                }

                // ── Ground surface detail ──
                p.stroke('#94a3b880'); p.strokeWeight(1);
                p.noFill();

                // ── Telemetry ──
                const typeNames = ['Divergent', 'Convergent', 'Transform'];
                ctx._telemetry = {
                    'Boundary Type': typeNames[type],
                    'Plate Speed':   `${rate.toFixed(1)} cm/yr`,
                    'Crust Age':     `${crustAge.toFixed(1)} Myr`,
                    'Magma Temp':    `${ctx.params.mantleTemp}°C`
                };
                ctx.updateTelemetry();

                // ── Legend ──
                p.fill('#94a3b8'); p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(11);
                p.text('Boundary: 0=Divergent  1=Convergent  2=Transform  •  Mantle convection drives all plate motion', 14, H - 10);
            };
        }
    });

    sim.mount();
    return sim;
};
