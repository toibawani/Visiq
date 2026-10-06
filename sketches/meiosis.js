// ===== MEIOSIS: GAMETE FORMATION =====
// Two-stage division and homologous crossing over yielding four unique haploid cells
// Biology: Diploid (2n) → Meiosis I (recombination) → Meiosis II (sister separation) → Haploid (n)

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'meiosis',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            meiosisStage:    { value: 1.0, min: 0.0, max: 4.0, step: 0.05, label: 'Meiosis Progress', unit: 'stage'     },
            crossoverPoints: { value: 2,   min: 0,   max: 4,   step: 1,   label: 'Crossover Events',  unit: 'chiasmata' },
            cellScale:       { value: 1.0, min: 0.8, max: 1.2, step: 0.05, label: 'Display Zoom',      unit: 'x'         }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Current Division':   'Meiosis I',
                'Cell Ploidy':        'Diploid (2n)',
                'Recombinant Alleles': '2',
                'Daughter Gametes':   '1'
            };
        },

        setup(p, ctx) {
            // ── Color palette ──────────────────────────────────────────
            const BIO     = VisualKit.getCategoryRGB('biology'); // teal maternal
            const TEAL    = [ 45, 212, 191];
            const AMBER   = [232, 160,  76];
            const VIOLET  = [124, 106, 247];
            const WHITE   = [255, 255, 255];

            const stages = [
                'Prophase I  (Crossing Over)',
                'Metaphase / Anaphase I  (Homologue Separation)',
                'Telophase I  (Two Haploid Precursors)',
                'Anaphase II  (Sister Separation)',
                'Telophase II  (4 Unique Haploid Gametes)'
            ];

            // Helper: draw a glowing chromosome rod
            function drawChromosome(x1, y1, x2, y2, rgb, weight = 7) {
                // Glow
                p.push();
                p.stroke(rgb[0], rgb[1], rgb[2], 35);
                p.strokeWeight(weight + 8);
                p.line(x1, y1, x2, y2);
                // Core
                p.stroke(rgb[0], rgb[1], rgb[2], 210);
                p.strokeWeight(weight);
                p.line(x1, y1, x2, y2);
                p.pop();
            }

            p.draw = function() {
                p.background(7, 9, 15);

                const w   = p.width;
                const h   = p.height;
                const cx  = w * 0.5;
                const cy  = h * 0.5;
                const dt  = (1 / 60) * ctx.speed;

                if (ctx.isPlaying) {
                    ctx.params.meiosisStage += 0.18 * dt;
                    if (ctx.params.meiosisStage > 4.0) ctx.params.meiosisStage = 0.0;

                    const slider = document.getElementById('sim-param-meiosis-meiosisStage');
                    const badge  = document.getElementById('sim-param-meiosis-meiosisStage-val');
                    if (slider) slider.value = ctx.params.meiosisStage.toFixed(2);
                    if (badge)  badge.textContent = `${ctx.params.meiosisStage.toFixed(1)} stage`;
                }

                const stage      = ctx.params.meiosisStage;
                const stageIdx   = Math.min(4, Math.floor(stage));
                const crossovers = Math.floor(ctx.params.crossoverPoints);

                // ─────────────────────────────────────────────────────
                // Stage 0 – 2.0: Single parent cell (Meiosis I)
                // ─────────────────────────────────────────────────────
                if (stage < 2.0) {
                    // Glow cell membrane
                    p.push();
                    p.noFill();
                    p.stroke(TEAL[0], TEAL[1], TEAL[2], 18);
                    p.strokeWeight(14);
                    p.circle(cx, cy, 240);
                    p.stroke(TEAL[0], TEAL[1], TEAL[2], 80);
                    p.strokeWeight(2);
                    p.circle(cx, cy, 240);
                    p.pop();

                    const sep = stage >= 1.0 ? (stage - 1.0) * 80 : 0;
                    const xM  = cx - 25 - sep;
                    const xP  = cx + 25 + sep;
                    const halfLen = 60;

                    // Maternal chromosome
                    drawChromosome(xM, cy - halfLen, xM, cy + (crossovers > 0 && stage > 0.5 ? 20 : halfLen), TEAL);
                    if (crossovers > 0 && stage > 0.5) {
                        drawChromosome(xM, cy + 20, xM, cy + halfLen, AMBER);
                    }

                    // Paternal chromosome
                    drawChromosome(xP, cy - halfLen, xP, cy + (crossovers > 0 && stage > 0.5 ? 20 : halfLen), AMBER);
                    if (crossovers > 0 && stage > 0.5) {
                        drawChromosome(xP, cy + 20, xP, cy + halfLen, TEAL);
                    }

                    // Centromeres
                    VisualKit.drawGlowBody(p, xM, cy, 5, WHITE, { outerMult: 2.5, innerMult: 1.5, outerAlpha: 40, innerAlpha: 90, strokeWidth: 1, specular: false });
                    VisualKit.drawGlowBody(p, xP, cy, 5, WHITE, { outerMult: 2.5, innerMult: 1.5, outerAlpha: 40, innerAlpha: 90, strokeWidth: 1, specular: false });

                    // Crossover chiasma X marks
                    if (crossovers > 0 && stage > 0.5) {
                        p.push();
                        p.stroke(255, 255, 255, 80);
                        p.strokeWeight(1.5);
                        p.line(xM, cy + 20, xP, cy + 20);
                        p.pop();
                    }

                // ─────────────────────────────────────────────────────
                // Stage 2.0 – 3.5: Two cells in Meiosis II
                // ─────────────────────────────────────────────────────
                } else if (stage < 3.5) {
                    const x1   = cx - 140;
                    const x2   = cx + 140;
                    const sep2 = (stage - 2.0) * 35;

                    for (const cellX of [x1, x2]) {
                        p.push();
                        p.noFill();
                        p.stroke(TEAL[0], TEAL[1], TEAL[2], 14);
                        p.strokeWeight(12);
                        p.circle(cellX, cy, 170);
                        p.stroke(TEAL[0], TEAL[1], TEAL[2], 65);
                        p.strokeWeight(1.8);
                        p.circle(cellX, cy, 170);
                        p.pop();
                    }

                    // Cell 1 chromatids (maternal origin)
                    drawChromosome(x1 - sep2, cy - 40, x1 - sep2, cy + 40, TEAL, 6);
                    if (crossovers > 0) {
                        drawChromosome(x1 + sep2, cy - 40, x1 + sep2, cy, AMBER, 6);
                        drawChromosome(x1 + sep2, cy, x1 + sep2, cy + 40, TEAL, 6);
                    } else {
                        drawChromosome(x1 + sep2, cy - 40, x1 + sep2, cy + 40, TEAL, 6);
                    }

                    // Cell 2 chromatids (paternal origin)
                    drawChromosome(x2 - sep2, cy - 40, x2 - sep2, cy + 40, AMBER, 6);
                    if (crossovers > 0) {
                        drawChromosome(x2 + sep2, cy - 40, x2 + sep2, cy, TEAL, 6);
                        drawChromosome(x2 + sep2, cy, x2 + sep2, cy + 40, AMBER, 6);
                    } else {
                        drawChromosome(x2 + sep2, cy - 40, x2 + sep2, cy + 40, AMBER, 6);
                    }

                // ─────────────────────────────────────────────────────
                // Stage 3.5 – 4.0: 4 final haploid gametes
                // ─────────────────────────────────────────────────────
                } else {
                    const centers = [
                        { x: cx - 180, y: cy - 70 },
                        { x: cx - 60,  y: cy - 70 },
                        { x: cx + 60,  y: cy + 70 },
                        { x: cx + 180, y: cy + 70 }
                    ];

                    const gameteColors = [
                        [TEAL,  TEAL ],
                        [AMBER, TEAL ],
                        [TEAL,  AMBER],
                        [AMBER, AMBER]
                    ];

                    centers.forEach((c, idx) => {
                        // Gamete membrane glow
                        p.push();
                        p.noFill();
                        p.stroke(VIOLET[0], VIOLET[1], VIOLET[2], 20);
                        p.strokeWeight(12);
                        p.circle(c.x, c.y, 90);
                        p.stroke(VIOLET[0], VIOLET[1], VIOLET[2], 100);
                        p.strokeWeight(1.8);
                        p.circle(c.x, c.y, 90);
                        p.pop();

                        // Chromatid inside
                        const [topRGB, botRGB] = gameteColors[idx];
                        drawChromosome(c.x, c.y - 25, c.x, c.y, topRGB, 5);
                        drawChromosome(c.x, c.y, c.x, c.y + 25, botRGB, 5);

                        // Gamete label
                        p.push();
                        p.noStroke();
                        p.fill(VIOLET[0], VIOLET[1], VIOLET[2], 180);
                        p.textSize(9.5);
                        p.textAlign(p.CENTER, p.CENTER);
                        p.text(`Gamete ${idx + 1} (n)`, c.x, c.y + 38);
                        p.pop();
                    });
                }

                // ─────────────────────────────────────────────────────
                // Stage title
                // ─────────────────────────────────────────────────────
                p.push();
                p.noStroke();
                p.fill(240, 245, 255, 220);
                p.textSize(14);
                p.textAlign(p.CENTER, p.TOP);
                p.text(`Phase: ${stages[stageIdx]}`, cx, 18);
                p.pop();

                // ─────────────────────────────────────────────────────
                // Telemetry
                // ─────────────────────────────────────────────────────
                const divisionName = stage < 2.0 ? 'Meiosis I' : (stage < 3.5 ? 'Meiosis II' : 'Complete');
                const ploidy       = stage < 2.0 ? 'Diploid (2n)' : 'Haploid (n)';
                const gameteCount  = stage < 2.0 ? '1 parent' : (stage < 3.5 ? '2 intermediates' : '4 unique gametes');

                ctx._telemetry = {
                    'Current Division':    divisionName,
                    'Cell Ploidy':         ploidy,
                    'Recombinant Alleles': `${crossovers * 2}`,
                    'Daughter Gametes':    gameteCount
                };
                ctx.updateTelemetry();

                // ─────────────────────────────────────────────────────
                // Footer hint
                // ─────────────────────────────────────────────────────
                p.push();
                p.noStroke();
                p.fill(70, 90, 120);
                p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text('Teal = Maternal  ·  Amber = Paternal  ·  Crossing over swaps genetic segments  ·  Space to pause', 16, h - 10);
                p.pop();
            };
        }
    });

    sim.mount();
    return sim;
};
