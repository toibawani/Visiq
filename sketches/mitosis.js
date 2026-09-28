// ===== MITOSIS: CELL DIVISION =====
// Eukaryotic chromosome segregation and cytokinesis
// Biology: Interphase → Prophase → Metaphase → Anaphase → Telophase

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'mitosis',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            cellStage: { value: 2.0, min: 0.0, max: 4.0, step: 0.05, label: 'Cell Division Phase', unit: 'stage' },
            spindleTension: { value: 1.0, min: 0.5, max: 2.0, step: 0.1, label: 'Spindle Fiber Tension', unit: 'x' },
            chromosomePairs: { value: 4, min: 2, max: 6, step: 1, label: 'Chromosome Pairs', unit: 'pairs' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Current Stage': 'Metaphase',
                'Spindle Attachment': '100%',
                'Pole Separation': '0 px',
                'Cleavage Depth': '0%'
            };
        },
        setup(p, ctx) {
            const stageNames = ['Interphase', 'Prophase', 'Metaphase', 'Anaphase', 'Telophase / Cytokinesis'];

            p.draw = function() {
                p.background(7, 9, 15);

                const w = p.width;
                const h = p.height;
                const cx = w * 0.5;
                const cy = h * 0.5;
                const dt = (1 / 60) * ctx.speed;

                // Auto advance stage when playing
                if (ctx.isPlaying) {
                    ctx.params.cellStage += 0.2 * dt;
                    if (ctx.params.cellStage > 4.0) {
                        ctx.params.cellStage = 0.0;
                    }
                    // Update slider UI
                    const slider = document.getElementById('sim-param-mitosis-cellStage');
                    const badge = document.getElementById('sim-param-mitosis-cellStage-val');
                    if (slider) slider.value = ctx.params.cellStage.toFixed(2);
                    if (badge) badge.textContent = `${ctx.params.cellStage.toFixed(1)} stage`;
                }

                const stage = ctx.params.cellStage; // 0.0 to 4.0
                const currentStageName = stageNames[Math.min(4, Math.floor(stage))];

                // 1. Calculate Cell Shape & Cleavage Furrow
                // In Telophase (stage > 3.0), the membrane pinches in the middle
                const cellW = 340 + Math.max(0, stage - 2.5) * 80;
                const cellH = 220;
                const pinch = Math.max(0, Math.min(1.0, (stage - 3.0) / 1.0)); // 0 to 1 pinch depth
                const waistR = cellH * 0.5 * (1.0 - pinch * 0.75);

                // Draw Cytoplasm & Cell Membrane
                p.fill('rgba(45, 212, 191, 0.06)'); // Teal tinted cytoplasm
                p.stroke('#2dd4bf');
                p.strokeWeight(2.5);

                p.beginShape();
                // Top curve with pinch
                p.vertex(cx - cellW * 0.45, cy - cellH * 0.45);
                p.bezierVertex(cx - cellW * 0.2, cy - cellH * 0.5, cx - 30, cy - waistR, cx, cy - waistR);
                p.bezierVertex(cx + 30, cy - waistR, cx + cellW * 0.2, cy - cellH * 0.5, cx + cellW * 0.45, cy - cellH * 0.45);
                // Right cap
                p.bezierVertex(cx + cellW * 0.55, cy, cx + cellW * 0.55, cy, cx + cellW * 0.45, cy + cellH * 0.45);
                // Bottom curve with pinch
                p.bezierVertex(cx + cellW * 0.2, cy + cellH * 0.5, cx + 30, cy + waistR, cx, cy + waistR);
                p.bezierVertex(cx - 30, cy + waistR, cx - cellW * 0.2, cy + cellH * 0.5, cx - cellW * 0.45, cy + cellH * 0.45);
                // Left cap
                p.bezierVertex(cx - cellW * 0.55, cy, cx - cellW * 0.55, cy, cx - cellW * 0.45, cy - cellH * 0.45);
                p.endShape(p.CLOSE);

                // 2. Centrosomes (Poles)
                // In Interphase, centrosomes are together; in Prophase, they migrate to opposite poles
                const poleMigration = Math.min(1.0, stage / 1.5);
                const poleDist = (cellW * 0.38) * poleMigration;
                const leftPoleX = cx - poleDist;
                const rightPoleX = cx + poleDist;

                // Draw Centrosomes (yellow aster stars)
                function drawCentrosome(px, py) {
                    p.fill('#facc15');
                    p.noStroke();
                    p.circle(px, py, 10);
                    // Aster microtubules
                    p.stroke('rgba(250, 204, 21, 0.3)');
                    p.strokeWeight(1);
                    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                        p.line(px, py, px + Math.cos(a) * 16, py + Math.sin(a) * 16);
                    }
                }
                drawCentrosome(leftPoleX, cy);
                drawCentrosome(rightPoleX, cy);

                // 3. Chromosomes and Spindle Fibers
                const pairs = Math.floor(ctx.params.chromosomePairs);
                const spreadY = (cellH * 0.6) / pairs;

                for (let i = 0; i < pairs; i++) {
                    const rowY = cy - (pairs - 1) * spreadY * 0.5 + i * spreadY;

                    // Chromosome positioning based on stage
                    let xLeftChr, xRightChr;
                    if (stage < 1.0) {
                        // Interphase: diffused chromatin near center
                        xLeftChr = cx - 12 + Math.sin(i * 1.5 + p.frameCount * 0.02) * 8;
                        xRightChr = cx + 12 + Math.cos(i * 1.5 + p.frameCount * 0.02) * 8;
                    } else if (stage < 2.0) {
                        // Prophase: condensing and moving toward metaphase plate
                        const t = stage - 1.0;
                        xLeftChr = p.lerp(cx - 25, cx - 6, t);
                        xRightChr = p.lerp(cx + 25, cx + 6, t);
                    } else if (stage < 3.0) {
                        // Metaphase: lined up tightly at center (x = cx)
                        xLeftChr = cx - 5;
                        xRightChr = cx + 5;
                    } else {
                        // Anaphase / Telophase: pulled toward opposite poles
                        const t = stage - 3.0; // 0 to 1
                        const pullDist = (poleDist - 25) * t;
                        xLeftChr = cx - 5 - pullDist;
                        xRightChr = cx + 5 + pullDist;
                    }

                    // Spindle Fibers (connect poles to kinetochores)
                    if (stage >= 1.5) {
                        p.stroke('rgba(124, 106, 247, 0.45)'); // Spindle purple
                        p.strokeWeight(1.2);
                        p.line(leftPoleX, cy, xLeftChr, rowY);
                        p.line(rightPoleX, cy, xRightChr, rowY);
                    }

                    // Draw Sister Chromatids (X shape in prophase/metaphase, V shape in anaphase)
                    p.strokeWeight(3.5);
                    // Left sister (Teal)
                    p.stroke('#2dd4bf');
                    if (stage >= 3.0) {
                        // V shape pointing toward left pole
                        p.line(xLeftChr, rowY, xLeftChr + 10, rowY - 8);
                        p.line(xLeftChr, rowY, xLeftChr + 10, rowY + 8);
                    } else {
                        p.line(xLeftChr - 6, rowY - 8, xLeftChr + 6, rowY + 8);
                        p.line(xLeftChr + 6, rowY - 8, xLeftChr - 6, rowY + 8);
                    }

                    // Right sister (Amber)
                    p.stroke('#e8a04c');
                    if (stage >= 3.0) {
                        // V shape pointing toward right pole
                        p.line(xRightChr, rowY, xRightChr - 10, rowY - 8);
                        p.line(xRightChr, rowY, xRightChr - 10, rowY + 8);
                    } else {
                        p.line(xRightChr - 6, rowY - 8, xRightChr + 6, rowY + 8);
                        p.line(xRightChr + 6, rowY - 8, xRightChr - 6, rowY + 8);
                    }
                }

                // Stage label banner
                p.fill('#f1f5f9');
                p.noStroke();
                p.textSize(15);
                p.textAlign(p.CENTER, p.TOP);
                p.text(`Stage: ${currentStageName}`, cx, 24);

                // Telemetry
                const poleSep = Math.round(poleDist * 2);
                const cleavePct = Math.round(pinch * 100);

                ctx._telemetry = {
                    'Current Stage': currentStageName,
                    'Spindle Attachment': stage >= 2.0 ? '100%' : `${Math.round(stage * 50)}%`,
                    'Pole Separation': `${poleSep} px`,
                    'Cleavage Depth': `${cleavePct}%`
                };
                ctx.updateTelemetry();

                // Legend
                p.fill('#94a3b8');
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Use slider to scrub through stages • Teal & Amber = Sister Chromatids • Violet = Spindle fibers', 16, h - 14);
            };
        }
    });

    sim.mount();
    return sim;
};