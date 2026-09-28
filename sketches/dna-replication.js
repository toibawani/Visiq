// ===== DNA REPLICATION =====
// Semi-conservative double helix unwinding and leading/lagging strand synthesis
// Biology: Helicase unwinding, 5'→3' polymerase synthesis, Okazaki fragments, Watson-Crick base pairing

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'dna-replication',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            unwindRate: { value: 1.2, min: 0.4, max: 3.0, step: 0.2, label: 'Helicase Speed', unit: 'bp/s' },
            proofreadingFidelity: { value: 99.9, min: 90.0, max: 100.0, step: 0.5, label: 'Proofreading Fidelity', unit: '%' },
            baseSpacing: { value: 24, min: 18, max: 32, step: 2, label: 'Base Pair Spacing', unit: 'px' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Replication Fork': '0 bp',
                'Synthesized Bases': '0 bp',
                'Leading Strand Rate': '100 bp/s',
                'Copy Fidelity': '99.9%'
            };
        },
        setup(p, ctx) {
            const baseTypes = ['A', 'T', 'C', 'G'];
            const baseColors = {
                'A': '#4ade80', // Green
                'T': '#f87171', // Red
                'C': '#2dd4bf', // Teal
                'G': '#e8a04c'  // Amber
            };
            const complements = { 'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C' };

            let templateBases = [];
            let forkPosition = 0;
            let synthesizedCount = 0;

            function initTemplate() {
                templateBases = [];
                // Generate 80 sequential base pairs
                for (let i = 0; i < 80; i++) {
                    const b = baseTypes[Math.floor(Math.random() * baseTypes.length)];
                    templateBases.push({
                        top: b,
                        bottom: complements[b],
                        synthesizedTop: false,
                        synthesizedBottom: false
                    });
                }
                forkPosition = 15;
                synthesizedCount = 0;
            }

            initTemplate();
            ctx.onReset = initTemplate;
            ctx.onResize = initTemplate;

            p.draw = function() {
                p.background(7, 9, 15);

                const w = p.width;
                const h = p.height;
                const midY = h * 0.5;
                const dt = ctx.speed;
                const spacing = ctx.params.baseSpacing;

                if (ctx.isPlaying) {
                    forkPosition += 0.04 * ctx.params.unwindRate * dt;
                    if (forkPosition >= templateBases.length - 10) {
                        forkPosition = 15;
                        synthesizedCount = 0;
                        for (const tb of templateBases) {
                            tb.synthesizedTop = false;
                            tb.synthesizedBottom = false;
                        }
                    }
                }

                // Center visual viewport around replication fork
                const forkPixelX = w * 0.45;
                const cameraOffsetX = forkPixelX - forkPosition * spacing;

                // 1. Draw Sugar-Phosphate Backbones
                p.strokeWeight(3);

                // Unwound leading strand (top)
                p.stroke('#2dd4bf');
                p.noFill();
                p.beginShape();
                for (let i = 0; i < templateBases.length; i++) {
                    const x = i * spacing + cameraOffsetX;
                    let y = midY - 60;
                    if (i > forkPosition) {
                        // Still wound in double helix ahead of fork
                        y = midY - 20;
                    } else if (i > forkPosition - 8) {
                        // Transition region unwinding
                        const t = (forkPosition - i) / 8;
                        y = p.lerp(midY - 20, midY - 60, t);
                    }
                    p.vertex(x, y);
                }
                p.endShape();

                // Unwound lagging strand (bottom)
                p.stroke('#e8a04c');
                p.beginShape();
                for (let i = 0; i < templateBases.length; i++) {
                    const x = i * spacing + cameraOffsetX;
                    let y = midY + 60;
                    if (i > forkPosition) {
                        y = midY + 20;
                    } else if (i > forkPosition - 8) {
                        const t = (forkPosition - i) / 8;
                        y = p.lerp(midY + 20, midY + 60, t);
                    }
                    p.vertex(x, y);
                }
                p.endShape();

                // 2. Draw Helicase Enzyme (hexagonal ring unwinding the fork)
                const hx = forkPosition * spacing + cameraOffsetX;
                p.fill('rgba(124, 106, 247, 0.4)');
                p.stroke('#7c6af7');
                p.strokeWeight(2.5);
                p.circle(hx, midY, 54);

                p.fill('#ffffff');
                p.noStroke();
                p.textSize(10);
                p.textAlign(p.CENTER, p.CENTER);
                p.text('Helicase', hx, midY);

                // 3. Draw Base Pairs and Hydrogen Bonds
                let countSynth = 0;
                for (let i = 0; i < templateBases.length; i++) {
                    const x = i * spacing + cameraOffsetX;
                    if (x < -40 || x > w + 40) continue;

                    const tb = templateBases[i];
                    let topY = midY - 60;
                    let botY = midY + 60;

                    if (i > forkPosition) {
                        topY = midY - 20;
                        botY = midY + 20;
                    } else if (i > forkPosition - 8) {
                        const t = (forkPosition - i) / 8;
                        topY = p.lerp(midY - 20, midY - 60, t);
                        botY = p.lerp(midY + 20, midY + 60, t);
                    }

                    // Ahead of fork: intact hydrogen bonds
                    if (i > forkPosition) {
                        p.stroke('#64748b');
                        p.strokeWeight(1.5);
                        p.line(x, topY, x, botY);
                    } else {
                        // Behind fork: newly synthesized daughter strands
                        // Leading strand (top)
                        if (i < forkPosition - 3) {
                            tb.synthesizedTop = true;
                            p.stroke('#4ade80'); // newly synthesized backbone
                            p.strokeWeight(2);
                            p.line(x, topY + 16, x, topY);
                            countSynth++;
                        }
                        // Lagging strand (bottom: synthesized in Okazaki chunks)
                        if (i < forkPosition - 6) {
                            tb.synthesizedBottom = true;
                            p.stroke('#f87171');
                            p.strokeWeight(2);
                            p.line(x, botY - 16, x, botY);
                            countSynth++;
                        }
                    }

                    // Draw Base Badges (A, T, C, G)
                    function drawBase(baseLetter, px, py) {
                        p.fill(baseColors[baseLetter]);
                        p.noStroke();
                        p.circle(px, py, 14);

                        p.fill('#07090f');
                        p.textAlign(p.CENTER, p.CENTER);
                        p.textSize(9);
                        p.text(baseLetter, px, py);
                    }

                    drawBase(tb.top, x, topY);
                    drawBase(tb.bottom, x, botY);
                }

                synthesizedCount = countSynth;

                // 4. DNA Polymerase Enzyme on Leading Strand
                const polyX = (forkPosition - 3) * spacing + cameraOffsetX;
                p.fill('rgba(45, 212, 191, 0.35)');
                p.stroke('#2dd4bf');
                p.strokeWeight(2);
                p.rect(polyX - 22, midY - 78, 44, 32, 6);
                p.fill('#ffffff');
                p.noStroke();
                p.textSize(9);
                p.text('Polymerase δ', polyX, midY - 62);

                // Telemetry
                const forkBp = Math.floor(forkPosition);
                const fidelity = ctx.params.proofreadingFidelity;

                ctx._telemetry = {
                    'Replication Fork': `${forkBp} bp`,
                    'Synthesized Bases': `${synthesizedCount} bp`,
                    'Leading Strand Rate': `${(ctx.params.unwindRate * 50).toFixed(0)} bp/s`,
                    'Copy Fidelity': `${fidelity.toFixed(1)}%`
                };
                ctx.updateTelemetry();

                // Legend
                p.fill('#94a3b8');
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('A (Green) pairs with T (Red) • C (Teal) pairs with G (Amber) • Helicase unwinds 5′→3′', 16, h - 14);
            };
        }
    });

    sim.mount();
    return sim;
};