// ===== POPULATION GENETICS & SELECTION =====
// Hardy-Weinberg equilibrium, natural selection pressure, and stochastic genetic drift
// Biology: p² (AA) + 2pq (Aa) + q² (aa) = 1, Wright-Fisher generational sampling

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'population-genetics',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            selectionCoeff: { value: 0.15, min: -0.5, max: 0.8,  step: 0.05,  label: 'Selection on aa (s)', unit: 'coeff' },
            populationSize: { value: 60,   min: 15,   max: 150,  step: 5,     label: 'Population Size (N)', unit: 'indiv' },
            mutationRate:   { value: 0.01, min: 0.0,  max: 0.05, step: 0.005, label: 'Mutation Rate (μ)',   unit: 'rate'  }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Allele p (A)':       '0.50',
                'Allele q (a)':       '0.50',
                'Heterozygosity (H)': '0.50',
                'Generation':         '0'
            };
        },

        setup(p, ctx) {
            // ── Color palette ──────────────────────────────────────────
            const TEAL  = [ 45, 212, 191]; // AA homozygous dominant
            const GREEN = [ 74, 222, 128]; // Aa heterozygous carrier
            const AMBER = [232, 160,  76]; // aa homozygous recessive
            const BIO   = VisualKit.getCategoryRGB('biology');

            // ── State ──────────────────────────────────────────────────
            let individuals   = [];
            let pFreqHistory  = [0.5];
            let generation    = 0;
            let lastGenTime   = 0;

            function initPopulation() {
                individuals  = [];
                pFreqHistory = [0.5];
                generation   = 0;
                lastGenTime  = 0;

                const n     = Math.floor(ctx.params.populationSize);
                const pInit = 0.5;

                for (let i = 0; i < n; i++) {
                    const a1 = Math.random() < pInit ? 'A' : 'a';
                    const a2 = Math.random() < pInit ? 'A' : 'a';
                    individuals.push({
                        a1, a2,
                        x:  30 + Math.random() * (p.width * 0.5 - 60),
                        y:  40 + Math.random() * (p.height - 100),
                        vx: (Math.random() - 0.5) * 1.5,
                        vy: (Math.random() - 0.5) * 1.5
                    });
                }
            }

            initPopulation();
            ctx.onReset       = initPopulation;
            ctx.onResize      = initPopulation;
            ctx.onParamChange = (k) => { if (k === 'populationSize') initPopulation(); };

            // ── Wright-Fisher step ─────────────────────────────────────
            function advanceGeneration() {
                const n  = Math.floor(ctx.params.populationSize);
                const s  = ctx.params.selectionCoeff;
                const mu = ctx.params.mutationRate;

                const weights = individuals.map(ind => {
                    const isaa = ind.a1 === 'a' && ind.a2 === 'a';
                    return isaa ? Math.max(0.01, 1.0 - s) : 1.0;
                });
                const sumW = weights.reduce((a, v) => a + v, 0);

                function sampleParent() {
                    let r = Math.random() * sumW;
                    for (let i = 0; i < weights.length; i++) {
                        r -= weights[i];
                        if (r <= 0) return individuals[i];
                    }
                    return individuals[individuals.length - 1];
                }

                const nextIndivs = [];
                for (let i = 0; i < n; i++) {
                    const p1 = sampleParent();
                    const p2 = sampleParent();
                    let a1 = Math.random() < 0.5 ? p1.a1 : p1.a2;
                    let a2 = Math.random() < 0.5 ? p2.a1 : p2.a2;
                    if (Math.random() < mu) a1 = a1 === 'A' ? 'a' : 'A';
                    if (Math.random() < mu) a2 = a2 === 'A' ? 'a' : 'A';

                    nextIndivs.push({
                        a1, a2,
                        x:  30 + Math.random() * (p.width * 0.5 - 60),
                        y:  40 + Math.random() * (p.height - 100),
                        vx: (Math.random() - 0.5) * 1.5,
                        vy: (Math.random() - 0.5) * 1.5
                    });
                }

                individuals = nextIndivs;
                generation++;

                let countA = 0;
                for (const ind of individuals) {
                    if (ind.a1 === 'A') countA++;
                    if (ind.a2 === 'A') countA++;
                }
                const curP = countA / (2 * n);
                pFreqHistory.push(curP);
                if (pFreqHistory.length > 120) pFreqHistory.shift();
            }

            p.draw = function() {
                p.background(7, 9, 15);

                const dt = ctx.speed;
                const cW = p.width * 0.52;
                const cH = p.height - 70;

                // ─────────────────────────────────────────────────────
                // 1. Simulate
                // ─────────────────────────────────────────────────────
                if (ctx.isPlaying) {
                    lastGenTime += dt;
                    if (lastGenTime >= 28) {
                        lastGenTime = 0;
                        advanceGeneration();
                    }

                    for (const ind of individuals) {
                        ind.x += ind.vx * dt;
                        ind.y += ind.vy * dt;
                        if (ind.x < 30 || ind.x > cW - 20) ind.vx *= -1;
                        if (ind.y < 40 || ind.y > cH + 10) ind.vy *= -1;
                    }
                }

                // ─────────────────────────────────────────────────────
                // 2. Habitat arena
                // ─────────────────────────────────────────────────────
                p.push();
                p.fill(15, 17, 23, 200);
                p.stroke(35, 48, 70);
                p.strokeWeight(1.5);
                p.rect(16, 20, cW - 20, cH, 8);
                p.pop();

                // ─────────────────────────────────────────────────────
                // 3. Individuals (glow bodies)
                // ─────────────────────────────────────────────────────
                let countAA = 0, countAa = 0, countaa = 0;
                for (const ind of individuals) {
                    const isAA = ind.a1 === 'A' && ind.a2 === 'A';
                    const isaa = ind.a1 === 'a' && ind.a2 === 'a';
                    const rgb  = isAA ? TEAL : (isaa ? AMBER : GREEN);

                    if (isAA) countAA++;
                    else if (isaa) countaa++;
                    else countAa++;

                    VisualKit.drawGlowBody(p, ind.x, ind.y, 7, rgb, {
                        outerMult: 2.4, innerMult: 1.5,
                        outerAlpha: isaa ? 38 : 20,
                        innerAlpha: isaa ? 80 : 55,
                        strokeWidth: 1.2, specular: false
                    });

                    // Genotype label
                    p.push();
                    p.noStroke();
                    p.fill(7, 9, 15, 180);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(6.5);
                    p.text(isAA ? 'AA' : (isaa ? 'aa' : 'Aa'), ind.x, ind.y);
                    p.pop();
                }

                // ─────────────────────────────────────────────────────
                // 4. Allele frequency chart (right panel)
                // ─────────────────────────────────────────────────────
                const graphX = cW + 20;
                const graphY = 20;
                const graphW = p.width - graphX - 16;
                const graphH = cH - 10;

                VisualKit.drawInsetPanel(p, graphX, graphY, graphW, graphH,
                    'Allele Frequency  p(A)  over Generations',
                    { cornerRadius: 8, textSize: 9 });

                const axL = graphX + 8;
                const axR = graphX + graphW - 8;
                const axB = graphY + graphH - 18;
                const axT = graphY + 22;
                const axH = axB - axT;
                const axW = axR - axL;

                // Axis lines
                p.push();
                p.stroke(40, 55, 80);
                p.strokeWeight(1);
                p.line(axL, axT, axL, axB);
                p.line(axL, axB, axR, axB);
                p.pop();

                // 0.5 equilibrium reference
                p.push();
                if (p.drawingContext?.setLineDash) p.drawingContext.setLineDash([4, 6]);
                p.stroke(255, 255, 255, 18);
                p.strokeWeight(1);
                const refY = axT + axH * 0.5;
                p.line(axL, refY, axR, refY);
                if (p.drawingContext?.setLineDash) p.drawingContext.setLineDash([]);
                p.noStroke();
                p.fill(60, 80, 110);
                p.textSize(7.5);
                p.textAlign(p.LEFT, p.CENTER);
                p.text('0.5 HW equilibrium', axL + 3, refY - 6);
                p.text('1.0 fixation', axL + 3, axT + 4);
                p.text('0.0 loss',     axL + 3, axB - 4);
                p.text('Generations →', axR - 50, axB + 12);
                p.pop();

                // p(t) trajectory
                if (pFreqHistory.length > 1) {
                    // Glow pass
                    p.push();
                    p.noFill();
                    p.stroke(TEAL[0], TEAL[1], TEAL[2], 30);
                    p.strokeWeight(7);
                    p.beginShape();
                    for (let i = 0; i < pFreqHistory.length; i++) {
                        const vx = axL + (i / 120) * axW;
                        const vy = axB - pFreqHistory[i] * axH;
                        p.vertex(vx, vy);
                    }
                    p.endShape();
                    // Core line
                    p.stroke(TEAL[0], TEAL[1], TEAL[2], 210);
                    p.strokeWeight(2.5);
                    p.beginShape();
                    for (let i = 0; i < pFreqHistory.length; i++) {
                        const vx = axL + (i / 120) * axW;
                        const vy = axB - pFreqHistory[i] * axH;
                        p.vertex(vx, vy);
                    }
                    p.endShape();
                    p.pop();
                }

                // Genotype count bars (small, bottom of panel)
                const barY   = graphY + graphH - 36;
                const barW   = (graphW - 20) / 3;
                const barMax = individuals.length || 1;
                const bars   = [
                    { count: countAA, rgb: TEAL,  label: 'AA' },
                    { count: countAa, rgb: GREEN,  label: 'Aa' },
                    { count: countaa, rgb: AMBER,  label: 'aa' },
                ];
                for (let i = 0; i < bars.length; i++) {
                    const bx   = graphX + 10 + i * (barW + 3);
                    const frac = bars[i].count / barMax;
                    p.push();
                    p.noStroke();
                    p.fill(bars[i].rgb[0], bars[i].rgb[1], bars[i].rgb[2], 45);
                    p.rect(bx, barY, barW, 18, 3);
                    p.fill(bars[i].rgb[0], bars[i].rgb[1], bars[i].rgb[2], 180);
                    p.rect(bx, barY, barW * frac, 18, 3);
                    p.fill(bars[i].rgb[0], bars[i].rgb[1], bars[i].rgb[2]);
                    p.textSize(7.5);
                    p.textAlign(p.LEFT, p.CENTER);
                    p.text(`${bars[i].label} ${bars[i].count}`, bx + 3, barY + 9);
                    p.pop();
                }

                // ─────────────────────────────────────────────────────
                // 5. Telemetry
                // ─────────────────────────────────────────────────────
                const curP = pFreqHistory[pFreqHistory.length - 1] ?? 0.5;
                const curQ = 1.0 - curP;

                ctx._telemetry = {
                    'Allele p (A)':       `${curP.toFixed(2)}`,
                    'Allele q (a)':       `${curQ.toFixed(2)}`,
                    'Heterozygosity (H)': `${(2 * curP * curQ).toFixed(2)}`,
                    'Generation':         `${generation}`
                };
                ctx.updateTelemetry();

                // ─────────────────────────────────────────────────────
                // 6. Footer hint
                // ─────────────────────────────────────────────────────
                p.push();
                p.noStroke();
                p.fill(70, 90, 120);
                p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text('Teal = AA  ·  Green = Aa  ·  Amber = aa  ·  s > 0 removes aa  ·  small N → random drift', 16, p.height - 10);
                p.pop();
            };
        }
    });

    sim.mount();
    return sim;
};
