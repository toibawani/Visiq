// ===== EPIDEMIC SPREAD (SIR MODEL) =====
// Agent-based disease transmission dynamics and stacked SIR epidemiological curve
// Biology: Susceptible (S) → Infected (I) → Recovered (R), R₀ = β / γ

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'virus-spreading',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            population:       { value: 250, min: 60,  max: 600,  step: 20,  label: 'Population',        unit: 'agents' },
            transmissionProb: { value: 65,  min: 10,  max: 100,  step: 5,   label: 'Infection Rate (β)', unit: '%'     },
            recoveryTime:     { value: 7.0, min: 3.0, max: 15.0, step: 0.5, label: 'Recovery Duration',  unit: 's'     },
            vaccinationRate:  { value: 10,  min: 0,   max: 80,   step: 5,   label: 'Initial Immunity',   unit: '%'     }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Reproduction R₀': '—',
                'Active Cases (I)': '1',
                'Recovered (R)':    '0',
                'Herd Immunity':    '60%'
            };
        },

        setup(p, ctx) {
            // ── Color palette ──────────────────────────────────────────
            const BIO   = VisualKit.getCategoryRGB('biology');   // susceptible teal
            const RED   = [248, 113, 113];                        // infected red
            const GREEN = [74,  222, 128];                        // recovered green

            // ── State ──────────────────────────────────────────────────
            let agents     = [];
            let sirHistory = [];   // [{s, i, r, total}]
            let flashes    = [];   // collision flash events
            // Brief arrow flashes: {x1,y1,x2,y2,age,maxAge}
            let txArrows   = [];
            let timeElapsed = 0;
            const TRAIL_CAP  = 8;   // trail length per infected agent
            const CONTACT_R  = 14;  // infection contact radius (px)

            // ── Helper: arena bounds ───────────────────────────────────
            function arenaBounds() {
                const cW = p.width  * 0.52;
                const cH = p.height - 70;
                return { cW, cH };
            }

            // ── Init / Reset ───────────────────────────────────────────
            function initEpidemic() {
                agents      = [];
                sirHistory  = [];
                flashes     = [];
                txArrows    = [];
                timeElapsed = 0;

                const { cW, cH } = arenaBounds();
                const vaxRate = ctx.params.vaccinationRate / 100;
                const count   = Math.floor(ctx.params.population || 250);

                for (let i = 0; i < count; i++) {
                    let state = 'S';
                    if (i === 0)                    state = 'I';
                    else if (Math.random() < vaxRate) state = 'R';

                    agents.push({
                        x:  30 + Math.random() * (cW - 60),
                        y:  35 + Math.random() * (cH - 60),
                        vx: (Math.random() - 0.5) * 2.2,
                        vy: (Math.random() - 0.5) * 2.2,
                        radius: 4,
                        state,
                        infectionTime: 0,
                        trail: [],       // only used when state === 'I'
                        pulsePhase: Math.random() * Math.PI * 2  // for pulsing infection ring
                    });
                }
            }

            initEpidemic();
            ctx.onReset       = initEpidemic;
            ctx.onResize      = initEpidemic;
            ctx.onParamChange = (k) => {
                if (k === 'vaccinationRate' || k === 'population') initEpidemic();
            };

            // ── Draw loop ──────────────────────────────────────────────
            p.draw = function() {
                p.background(7, 9, 15);

                const dt = (1 / 60) * ctx.speed;
                const { cW, cH } = arenaBounds();
                const beta    = ctx.params.transmissionProb / 100;
                const recTime = ctx.params.recoveryTime;

                // ────────────────────────────────────────────────────────
                // 1. Simulate
                // ────────────────────────────────────────────────────────
                let countS = 0, countI = 0, countR = 0;

                if (ctx.isPlaying) {
                    timeElapsed += dt;

                    // Spatial hash for O(N) contact checks
                    const cellSize = 24; // > CONTACT_R
                    const grid = new Map();
                    const hashCell = (gx, gy) => (gx << 16) ^ gy;

                    for (let i = 0; i < agents.length; i++) {
                        const a = agents[i];
                        a.x += a.vx * ctx.speed;
                        a.y += a.vy * ctx.speed;

                        // Wall bounces
                        if (a.x < 24 || a.x > cW - 14)  a.vx *= -1;
                        if (a.y < 28 || a.y > cH + 14)  a.vy *= -1;

                        // Recovery
                        if (a.state === 'I') {
                            a.infectionTime += dt;
                            // Update trail
                            a.trail.push({ x: a.x, y: a.y });
                            if (a.trail.length > TRAIL_CAP) a.trail.shift();

                            if (a.infectionTime >= recTime) {
                                a.state = 'R';
                                a.trail = [];
                            }
                        } else if (a.state === 'S') {
                            // Register susceptible into spatial grid
                            const gx  = Math.floor(a.x / cellSize);
                            const gy  = Math.floor(a.y / cellSize);
                            const key = hashCell(gx, gy);
                            let bucket = grid.get(key);
                            if (!bucket) { bucket = []; grid.set(key, bucket); }
                            bucket.push(a);
                        }
                    }

                    // Transmission via spatial hash
                    const radiusSq = CONTACT_R * CONTACT_R;
                    for (let i = 0; i < agents.length; i++) {
                        const a = agents[i];
                        if (a.state !== 'I') continue;
                        const gx = Math.floor(a.x / cellSize);
                        const gy = Math.floor(a.y / cellSize);

                        for (let ox = -1; ox <= 1; ox++) {
                            for (let oy = -1; oy <= 1; oy++) {
                                const bucket = grid.get(hashCell(gx + ox, gy + oy));
                                if (!bucket) continue;
                                for (let b = 0; b < bucket.length; b++) {
                                    const other = bucket[b];
                                    if (other.state !== 'S') continue;
                                    const dx = a.x - other.x;
                                    const dy = a.y - other.y;
                                    if (dx * dx + dy * dy < radiusSq) {
                                        if (Math.random() < beta * 0.15) {
                                            other.state          = 'I';
                                            other.infectionTime  = 0;
                                            other.trail          = [];
                                            // Collision flash at infectee
                                            flashes.push(VisualKit.createCollisionFlash(
                                                other.x, other.y, 10, 28
                                            ));
                                            // Brief transmission arrow (infector → infectee)
                                            txArrows.push({
                                                x1: a.x, y1: a.y,
                                                x2: other.x, y2: other.y,
                                                age: 0, maxAge: 18
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // SIR census every 10 frames
                    if (p.frameCount % 10 === 0) {
                        for (const a of agents) {
                            if (a.state === 'S')      countS++;
                            else if (a.state === 'I') countI++;
                            else                       countR++;
                        }
                        const total = countS + countI + countR;
                        sirHistory.push({ s: countS, i: countI, r: countR, total });
                        if (sirHistory.length > 150) sirHistory.shift();
                    }
                }

                // Static census when paused
                if (!ctx.isPlaying) {
                    for (const a of agents) {
                        if (a.state === 'S')      countS++;
                        else if (a.state === 'I') countI++;
                        else                       countR++;
                    }
                }

                // ────────────────────────────────────────────────────────
                // 2. Arena background
                // ────────────────────────────────────────────────────────
                p.push();
                p.fill(15, 17, 23, 200);
                p.stroke(35, 48, 70);
                p.strokeWeight(1.5);
                p.rect(16, 20, cW - 20, cH, 8);
                p.pop();

                // ────────────────────────────────────────────────────────
                // 3. Transmission arrows (brief flash)
                // ────────────────────────────────────────────────────────
                txArrows = txArrows.filter(arr => arr.age < arr.maxAge);
                for (const arr of txArrows) {
                    const t = 1 - arr.age / arr.maxAge;
                    VisualKit.drawArrow(
                        p,
                        arr.x1, arr.y1, arr.x2, arr.y2,
                        RED, t * t * 180, 1.2, 6
                    );
                    arr.age++;
                }

                // ────────────────────────────────────────────────────────
                // 4. Agent trails (infected only)
                // ────────────────────────────────────────────────────────
                for (const a of agents) {
                    if (a.state === 'I' && a.trail.length >= 2) {
                        VisualKit.drawFadingTrail(p, a.trail, RED, {
                            exponent: 2.0, maxAlpha: 110,
                            minWeight: 0.8, maxWeight: 1.8
                        });
                    }
                }

                // ────────────────────────────────────────────────────────
                // 5. Pulsing infection-radius rings on infected agents
                // ────────────────────────────────────────────────────────
                p.push();
                p.noFill();
                for (const a of agents) {
                    if (a.state !== 'I') continue;
                    a.pulsePhase += 0.06 * ctx.speed;
                    const pulse = (Math.sin(a.pulsePhase) * 0.5 + 0.5); // 0…1
                    const ringR = CONTACT_R + pulse * 6;
                    p.stroke(RED[0], RED[1], RED[2], pulse * pulse * 38);
                    p.strokeWeight(1.5);
                    p.circle(a.x, a.y, ringR * 2);
                }
                p.pop();

                // ────────────────────────────────────────────────────────
                // 6. Agents (glow bodies)
                // ────────────────────────────────────────────────────────
                for (const a of agents) {
                    let rgb;
                    if      (a.state === 'S') rgb = BIO;
                    else if (a.state === 'I') rgb = RED;
                    else                      rgb = GREEN;

                    VisualKit.drawGlowBody(p, a.x, a.y, a.radius, rgb, {
                        outerMult:    2.4,
                        innerMult:    1.5,
                        outerAlpha:   a.state === 'I' ? 45 : 18,
                        innerAlpha:   a.state === 'I' ? 90 : 50,
                        strokeWidth:  1,
                        specular:     a.state !== 'S'  // highlight infected + recovered
                    });
                }

                // ────────────────────────────────────────────────────────
                // 7. Collision flashes (transmission events)
                // ────────────────────────────────────────────────────────
                flashes = VisualKit.updateCollisionFlashes(p, flashes);

                // ────────────────────────────────────────────────────────
                // 8. SIR Epicurve panel (right side)
                // ────────────────────────────────────────────────────────
                const graphX = cW + 20;
                const graphY = 20;
                const graphW = p.width - graphX - 16;
                const graphH = cH - 10;

                // Panel chrome
                VisualKit.drawInsetPanel(p, graphX, graphY, graphW, graphH,
                    'SIR Outbreak Curve', { align: 'left', cornerRadius: 8, textSize: 9 });

                // Axes
                const axL = graphX + 8;
                const axR = graphX + graphW - 8;
                const axB = graphY + graphH - 18;
                const axT = graphY + 20;
                const axH = axB - axT;
                const axW = axR - axL;

                p.push();
                p.stroke(40, 55, 80);
                p.strokeWeight(1);
                p.line(axL, axT, axL, axB);
                p.line(axL, axB, axR, axB);
                p.fill(55, 75, 110);
                p.noStroke();
                p.textSize(8);
                p.textAlign(p.RIGHT, p.BOTTOM);
                p.text('Time →', axR, axB + 14);
                p.pop();

                // Plot three SIR curves
                if (sirHistory.length > 1) {
                    const maxTotal = agents.length;
                    const curves = [
                        { key: 's', rgb: BIO,   label: 'S' },
                        { key: 'i', rgb: RED,   label: 'I' },
                        { key: 'r', rgb: GREEN, label: 'R' }
                    ];

                    for (const curve of curves) {
                        p.push();
                        p.noFill();
                        p.stroke(curve.rgb[0], curve.rgb[1], curve.rgb[2], 200);
                        p.strokeWeight(1.8);
                        p.beginShape();
                        for (let i = 0; i < sirHistory.length; i++) {
                            const vx = axL + (i / Math.max(sirHistory.length - 1, 1)) * axW;
                            const vy = axB - (sirHistory[i][curve.key] / maxTotal) * axH;
                            p.vertex(vx, vy);
                        }
                        p.endShape();
                        p.pop();
                    }

                    // Legend inside panel
                    const legItems = [
                        { label: 'S', rgb: BIO },
                        { label: 'I', rgb: RED },
                        { label: 'R', rgb: GREEN }
                    ];
                    let legX = axL;
                    for (const li of legItems) {
                        p.push();
                        p.noStroke();
                        p.fill(li.rgb[0], li.rgb[1], li.rgb[2]);
                        p.circle(legX + 4, graphY + graphH - 8, 5);
                        p.fill(130, 150, 180);
                        p.textSize(7.5);
                        p.textAlign(p.LEFT, p.CENTER);
                        p.text(li.label, legX + 10, graphY + graphH - 8);
                        p.pop();
                        legX += 22;
                    }
                }

                // ────────────────────────────────────────────────────────
                // 9. Active case sparkline mini-panel
                // ────────────────────────────────────────────────────────
                if (sirHistory.length >= 2) {
                    const spkX = graphX;
                    const spkY = graphY + graphH + 8;
                    const spkW = graphW;
                    const spkH = 40;
                    if (spkY + spkH < p.height - 8) {
                        VisualKit.drawSparkline(
                            p, spkX, spkY, spkW, spkH,
                            sirHistory.map(h => h.i),
                            RED,
                            { label: 'Active I(t)', zeroFloor: true, cornerRadius: 6, textSize: 8 }
                        );
                    }
                }

                // ────────────────────────────────────────────────────────
                // 10. Telemetry
                // ────────────────────────────────────────────────────────
                const R0 = (beta * recTime * 0.6).toFixed(2);
                const herdThreshold = Math.max(0,
                    Math.round((1 - 1 / Math.max(1.0, parseFloat(R0))) * 100)
                );

                ctx._telemetry = {
                    'Reproduction R₀': `${R0}`,
                    'Active Cases (I)': `${countI}`,
                    'Recovered (R)':    `${countR}`,
                    'Herd Immunity':    `${herdThreshold}%`
                };
                ctx.updateTelemetry();

                // ────────────────────────────────────────────────────────
                // 11. Footer legend
                // ────────────────────────────────────────────────────────
                p.push();
                p.noStroke();
                p.fill(80, 100, 130);
                p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text(
                    'Teal = Susceptible  ·  Red = Infected  ·  Green = Recovered  ·  R = new outbreak',
                    16, p.height - 10
                );
                p.pop();
            };
        }
    });

    sim.mount();
    return sim;
};
