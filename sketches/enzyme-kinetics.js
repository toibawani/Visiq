// ===== ENZYME KINETICS (MICHAELIS-MENTEN) =====
// Catalysis of Substrate into Product via Enzyme active site binding
// Biology: E + S ⇌ ES → E + P, velocity v = (Vmax · [S]) / (Km + [S])

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'enzyme-kinetics',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            substrateConc: { value: 35, min: 5, max: 100, step: 5, label: 'Substrate Conc [S]', unit: 'mM' },
            enzymeCount: { value: 12, min: 4, max: 25, step: 1, label: 'Enzymes [E]', unit: 'units' },
            inhibitorConc: { value: 0, min: 0, max: 40, step: 5, label: 'Inhibitor [I]', unit: 'mM' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Reaction Rate (v)': '0.0 μmol/s',
                'Max Velocity (Vmax)': '0.0 μmol/s',
                'Affinity (Km)': '25.0 mM',
                'Products Formed': '0'
            };
        },
        setup(p, ctx) {
            let enzymes = [];
            let substrates = [];
            let products = [];
            let inhibitors = [];
            let totalProductsFormed = 0;

            const chamberW = () => p.width * 0.58;

            function initMolecules() {
                enzymes = [];
                substrates = [];
                products = [];
                inhibitors = [];

                const cW = chamberW();
                const cH = p.height - 70;

                // Create Enzymes
                for (let i = 0; i < ctx.params.enzymeCount; i++) {
                    enzymes.push({
                        x: 30 + Math.random() * (cW - 60),
                        y: 40 + Math.random() * (cH - 60),
                        vx: (Math.random() - 0.5) * 1.5,
                        vy: (Math.random() - 0.5) * 1.5,
                        radius: 16,
                        state: 'free', // 'free', 'bound-S', 'bound-I'
                        boundTimer: 0
                    });
                }

                // Create Substrates
                for (let i = 0; i < ctx.params.substrateConc; i++) {
                    substrates.push({
                        x: 20 + Math.random() * (cW - 40),
                        y: 30 + Math.random() * (cH - 40),
                        vx: (Math.random() - 0.5) * 2.8,
                        vy: (Math.random() - 0.5) * 2.8,
                        radius: 5
                    });
                }

                // Create Inhibitors
                for (let i = 0; i < ctx.params.inhibitorConc; i++) {
                    inhibitors.push({
                        x: 20 + Math.random() * (cW - 40),
                        y: 30 + Math.random() * (cH - 40),
                        vx: (Math.random() - 0.5) * 2.8,
                        vy: (Math.random() - 0.5) * 2.8,
                        radius: 5
                    });
                }
            }

            initMolecules();
            ctx.onReset = () => {
                totalProductsFormed = 0;
                initMolecules();
            };
            ctx.onResize = initMolecules;
            ctx.onParamChange = initMolecules;

            p.draw = function() {
                p.background(7, 9, 15);

                const dt = ctx.speed;
                const cW = chamberW();
                const cH = p.height - 70;
                const S = ctx.params.substrateConc;
                const I = ctx.params.inhibitorConc;
                const E_count = ctx.params.enzymeCount;

                // 1. Draw Reaction Chamber Border
                p.stroke('#283150');
                p.strokeWeight(2);
                p.fill('rgba(15, 17, 23, 0.6)');
                p.rect(16, 20, cW - 16, cH, 8);

                // 2. Molecular simulation update
                if (ctx.isPlaying) {
                    // Update Enzymes
                    for (const e of enzymes) {
                        e.x += e.vx * dt;
                        e.y += e.vy * dt;

                        if (e.x - e.radius < 20 || e.x + e.radius > cW) e.vx *= -1;
                        if (e.y - e.radius < 24 || e.y + e.radius > cH + 16) e.vy *= -1;

                        if (e.state === 'bound-S') {
                            e.boundTimer += dt;
                            // Catalysis event: release Product
                            if (e.boundTimer > 35) {
                                e.state = 'free';
                                e.boundTimer = 0;
                                totalProductsFormed++;
                                products.push({
                                    x: e.x + (Math.random() - 0.5) * 20,
                                    y: e.y + (Math.random() - 0.5) * 20,
                                    vx: (Math.random() - 0.5) * 3,
                                    vy: (Math.random() - 0.5) * 3,
                                    radius: 5
                                });
                                if (products.length > 50) products.shift();
                            }
                        } else if (e.state === 'bound-I') {
                            e.boundTimer += dt;
                            // Reversible inhibition unbind
                            if (e.boundTimer > 50) {
                                e.state = 'free';
                                e.boundTimer = 0;
                                inhibitors.push({
                                    x: e.x + 20,
                                    y: e.y,
                                    vx: (Math.random() - 0.5) * 2,
                                    vy: (Math.random() - 0.5) * 2,
                                    radius: 5
                                });
                            }
                        }
                    }

                    // Update Substrates & Check Active Site Collisions
                    for (let i = substrates.length - 1; i >= 0; i--) {
                        const s = substrates[i];
                        s.x += s.vx * dt;
                        s.y += s.vy * dt;

                        if (s.x < 20 || s.x > cW) s.vx *= -1;
                        if (s.y < 24 || s.y > cH + 16) s.vy *= -1;

                        // Binding to free enzyme
                        for (const e of enzymes) {
                            if (e.state === 'free' && Math.hypot(s.x - e.x, s.y - e.y) < e.radius) {
                                e.state = 'bound-S';
                                e.boundTimer = 0;
                                substrates.splice(i, 1);
                                break;
                            }
                        }
                    }

                    // Replenish consumed substrates to maintain steady-state [S]
                    while (substrates.length < S) {
                        substrates.push({
                            x: 20 + Math.random() * (cW - 40),
                            y: 30 + Math.random() * (cH - 40),
                            vx: (Math.random() - 0.5) * 2.8,
                            vy: (Math.random() - 0.5) * 2.8,
                            radius: 5
                        });
                    }

                    // Update Inhibitors & Check Binding
                    for (let i = inhibitors.length - 1; i >= 0; i--) {
                        const inh = inhibitors[i];
                        inh.x += inh.vx * dt;
                        inh.y += inh.vy * dt;

                        if (inh.x < 20 || inh.x > cW) inh.vx *= -1;
                        if (inh.y < 24 || inh.y > cH + 16) inh.vy *= -1;

                        for (const e of enzymes) {
                            if (e.state === 'free' && Math.hypot(inh.x - e.x, inh.y - e.y) < e.radius) {
                                e.state = 'bound-I';
                                e.boundTimer = 0;
                                inhibitors.splice(i, 1);
                                break;
                            }
                        }
                    }

                    // Update Products
                    for (const pr of products) {
                        pr.x += pr.vx * dt;
                        pr.y += pr.vy * dt;
                        if (pr.x < 20 || pr.x > cW) pr.vx *= -1;
                        if (pr.y < 24 || pr.y > cH + 16) pr.vy *= -1;
                    }
                }

                // 3. Render Molecules in Chamber
                // Products (Amber diamonds)
                p.fill('#e8a04c');
                p.noStroke();
                for (const pr of products) {
                    p.rect(pr.x - 4, pr.y - 4, 8, 8);
                }

                // Substrates (Teal circles)
                p.fill('#2dd4bf');
                for (const s of substrates) {
                    p.circle(s.x, s.y, s.radius * 2);
                }

                // Inhibitors (Red triangles)
                p.fill('#f87171');
                for (const inh of inhibitors) {
                    p.triangle(inh.x, inh.y - 5, inh.x - 5, inh.y + 5, inh.x + 5, inh.y + 5);
                }

                // Enzymes (Violet spheres with active site notch)
                for (const e of enzymes) {
                    p.stroke('#07090f');
                    p.strokeWeight(2);
                    if (e.state === 'bound-S') {
                        p.fill('#4ade80'); // Green when actively processing
                    } else if (e.state === 'bound-I') {
                        p.fill('#f87171'); // Red when inhibited
                    } else {
                        p.fill('#7c6af7'); // Violet when free
                    }
                    p.circle(e.x, e.y, e.radius * 2);

                    // Notch
                    p.fill(7, 9, 15);
                    p.noStroke();
                    p.circle(e.x + e.radius * 0.5, e.y, 8);
                }

                // 4. Draw Michaelis-Menten Kinetic Curve (Right half of canvas)
                const graphX = cW + 30;
                const graphY = 30;
                const graphW = p.width - graphX - 25;
                const graphH = cH - 20;

                // Graph frame
                p.stroke('#283150');
                p.strokeWeight(1.5);
                p.line(graphX, graphY + graphH, graphX + graphW, graphY + graphH); // X axis ([S])
                p.line(graphX, graphY, graphX, graphY + graphH); // Y axis (v)

                // Labels
                p.fill('#94a3b8');
                p.noStroke();
                p.textSize(10);
                p.textAlign(p.LEFT, p.TOP);
                p.text('Reaction Velocity (v)', graphX + 8, graphY);
                p.textAlign(p.RIGHT, p.BOTTOM);
                p.text('Substrate [S] →', graphX + graphW, graphY + graphH + 18);

                // Michaelis-Menten equation calculations
                const Km = 25.0; // base Km
                const Ki = 15.0;
                const appKm = Km * (1 + I / Ki);
                const Vmax = E_count * 4.0;

                // Plot theoretical curve
                p.stroke('rgba(124, 106, 247, 0.7)');
                p.strokeWeight(2.5);
                p.noFill();
                p.beginShape();
                for (let sVal = 0; sVal <= 100; sVal += 2) {
                    const rate = (Vmax * sVal) / (appKm + sVal);
                    const gx = graphX + (sVal / 100) * graphW;
                    const gy = (graphY + graphH) - (rate / 120) * graphH;
                    p.vertex(gx, gy);
                }
                p.endShape();

                // Current operating point dot
                const currentV = (Vmax * S) / (appKm + S);
                const dotX = graphX + (S / 100) * graphW;
                const dotY = (graphY + graphH) - (currentV / 120) * graphH;

                p.fill('#e8a04c');
                p.stroke('#ffffff');
                p.strokeWeight(2);
                p.circle(dotX, dotY, 10);

                // Telemetry
                ctx._telemetry = {
                    'Reaction Rate (v)': `${currentV.toFixed(1)} μmol/s`,
                    'Max Velocity (Vmax)': `${Vmax.toFixed(1)} μmol/s`,
                    'Affinity (Km)': `${appKm.toFixed(1)} mM`,
                    'Products Formed': `${totalProductsFormed}`
                };
                ctx.updateTelemetry();

                // Legend
                p.fill('#94a3b8');
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Violet = Enzymes • Teal = Substrate • Red = Inhibitor • Amber = Product', 16, p.height - 14);
            };
        }
    });

    sim.mount();
    return sim;
};
