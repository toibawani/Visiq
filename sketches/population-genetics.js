// ===== POPULATION GENETICS & SELECTION =====
// Hardy-Weinberg equilibrium, natural selection pressure, and stochastic genetic drift
// Biology: p² (AA) + 2pq (Aa) + q² (aa) = 1, Wright-Fisher generational sampling

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'population-genetics',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            selectionCoeff: { value: 0.15, min: -0.5, max: 0.8, step: 0.05, label: 'Selection on aa (s)', unit: 'coeff' },
            populationSize: { value: 60, min: 15, max: 150, step: 5, label: 'Population Size (N)', unit: 'indiv' },
            mutationRate: { value: 0.01, min: 0.0, max: 0.05, step: 0.005, label: 'Mutation Rate (μ)', unit: 'rate' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Allele p (A)': '0.50',
                'Allele q (a)': '0.50',
                'Heterozygosity (2pq)': '0.50',
                'Generation': '0'
            };
        },
        setup(p, ctx) {
            let individuals = [];
            let pFreqHistory = [0.5];
            let generation = 0;
            let lastGenTime = 0;

            function initPopulation() {
                individuals = [];
                const n = Math.floor(ctx.params.populationSize);
                const pInit = 0.5;

                for (let i = 0; i < n; i++) {
                    const a1 = Math.random() < pInit ? 'A' : 'a';
                    const a2 = Math.random() < pInit ? 'A' : 'a';
                    individuals.push({
                        a1, a2,
                        x: 30 + Math.random() * (p.width * 0.5 - 60),
                        y: 40 + Math.random() * (p.height - 100),
                        vx: (Math.random() - 0.5) * 1.5,
                        vy: (Math.random() - 0.5) * 1.5
                    });
                }
                pFreqHistory = [0.5];
                generation = 0;
            }

            initPopulation();
            ctx.onReset = initPopulation;
            ctx.onResize = initPopulation;
            ctx.onParamChange = (k) => {
                if (k === 'populationSize') initPopulation();
            };

            // Wright-Fisher generational reproduction step
            function advanceGeneration() {
                const n = Math.floor(ctx.params.populationSize);
                const s = ctx.params.selectionCoeff;
                const mu = ctx.params.mutationRate;

                // 1. Calculate current allele count and fitness-weighted sampling
                let totalA = 0;
                const weights = [];

                for (const ind of individuals) {
                    if (ind.a1 === 'A') totalA++;
                    if (ind.a2 === 'A') totalA++;

                    // Relative fitness: w_AA = 1, w_Aa = 1, w_aa = 1 - s
                    const isAA = ind.a1 === 'A' && ind.a2 === 'A';
                    const isAa = (ind.a1 === 'A' && ind.a2 === 'a') || (ind.a1 === 'a' && ind.a2 === 'A');
                    const isaa = ind.a1 === 'a' && ind.a2 === 'a';

                    let w = 1.0;
                    if (isaa) w = Math.max(0.01, 1.0 - s);
                    weights.push(w);
                }

                // Weighted random sampling to produce next generation
                const nextIndivs = [];
                const sumWeights = weights.reduce((acc, v) => acc + v, 0);

                function sampleParent() {
                    let r = Math.random() * sumWeights;
                    for (let i = 0; i < weights.length; i++) {
                        r -= weights[i];
                        if (r <= 0) return individuals[i];
                    }
                    return individuals[individuals.length - 1];
                }

                for (let i = 0; i < n; i++) {
                    const p1 = sampleParent();
                    const p2 = sampleParent();

                    let a1 = Math.random() < 0.5 ? p1.a1 : p1.a2;
                    let a2 = Math.random() < 0.5 ? p2.a1 : p2.a2;

                    // Mutation
                    if (Math.random() < mu) a1 = a1 === 'A' ? 'a' : 'A';
                    if (Math.random() < mu) a2 = a2 === 'A' ? 'a' : 'A';

                    nextIndivs.push({
                        a1, a2,
                        x: 30 + Math.random() * (p.width * 0.5 - 60),
                        y: 40 + Math.random() * (p.height - 100),
                        vx: (Math.random() - 0.5) * 1.5,
                        vy: (Math.random() - 0.5) * 1.5
                    });
                }

                individuals = nextIndivs;
                generation++;

                // Record p frequency
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

                // Advance generation every ~0.6 seconds when playing
                if (ctx.isPlaying) {
                    lastGenTime += dt;
                    if (lastGenTime >= 28) {
                        lastGenTime = 0;
                        advanceGeneration();
                    }

                    // Move individuals inside habitat chamber
                    for (const ind of individuals) {
                        ind.x += ind.vx * dt;
                        ind.y += ind.vy * dt;
                        if (ind.x < 30 || ind.x > cW - 20) ind.vx *= -1;
                        if (ind.y < 40 || ind.y > cH + 10) ind.vy *= -1;
                    }
                }

                // 1. Draw Population Habitat
                p.fill('rgba(15, 17, 23, 0.6)');
                p.stroke('#283150');
                p.strokeWeight(2);
                p.rect(16, 20, cW - 20, cH, 8);

                // 2. Render Individuals
                let countAA = 0, countAa = 0, countaa = 0;
                for (const ind of individuals) {
                    const isAA = ind.a1 === 'A' && ind.a2 === 'A';
                    const isaa = ind.a1 === 'a' && ind.a2 === 'a';

                    p.stroke('#07090f');
                    p.strokeWeight(1.5);

                    if (isAA) {
                        countAA++;
                        p.fill('#2dd4bf'); // Teal (AA)
                    } else if (isaa) {
                        countaa++;
                        p.fill('#e8a04c'); // Amber (aa)
                    } else {
                        countAa++;
                        p.fill('#4ade80'); // Green (Aa carrier)
                    }
                    p.circle(ind.x, ind.y, 14);

                    p.fill('#07090f');
                    p.noStroke();
                    p.textSize(8);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.text(isAA ? 'AA' : (isaa ? 'aa' : 'Aa'), ind.x, ind.y);
                }

                // 3. Draw Generational Time Series Chart
                const graphX = cW + 20;
                const graphY = 30;
                const graphW = p.width - graphX - 25;
                const graphH = cH - 20;

                // Frame
                p.stroke('#283150');
                p.strokeWeight(1.5);
                p.line(graphX, graphY + graphH, graphX + graphW, graphY + graphH); // X axis
                p.line(graphX, graphY, graphX, graphY + graphH); // Y axis

                // Reference lines: p = 0.5 (equilibrium), p = 1.0 (fixation), p = 0.0 (loss)
                p.stroke('#1e2438');
                p.strokeWeight(1);
                p.line(graphX, graphY + graphH * 0.5, graphX + graphW, graphY + graphH * 0.5);

                p.fill('#94a3b8');
                p.noStroke();
                p.textSize(10);
                p.textAlign(p.LEFT, p.TOP);
                p.text('Allele Frequency p (A)', graphX + 8, graphY);
                p.text('1.0 (Fixation)', graphX + 8, graphY + 16);
                p.text('0.5', graphX + 8, graphY + graphH * 0.5 - 6);
                p.text('0.0 (Loss)', graphX + 8, graphY + graphH - 14);

                p.textAlign(p.RIGHT, p.BOTTOM);
                p.text('Generations →', graphX + graphW, graphY + graphH + 18);

                // Plot p(t) trajectory curve
                if (pFreqHistory.length > 1) {
                    p.noFill();
                    p.stroke('#2dd4bf'); // Teal line
                    p.strokeWeight(2.5);
                    p.beginShape();
                    for (let i = 0; i < pFreqHistory.length; i++) {
                        const gx = graphX + (i / 120) * graphW;
                        const gy = (graphY + graphH) - pFreqHistory[i] * graphH;
                        p.vertex(gx, gy);
                    }
                    p.endShape();
                }

                // Current allele metrics
                const curP = pFreqHistory[pFreqHistory.length - 1];
                const curQ = 1.0 - curP;
                const heterozygosity = 2 * curP * curQ;

                ctx._telemetry = {
                    'Allele p (A)': `${curP.toFixed(2)}`,
                    'Allele q (a)': `${curQ.toFixed(2)}`,
                    'Heterozygosity (2pq)': `${heterozygosity.toFixed(2)}`,
                    'Generation': `${generation}`
                };
                ctx.updateTelemetry();

                // Legend
                p.fill('#94a3b8');
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Teal = AA • Green = Aa • Amber = aa • Selection s > 0 removes aa; small N causes random drift', 16, p.height - 14);
            };
        }
    });

    sim.mount();
    return sim;
};
