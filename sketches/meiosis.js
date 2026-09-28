// ===== MEIOSIS: GAMETE FORMATION =====
// Two-stage division and homologous crossing over yielding four unique haploid cells
// Biology: Diploid (2n) → Meiosis I (recombination) → Meiosis II (sister separation) → Haploid (n)

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'meiosis',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            meiosisStage: { value: 1.0, min: 0.0, max: 4.0, step: 0.05, label: 'Meiosis Progress', unit: 'stage' },
            crossoverPoints: { value: 2, min: 0, max: 4, step: 1, label: 'Crossover Events', unit: 'chiasmata' },
            cellScale: { value: 1.0, min: 0.8, max: 1.2, step: 0.05, label: 'Display Zoom', unit: 'x' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Current Division': 'Meiosis I',
                'Cell Ploidy': 'Diploid (2n)',
                'Recombinant Alleles': '2',
                'Daughter Gametes': '1'
            };
        },
        setup(p, ctx) {
            const stages = [
                'Prophase I (Crossing Over)',
                'Metaphase / Anaphase I (Homologue Separation)',
                'Telophase I (Two Diploid/Haploid Precursors)',
                'Anaphase II (Sister Separation)',
                'Telophase II (4 Unique Haploid Gametes)'
            ];

            p.draw = function() {
                p.background(7, 9, 15);

                const w = p.width;
                const h = p.height;
                const cx = w * 0.5;
                const cy = h * 0.5;
                const dt = (1 / 60) * ctx.speed;

                if (ctx.isPlaying) {
                    ctx.params.meiosisStage += 0.18 * dt;
                    if (ctx.params.meiosisStage > 4.0) ctx.params.meiosisStage = 0.0;

                    const slider = document.getElementById('sim-param-meiosis-meiosisStage');
                    const badge = document.getElementById('sim-param-meiosis-meiosisStage-val');
                    if (slider) slider.value = ctx.params.meiosisStage.toFixed(2);
                    if (badge) badge.textContent = `${ctx.params.meiosisStage.toFixed(1)} stage`;
                }

                const stage = ctx.params.meiosisStage;
                const stageIdx = Math.min(4, Math.floor(stage));
                const currentName = stages[stageIdx];
                const crossovers = Math.floor(ctx.params.crossoverPoints);

                // Stage 0 - 1.5: Single parent cell
                if (stage < 2.0) {
                    p.fill('rgba(45, 212, 191, 0.05)');
                    p.stroke('#2dd4bf');
                    p.strokeWeight(2);
                    p.circle(cx, cy, 240);

                    // Homologous chromosome pair in synapsis
                    // Left maternal chromosome (Teal)
                    // Right paternal chromosome (Amber)
                    const crossoverOffset = stage < 1.0 ? Math.sin(stage * Math.PI) * 10 : 0;
                    const sep = stage >= 1.0 ? (stage - 1.0) * 80 : 0;

                    const xM = cx - 25 - sep;
                    const xP = cx + 25 + sep;

                    // Maternal chromosome (with possible amber swapped tip)
                    p.stroke('#2dd4bf');
                    p.strokeWeight(7);
                    p.line(xM, cy - 60, xM, cy + 20);
                    // Recombinant tip if crossover
                    if (crossovers > 0 && stage > 0.5) {
                        p.stroke('#e8a04c'); // Swapped paternal segment
                        p.line(xM, cy + 20, xM, cy + 60);
                    } else {
                        p.line(xM, cy + 20, xM, cy + 60);
                    }

                    // Paternal chromosome (with possible teal swapped tip)
                    p.stroke('#e8a04c');
                    p.strokeWeight(7);
                    p.line(xP, cy - 60, xP, cy + 20);
                    if (crossovers > 0 && stage > 0.5) {
                        p.stroke('#2dd4bf'); // Swapped maternal segment
                        p.line(xP, cy + 20, xP, cy + 60);
                    } else {
                        p.line(xP, cy + 20, xP, cy + 60);
                    }

                    // Centromeres
                    p.fill('#ffffff');
                    p.noStroke();
                    p.circle(xM, cy, 10);
                    p.circle(xP, cy, 10);

                } else if (stage < 3.5) {
                    // Stage 2.0 - 3.5: Two cells dividing in Meiosis II
                    const x1 = cx - 140;
                    const x2 = cx + 140;

                    p.fill('rgba(45, 212, 191, 0.05)');
                    p.stroke('#2dd4bf');
                    p.strokeWeight(2);
                    p.circle(x1, cy, 170);
                    p.circle(x2, cy, 170);

                    // Chromosomes separating in cell 1
                    const sep2 = (stage - 2.0) * 35;
                    p.strokeWeight(6);

                    // Cell 1 chromatids
                    p.stroke('#2dd4bf');
                    p.line(x1 - sep2, cy - 40, x1 - sep2, cy + 40);
                    if (crossovers > 0) {
                        p.stroke('#e8a04c');
                        p.line(x1 + sep2, cy - 40, x1 + sep2, cy);
                        p.stroke('#2dd4bf');
                        p.line(x1 + sep2, cy, x1 + sep2, cy + 40);
                    } else {
                        p.stroke('#2dd4bf');
                        p.line(x1 + sep2, cy - 40, x1 + sep2, cy + 40);
                    }

                    // Cell 2 chromatids
                    p.stroke('#e8a04c');
                    p.line(x2 - sep2, cy - 40, x2 - sep2, cy + 40);
                    if (crossovers > 0) {
                        p.stroke('#2dd4bf');
                        p.line(x2 + sep2, cy - 40, x2 + sep2, cy);
                        p.stroke('#e8a04c');
                        p.line(x2 + sep2, cy, x2 + sep2, cy + 40);
                    } else {
                        p.stroke('#e8a04c');
                        p.line(x2 + sep2, cy - 40, x2 + sep2, cy + 40);
                    }

                } else {
                    // Stage 3.5 - 4.0: 4 final distinct haploid gametes
                    const centers = [
                        { x: cx - 180, y: cy - 70 },
                        { x: cx - 60, y: cy - 70 },
                        { x: cx + 60, y: cy + 70 },
                        { x: cx + 180, y: cy + 70 }
                    ];

                    p.strokeWeight(1.8);
                    p.stroke('#7c6af7'); // Violet gamete envelopes
                    p.fill('rgba(124, 106, 247, 0.08)');

                    centers.forEach((c, idx) => {
                        p.circle(c.x, c.y, 90);

                        // Chromatid inside each gamete
                        p.strokeWeight(5);
                        if (idx === 0) {
                            p.stroke('#2dd4bf');
                            p.line(c.x, c.y - 25, c.x, c.y + 25);
                        } else if (idx === 1) {
                            p.stroke('#e8a04c');
                            p.line(c.x, c.y - 25, c.x, c.y);
                            p.stroke('#2dd4bf');
                            p.line(c.x, c.y, c.x, c.y + 25);
                        } else if (idx === 2) {
                            p.stroke('#2dd4bf');
                            p.line(c.x, c.y - 25, c.x, c.y);
                            p.stroke('#e8a04c');
                            p.line(c.x, c.y, c.x, c.y + 25);
                        } else {
                            p.stroke('#e8a04c');
                            p.line(c.x, c.y - 25, c.x, c.y + 25);
                        }

                        p.fill('#ffffff');
                        p.noStroke();
                        p.textSize(10);
                        p.textAlign(p.CENTER, p.CENTER);
                        p.text(`Gamete ${idx + 1} (n)`, c.x, c.y + 35);
                    });
                }

                // Stage title
                p.fill('#f1f5f9');
                p.noStroke();
                p.textSize(15);
                p.textAlign(p.CENTER, p.TOP);
                p.text(`Phase: ${currentName}`, cx, 24);

                // Telemetry
                const divisionName = stage < 2.0 ? 'Meiosis I' : (stage < 3.5 ? 'Meiosis II' : 'Complete');
                const ploidy = stage < 2.0 ? 'Diploid (2n)' : 'Haploid (n)';
                const gameteCount = stage < 2.0 ? '1 parent' : (stage < 3.5 ? '2 intermediates' : '4 unique gametes');

                ctx._telemetry = {
                    'Current Division': divisionName,
                    'Cell Ploidy': ploidy,
                    'Recombinant Alleles': `${crossovers * 2}`,
                    'Daughter Gametes': gameteCount
                };
                ctx.updateTelemetry();

                // Legend
                p.fill('#94a3b8');
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Teal = Maternal • Amber = Paternal • Crossing over swaps genetic segments • Space to pause', 16, h - 14);
            };
        }
    });

    sim.mount();
    return sim;
};
