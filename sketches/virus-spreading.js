// ===== EPIDEMIC SPREAD (SIR MODEL) =====
// Agent-based disease transmission dynamics and stacked SIR epidemiological curve
// Biology: Susceptible (S) → Infected (I) → Recovered (R), R₀ = β / γ

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'virus-spreading',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            transmissionProb: { value: 65, min: 10, max: 100, step: 5, label: 'Infection Rate (β)', unit: '%' },
            recoveryTime: { value: 7.0, min: 3.0, max: 15.0, step: 0.5, label: 'Recovery Duration', unit: 's' },
            vaccinationRate: { value: 10, min: 0, max: 80, step: 5, label: 'Initial Immunity', unit: '%' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Reproduction R₀': '2.50',
                'Active Cases (I)': '1',
                'Immune / Rec (R)': '0%',
                'Herd Immunity': '60%'
            };
        },
        setup(p, ctx) {
            let agents = [];
            let sirHistory = [];
            const totalAgents = 100;
            let timeElapsed = 0;

            function initEpidemic() {
                agents = [];
                sirHistory = [];
                timeElapsed = 0;

                const cW = p.width * 0.52;
                const cH = p.height - 70;
                const vaxRate = ctx.params.vaccinationRate / 100;

                // Create population: 1 index case, vaxRate immune, remainder susceptible
                for (let i = 0; i < totalAgents; i++) {
                    let state = 'S'; // Susceptible
                    if (i === 0) {
                        state = 'I'; // Patient zero
                    } else if (Math.random() < vaxRate) {
                        state = 'R'; // Pre-vaccinated / immune
                    }

                    agents.push({
                        x: 30 + Math.random() * (cW - 60),
                        y: 35 + Math.random() * (cH - 60),
                        vx: (Math.random() - 0.5) * 2.2,
                        vy: (Math.random() - 0.5) * 2.2,
                        radius: 5,
                        state: state,
                        infectionTime: 0
                    });
                }
            }

            initEpidemic();
            ctx.onReset = initEpidemic;
            ctx.onResize = initEpidemic;
            ctx.onParamChange = (k) => {
                if (k === 'vaccinationRate') initEpidemic();
            };

            p.draw = function() {
                p.background(7, 9, 15);

                const dt = (1 / 60) * ctx.speed;
                const cW = p.width * 0.52;
                const cH = p.height - 70;
                const beta = ctx.params.transmissionProb / 100;
                const recTime = ctx.params.recoveryTime;

                let countS = 0;
                let countI = 0;
                let countR = 0;

                // 1. Update Agents
                if (ctx.isPlaying) {
                    timeElapsed += dt;

                    for (let i = 0; i < agents.length; i++) {
                        const a = agents[i];
                        a.x += a.vx * ctx.speed;
                        a.y += a.vy * ctx.speed;

                        // Wall bounces
                        if (a.x < 24 || a.x > cW - 14) a.vx *= -1;
                        if (a.y < 28 || a.y > cH + 14) a.vy *= -1;

                        // Recovery logic
                        if (a.state === 'I') {
                            a.infectionTime += dt;
                            if (a.infectionTime >= recTime) {
                                a.state = 'R'; // Recovered and immune
                            }
                        }

                        // Contact infection transmission
                        if (a.state === 'I') {
                            for (let j = 0; j < agents.length; j++) {
                                const other = agents[j];
                                if (other.state === 'S') {
                                    const d = Math.hypot(a.x - other.x, a.y - other.y);
                                    if (d < 14) {
                                        if (Math.random() < beta * 0.15) {
                                            other.state = 'I';
                                            other.infectionTime = 0;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Sample population census every 10 frames
                    if (p.frameCount % 10 === 0) {
                        for (const a of agents) {
                            if (a.state === 'S') countS++;
                            else if (a.state === 'I') countI++;
                            else countR++;
                        }
                        sirHistory.push({ s: countS, i: countI, r: countR });
                        if (sirHistory.length > 140) sirHistory.shift();
                    }
                } else {
                    for (const a of agents) {
                        if (a.state === 'S') countS++;
                        else if (a.state === 'I') countI++;
                        else countR++;
                    }
                }

                // 2. Render Habitual Arena
                p.fill('rgba(15, 17, 23, 0.6)');
                p.stroke('#283150');
                p.strokeWeight(2);
                p.rect(16, 20, cW - 20, cH, 8);

                // 3. Render Population Agents
                for (const a of agents) {
                    p.noStroke();
                    if (a.state === 'S') {
                        p.fill('#2dd4bf'); // Teal (Susceptible)
                    } else if (a.state === 'I') {
                        p.fill('#f87171'); // Red (Infected)
                        // Infection halo
                        p.fill('rgba(248, 113, 113, 0.2)');
                        p.circle(a.x, a.y, 16);
                        p.fill('#f87171');
                    } else {
                        p.fill('#4ade80'); // Green (Recovered / Immune)
                    }
                    p.circle(a.x, a.y, a.radius * 2);
                }

                // 4. Render SIR Stacked Epicurve (Right side of canvas)
                const graphX = cW + 20;
                const graphY = 30;
                const graphW = p.width - graphX - 25;
                const graphH = cH - 20;

                // Frame
                p.stroke('#283150');
                p.strokeWeight(1.5);
                p.line(graphX, graphY + graphH, graphX + graphW, graphY + graphH);
                p.line(graphX, graphY, graphX, graphY + graphH);

                p.fill('#94a3b8');
                p.noStroke();
                p.textSize(10);
                p.textAlign(p.LEFT, p.TOP);
                p.text('SIR Outbreak Curve', graphX + 8, graphY);
                p.textAlign(p.RIGHT, p.BOTTOM);
                p.text('Time →', graphX + graphW, graphY + graphH + 18);

                // Plot stacked curves
                if (sirHistory.length > 1) {
                    p.strokeWeight(2);

                    // Susceptible Curve (Teal)
                    p.noFill();
                    p.stroke('#2dd4bf');
                    p.beginShape();
                    for (let i = 0; i < sirHistory.length; i++) {
                        const gx = graphX + (i / 140) * graphW;
                        const gy = (graphY + graphH) - (sirHistory[i].s / totalAgents) * graphH;
                        p.vertex(gx, gy);
                    }
                    p.endShape();

                    // Infected Curve (Red)
                    p.stroke('#f87171');
                    p.beginShape();
                    for (let i = 0; i < sirHistory.length; i++) {
                        const gx = graphX + (i / 140) * graphW;
                        const gy = (graphY + graphH) - (sirHistory[i].i / totalAgents) * graphH;
                        p.vertex(gx, gy);
                    }
                    p.endShape();

                    // Recovered Curve (Green)
                    p.stroke('#4ade80');
                    p.beginShape();
                    for (let i = 0; i < sirHistory.length; i++) {
                        const gx = graphX + (i / 140) * graphW;
                        const gy = (graphY + graphH) - (sirHistory[i].r / totalAgents) * graphH;
                        p.vertex(gx, gy);
                    }
                    p.endShape();
                }

                // Telemetry
                const R0 = (beta * recTime * 0.6).toFixed(2);
                const herdThreshold = Math.max(0, Math.round((1 - 1 / Math.max(1.0, parseFloat(R0))) * 100));

                ctx._telemetry = {
                    'Reproduction R₀': `${R0}`,
                    'Active Cases (I)': `${countI}`,
                    'Immune / Rec (R)': `${countR}%`,
                    'Herd Immunity': `${herdThreshold}%`
                };
                ctx.updateTelemetry();

                // Legend
                p.fill('#94a3b8');
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Teal = Susceptible • Red = Infected • Green = Recovered/Immune • R to trigger new outbreak', 16, p.height - 14);
            };
        }
    });

    sim.mount();
    return sim;
};
