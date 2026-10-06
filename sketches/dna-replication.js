// ===== DNA REPLICATION =====
// Semi-conservative double helix unwinding and leading/lagging strand synthesis
// Biology: Helicase unwinding, 5'→3' polymerase synthesis, Okazaki fragments, Watson-Crick base pairing

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'dna-replication',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            unwindRate:           { value: 1.2,  min: 0.4,  max: 3.0,   step: 0.2, label: 'Helicase Speed',       unit: 'bp/s' },
            proofreadingFidelity: { value: 99.9, min: 90.0, max: 100.0, step: 0.5, label: 'Proofreading Fidelity', unit: '%'   },
            baseSpacing:          { value: 24,   min: 18,   max: 32,    step: 2,   label: 'Base Pair Spacing',     unit: 'px'  }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Replication Fork':    '0 bp',
                'Synthesized Bases':   '0 bp',
                'Leading Strand Rate': '100 bp/s',
                'Copy Fidelity':       '99.9%'
            };
        },

        setup(p, ctx) {
            // ── Color palette ──────────────────────────────────────────
            const BIO    = VisualKit.getCategoryRGB('biology');
            const BASE_RGB = {
                'A': [ 74, 222, 128], // green
                'T': [248, 113, 113], // red
                'C': [ 45, 212, 191], // teal
                'G': [232, 160,  76]  // amber
            };
            const HELICASE_RGB  = [124, 106, 247]; // violet
            const POLYMERASE_RGB = [ 45, 212, 191]; // teal
            const LEADING_RGB    = [ 74, 222, 128]; // green (newly synth top)
            const LAGGING_RGB    = [248, 113, 113]; // red   (newly synth bottom)

            const baseTypes  = ['A', 'T', 'C', 'G'];
            const complements = { A: 'T', T: 'A', C: 'G', G: 'C' };

            let templateBases   = [];
            let forkPosition    = 0;
            let synthesizedCount = 0;
            let forkHistory     = [];

            function initTemplate() {
                templateBases    = [];
                forkPosition     = 15;
                synthesizedCount = 0;
                forkHistory      = [];

                for (let i = 0; i < 80; i++) {
                    const b = baseTypes[Math.floor(Math.random() * baseTypes.length)];
                    templateBases.push({
                        top:              b,
                        bottom:           complements[b],
                        synthesizedTop:   false,
                        synthesizedBottom: false
                    });
                }
            }

            initTemplate();
            ctx.onReset  = initTemplate;
            ctx.onResize = initTemplate;

            p.draw = function() {
                p.background(7, 9, 15);

                const w       = p.width;
                const h       = p.height;
                const midY    = h * 0.5;
                const dt      = ctx.speed;
                const spacing = ctx.params.baseSpacing;

                // ─────────────────────────────────────────────────────
                // 1. Advance fork
                // ─────────────────────────────────────────────────────
                if (ctx.isPlaying) {
                    forkPosition += 0.04 * ctx.params.unwindRate * dt;
                    if (forkPosition >= templateBases.length - 10) {
                        forkPosition     = 15;
                        synthesizedCount = 0;
                        for (const tb of templateBases) {
                            tb.synthesizedTop    = false;
                            tb.synthesizedBottom = false;
                        }
                    }
                    forkHistory.push(forkPosition);
                    if (forkHistory.length > 80) forkHistory.shift();
                }

                // Camera follows fork
                const forkPixelX    = w * 0.45;
                const cameraOffsetX = forkPixelX - forkPosition * spacing;

                // ─────────────────────────────────────────────────────
                // 2. Sugar-phosphate backbones
                // ─────────────────────────────────────────────────────
                function backboneY(i, topOrBot) {
                    const unwound = topOrBot === 'top' ? midY - 60 : midY + 60;
                    const wound   = topOrBot === 'top' ? midY - 20  : midY + 20;
                    if (i > forkPosition)        return wound;
                    if (i > forkPosition - 8)    return p.lerp(wound, unwound, (forkPosition - i) / 8);
                    return unwound;
                }

                // Template top (teal backbone)
                p.push();
                p.noFill();
                p.stroke(POLYMERASE_RGB[0], POLYMERASE_RGB[1], POLYMERASE_RGB[2], 130);
                p.strokeWeight(3);
                p.beginShape();
                for (let i = 0; i < templateBases.length; i++)
                    p.vertex(i * spacing + cameraOffsetX, backboneY(i, 'top'));
                p.endShape();
                p.pop();

                // Template bottom (amber backbone)
                p.push();
                p.noFill();
                p.stroke(232, 160, 76, 130);
                p.strokeWeight(3);
                p.beginShape();
                for (let i = 0; i < templateBases.length; i++)
                    p.vertex(i * spacing + cameraOffsetX, backboneY(i, 'bottom'));
                p.endShape();
                p.pop();

                // ─────────────────────────────────────────────────────
                // 3. Base pairs + H-bonds + daughter strands
                // ─────────────────────────────────────────────────────
                let countSynth = 0;
                for (let i = 0; i < templateBases.length; i++) {
                    const x = i * spacing + cameraOffsetX;
                    if (x < -40 || x > w + 40) continue;

                    const tb   = templateBases[i];
                    const topY = backboneY(i, 'top');
                    const botY = backboneY(i, 'bot');

                    if (i > forkPosition) {
                        // Intact H-bonds ahead of fork
                        p.push();
                        p.stroke(100, 116, 139, 100);
                        p.strokeWeight(1.5);
                        p.line(x, topY, x, botY);
                        p.pop();
                    } else {
                        // Daughter strands behind fork
                        if (i < forkPosition - 3) {
                            tb.synthesizedTop = true;
                            p.push();
                            p.stroke(LEADING_RGB[0], LEADING_RGB[1], LEADING_RGB[2], 160);
                            p.strokeWeight(2.5);
                            p.line(x, topY + 18, x, topY);
                            p.pop();
                            countSynth++;
                        }
                        if (i < forkPosition - 6) {
                            tb.synthesizedBottom = true;
                            p.push();
                            p.stroke(LAGGING_RGB[0], LAGGING_RGB[1], LAGGING_RGB[2], 160);
                            p.strokeWeight(2.5);
                            p.line(x, botY - 18, x, botY);
                            p.pop();
                            countSynth++;
                        }
                    }

                    // Base badges (glow bodies)
                    const topRGB = BASE_RGB[tb.top];
                    const botRGB = BASE_RGB[tb.bottom];

                    VisualKit.drawGlowBody(p, x, topY, 7, topRGB, {
                        outerMult: 2.2, innerMult: 1.4, outerAlpha: 22, innerAlpha: 55,
                        strokeWidth: 1, specular: false
                    });
                    p.push();
                    p.noStroke(); p.fill(7, 9, 15, 180);
                    p.textAlign(p.CENTER, p.CENTER); p.textSize(8);
                    p.text(tb.top, x, topY);
                    p.pop();

                    VisualKit.drawGlowBody(p, x, botY, 7, botRGB, {
                        outerMult: 2.2, innerMult: 1.4, outerAlpha: 22, innerAlpha: 55,
                        strokeWidth: 1, specular: false
                    });
                    p.push();
                    p.noStroke(); p.fill(7, 9, 15, 180);
                    p.textAlign(p.CENTER, p.CENTER); p.textSize(8);
                    p.text(tb.bottom, x, botY);
                    p.pop();
                }

                synthesizedCount = countSynth;

                // ─────────────────────────────────────────────────────
                // 4. Helicase (glow ring at fork)
                // ─────────────────────────────────────────────────────
                const hx = forkPosition * spacing + cameraOffsetX;
                VisualKit.drawGlowBody(p, hx, midY, 27, HELICASE_RGB, {
                    outerMult:  2.2, innerMult:  1.4,
                    outerAlpha: 35,  innerAlpha: 75,
                    strokeWidth: 2.5, specular: false
                });
                p.push();
                p.noStroke(); p.fill(255, 255, 255, 210);
                p.textAlign(p.CENTER, p.CENTER); p.textSize(9);
                p.text('Helicase', hx, midY);
                p.pop();

                // ─────────────────────────────────────────────────────
                // 5. DNA Polymerase on leading strand
                // ─────────────────────────────────────────────────────
                const polyX = (forkPosition - 3) * spacing + cameraOffsetX;
                p.push();
                p.fill(POLYMERASE_RGB[0], POLYMERASE_RGB[1], POLYMERASE_RGB[2], 60);
                p.stroke(POLYMERASE_RGB[0], POLYMERASE_RGB[1], POLYMERASE_RGB[2], 180);
                p.strokeWeight(1.5);
                p.rect(polyX - 22, midY - 80, 44, 30, 6);
                p.fill(255);
                p.noStroke();
                p.textSize(8.5);
                p.textAlign(p.CENTER, p.CENTER);
                p.text('Polymerase δ', polyX, midY - 65);
                p.pop();

                // ─────────────────────────────────────────────────────
                // 6. Fork progress sparkline (top-right)
                // ─────────────────────────────────────────────────────
                if (forkHistory.length >= 2) {
                    VisualKit.drawSparkline(
                        p, w - 154, 14, 140, 50,
                        forkHistory, BIO,
                        { label: 'Fork Progress (bp)', zeroFloor: true, cornerRadius: 7, textSize: 8.5 }
                    );
                }

                // ─────────────────────────────────────────────────────
                // 7. Telemetry
                // ─────────────────────────────────────────────────────
                ctx._telemetry = {
                    'Replication Fork':    `${Math.floor(forkPosition)} bp`,
                    'Synthesized Bases':   `${synthesizedCount} bp`,
                    'Leading Strand Rate': `${(ctx.params.unwindRate * 50).toFixed(0)} bp/s`,
                    'Copy Fidelity':       `${ctx.params.proofreadingFidelity.toFixed(1)}%`
                };
                ctx.updateTelemetry();

                // ─────────────────────────────────────────────────────
                // 8. Footer hint
                // ─────────────────────────────────────────────────────
                p.push();
                p.noStroke(); p.fill(70, 90, 120);
                p.textSize(11); p.textAlign(p.LEFT, p.BOTTOM);
                p.text('A (Green) pairs with T (Red)  ·  C (Teal) pairs with G (Amber)  ·  Helicase unwinds 5′→3′', 16, h - 10);
                p.pop();
            };
        }
    });

    sim.mount();
    return sim;
};