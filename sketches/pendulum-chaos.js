// ===== DOUBLE PENDULUM CHAOS =====
// Chaotic dynamics and sensitive dependence on initial conditions
// Physics: Lagrangian mechanics with RK4 integration

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'pendulum-chaos',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            rodLength1: { value: 120, min: 60,  max: 200, step: 5,   label: 'Upper Rod (L1)', unit: 'px'   },
            rodLength2: { value: 120, min: 60,  max: 200, step: 5,   label: 'Lower Rod (L2)', unit: 'px'   },
            bobMass1:   { value: 10,  min: 2,   max: 30,  step: 1,   label: 'Upper Mass (m1)', unit: 'kg' },
            bobMass2:   { value: 10,  min: 2,   max: 30,  step: 1,   label: 'Lower Mass (m2)', unit: 'kg' },
            gravity:    { value: 9.8, min: 0,   max: 25,  step: 0.5, label: 'Gravity (g)',     unit: 'm/s2' }
        },
        // Rods are drawn at 100 px per metre (physics uses rodLength * 0.01 m),
        // so the ruler can report real units on this sketch.
        scale: { unit: 'm', pxPerUnit: 100 },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Total Energy': '0.0 J',
                'Lyapunov Delta': '0.000 rad',
                'Omega 1': '0.0 rad/s',
                'Omega 2': '0.0 rad/s'
            };
        },
        setup(p, ctx) {
            let stateA = [Math.PI / 2, Math.PI / 2, 0, 0];
            let stateB = [Math.PI / 2 + 0.001, Math.PI / 2, 0, 0];

            let trailA = [], trailB = [];
            let phaseHistory = [];
            let energyHistory = [];
            let baseEnergy = null;
            let draggedBob = null;
            let prevDragAngle = 0, lastDragDelta = 0;

            // --- Integrator selection (Feature: Pick the Integrator) ---
            const Integrators = window.VisiqIntegrators;
            const INTEGRATOR_ORDER = Integrators ? Integrators.order : ['rk4'];
            let currentIntegrator = 'rk4';
            // Shared integrators take the derivative function as the first arg
            // (step(f, s, dt)); the local fallback rk4 uses (s, dt). bindStep
            // adapts a shared step to the sketch's (s, dt) convention by
            // closing over this pendulum's derivatives(), so activeStep(s, dt)
            // works regardless of which integrator is selected.
            function bindStep(stepFn) {
                return (s, dt) => stepFn(derivatives, s, dt);
            }
            let activeStep = Integrators ? bindStep(Integrators.METHODS.rk4.step) : rk4;

            // One-sentence explanation shown under the integrator switch.
            const INTEGRATOR_NOTE = {
                euler:  'Euler adds a little energy every step, so orbits slowly spiral outward instead of closing.',
                semi:   'Semi-implicit Euler updates velocity first, so it stays stable and barely drifts.',
                verlet: 'Verlet averages old and new acceleration, so energy stays nearly flat over long runs.',
                rk4:    'RK4 samples the slope four times per step, so it tracks the true orbit most faithfully.'
            };

            // --- Guess mode (Feature: Draw Your Guess) ---
            // The guess is drawn on a position-vs-time graph: lower-bob height (m)
            // on y, time (s) on x. Points are stored normalized to that graph
            // (x: 0..1 over 0..GUESS_T seconds, y: 0..1 over guessYRange metres).
            let guessMode = false;
            let guessPoints = [];      // drawn curve in normalized graph space
            let isDrawingGuess = false;
            let trueCurve = [];        // true height-vs-time curve, same space
            let showOverlay = false;   // shade gap + overlay true curve after compare
            let lastPercentOff = null;
            let compareRunning = false;
            let savedPlayState = true; // play/pause to restore when guess mode ends
            let guessYRange = { min: -1, max: 1 };
            const GUESS_T = 6;         // seconds of sim time the graph covers
            const GUESS_DT = 0.01;     // fixed timestep (s) for the headless compare
            const GUESS_STORAGE_KEY = 'visiq-pendulum-guess-history';

            function loadGuessHistory() {
                try {
                    const raw = localStorage.getItem(GUESS_STORAGE_KEY);
                    if (!raw) return [];
                    const parsed = JSON.parse(raw);
                    return Array.isArray(parsed)
                        ? parsed.filter(e => e && typeof e.percentOff === 'number')
                        : [];
                } catch (e) {
                    return [];
                }
            }

            function saveGuessHistory(history) {
                try {
                    localStorage.setItem(GUESS_STORAGE_KEY, JSON.stringify(history.slice(-20)));
                } catch (e) {
                    // Storage unavailable (private mode / quota) — ignore silently.
                }
            }

            let guessHistory = loadGuessHistory();

            // Snapshot of the state a guess is measured from (set when guess mode turns on).
            let guessInitState = stateA.slice();

            // Graph geometry in canvas pixels: panel the guess is drawn on.
            function guessGraphRect() {
                const w = Math.min(p.width * 0.62, 560);
                const h = Math.min(p.height * 0.52, 320);
                return { x: (p.width - w) / 2, y: (p.height - h) / 2 + 8, w, h };
            }

            // Canvas px -> normalized graph coords (0..1, y up).
            function toGraphNorm(px, py) {
                const r = guessGraphRect();
                return {
                    x: Math.min(1, Math.max(0, (px - r.x) / r.w)),
                    y: Math.min(1, Math.max(0, 1 - (py - r.y) / r.h))
                };
            }

            // Normalized graph coords -> canvas px.
            function fromGraphNorm(n) {
                const r = guessGraphRect();
                return { x: r.x + n.x * r.w, y: r.y + (1 - n.y) * r.h };
            }

            // True height (m) of the lower bob relative to the pivot at state s.
            function lowerBobHeight(s) {
                const l1m = ctx.params.rodLength1 * 0.01;
                const l2m = ctx.params.rodLength2 * 0.01;
                return l1m * Math.cos(s[0]) + l2m * Math.cos(s[1]);
            }

            // Sample a normalized graph curve at normalized x (linear interp, y up).
            function sampleCurveY(curve, nx) {
                if (curve.length === 0) return null;
                if (curve.length === 1) return curve[0].y;
                if (nx <= curve[0].x) return curve[0].y;
                if (nx >= curve[curve.length - 1].x) return curve[curve.length - 1].y;
                for (let i = 1; i < curve.length; i++) {
                    if (nx <= curve[i].x) {
                        const x0 = curve[i - 1].x, x1 = curve[i].x;
                        const span = x1 - x0;
                        if (span <= 1e-9) return curve[i].y;
                        const f = (nx - x0) / span;
                        return curve[i - 1].y + (curve[i].y - curve[i - 1].y) * f;
                    }
                }
                return curve[curve.length - 1].y;
            }

            // Percent off: samples both curves at 96 shared time points and averages
            // the VERTICAL gap between drawn guess and true curve, expressed as a
            // percentage of the graph's full height (i.e. of guessYRange metres).
            // Compares value-vs-value at equal times — not path shapes.
            function computePercentOff(guess, truth) {
                if (guess.length < 5 || truth.length < 5) return null;
                const M = 96;
                let sum = 0;
                let n = 0;
                for (let i = 0; i < M; i++) {
                    const nx = i / (M - 1);
                    const gy = sampleCurveY(guess, nx);
                    const ty = sampleCurveY(truth, nx);
                    if (gy === null || ty === null) continue;
                    sum += Math.abs(gy - ty); // 0..1 of graph height
                    n++;
                }
                if (n === 0) return null;
                return Math.min(100, (sum / n) * 100);
            }

            // Run the physics headlessly over GUESS_T seconds at fixed GUESS_DT,
            // recording the true lower-bob height curve in normalized graph space.
            function runCompare() {
                if (guessPoints.length < 5) return;
                let s = guessInitState.slice();
                trueCurve = [];
                const steps = Math.round(GUESS_T / GUESS_DT);
                for (let i = 0; i < steps; i++) {
                    s = activeStep(s, GUESS_DT);
                    const h = lowerBobHeight(s);
                    const ny = (h - guessYRange.min) / (guessYRange.max - guessYRange.min);
                    trueCurve.push({ x: (i + 1) / steps, y: ny });
                }
                lastPercentOff = computePercentOff(guessPoints, trueCurve);
                if (lastPercentOff !== null) {
                    guessHistory.push({ percentOff: lastPercentOff, at: Date.now() });
                    saveGuessHistory(guessHistory);
                }
                showOverlay = true;
                compareRunning = false;
                updateGuessResultLine();
            }

            // --- Integrator switch state (UI built via shared mountIntegratorSwitch) ---
            let guessResultEl = null;

            function updateGuessResultLine() {
                if (!guessResultEl) return;
                const best = guessHistory.reduce((m, e) => (e.percentOff < m ? e.percentOff : m), Infinity);
                const last3 = guessHistory.slice(-3).map(e => `${e.percentOff.toFixed(0)}%`).join(', ');
                const bestTxt = guessHistory.length ? ` Best so far: ${best.toFixed(0)}%.` : '';
                const lastTxt = guessHistory.length ? ` Recent: ${last3}.` : '';
                guessResultEl.textContent = lastPercentOff === null
                    ? 'Draw a guess, then compare.'
                    : `Your guess was ${lastPercentOff.toFixed(0)}% off.${bestTxt}${lastTxt}`;
            }

            function setGuessMode(on) {
                guessMode = on;
                if (on) {
                    resetState();
                    guessInitState = stateA.slice();
                    // Graph y-range: full reach of the lower bob, in metres.
                    const reach = (ctx.params.rodLength1 + ctx.params.rodLength2) * 0.01;
                    guessYRange = { min: -reach, max: reach };
                    guessPoints = [];
                    trueCurve = [];
                    showOverlay = false;
                    lastPercentOff = null;
                    savedPlayState = ctx.isPlaying;
                    if (ctx.isPlaying) ctx.togglePlay();
                    updateGuessResultLine();
                } else {
                    isDrawingGuess = false;
                    showOverlay = false;
                    trueCurve = [];
                    if (!ctx.isPlaying && savedPlayState) ctx.togglePlay();
                }
            }

            // --- Build control UI (integrator switch + draw-your-guess) ---
            (function buildControls() {
                const controls = document.getElementById(ctx.controlsContainerId);
                if (!controls) return;

                // Integrator switch (shared widget from assets/integrators.js)
                if (Integrators && Integrators.mountIntegratorSwitch) {
                    Integrators.mountIntegratorSwitch({
                        container: controls,
                        current: currentIntegrator,
                        order: INTEGRATOR_ORDER,
                        notes: INTEGRATOR_NOTE,
                        onChange: (id, step) => {
                            currentIntegrator = id;
                            activeStep = bindStep(step);
                        }
                    });
                }

                // Draw-your-guess controls
                const guessWrap = document.createElement('div');
                guessWrap.className = 'guess-switch';
                guessWrap.style.cssText = 'margin-top:12px;';

                const guessLabel = document.createElement('div');
                guessLabel.textContent = 'Draw Your Guess';
                guessLabel.style.cssText = 'font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase;opacity:0.65;margin-bottom:6px;';
                guessWrap.appendChild(guessLabel);

                const guessRow = document.createElement('div');
                guessRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

                const guessToggle = document.createElement('button');
                guessToggle.type = 'button';
                guessToggle.textContent = 'Start guessing';
                guessToggle.setAttribute('aria-pressed', 'false');
                guessToggle.style.cssText = 'flex:1 1 auto;padding:6px 10px;cursor:pointer;font-size:0.75rem;border-radius:6px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);color:inherit;';
                guessToggle.addEventListener('click', () => {
                    const next = !guessMode;
                    setGuessMode(next);
                    guessToggle.textContent = next ? 'Guessing on' : 'Start guessing';
                    guessToggle.setAttribute('aria-pressed', next ? 'true' : 'false');
                    guessToggle.style.background = next ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.05)';
                });
                guessRow.appendChild(guessToggle);

                const compareBtn = document.createElement('button');
                compareBtn.type = 'button';
                compareBtn.textContent = 'Compare';
                compareBtn.style.cssText = 'flex:1 1 auto;padding:6px 10px;cursor:pointer;font-size:0.75rem;border-radius:6px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);color:inherit;';
                compareBtn.addEventListener('click', () => {
                    if (guessPoints.length < 5) return;
                    compareRunning = true;
                    runCompare();
                });
                guessRow.appendChild(compareBtn);
                guessWrap.appendChild(guessRow);

                guessResultEl = document.createElement('div');
                guessResultEl.setAttribute('role', 'status');
                guessResultEl.setAttribute('aria-live', 'polite');
                guessResultEl.style.cssText = 'font-size:0.75rem;opacity:0.85;margin-top:6px;line-height:1.4;';
                guessWrap.appendChild(guessResultEl);
                controls.appendChild(guessWrap);

                updateGuessResultLine();
            })();


            function derivatives(s) {
                const [t1, t2, w1, w2] = s;
                const l1 = ctx.params.rodLength1 * 0.01;
                const l2 = ctx.params.rodLength2 * 0.01;
                const m1 = ctx.params.bobMass1;
                const m2 = ctx.params.bobMass2;
                const g  = ctx.params.gravity;
                const D  = t1 - t2;
                const denom = 2*m1 + m2 - m2*Math.cos(2*D);
                const num1 = -g*(2*m1+m2)*Math.sin(t1)
                           - m2*g*Math.sin(t1-2*t2)
                           - 2*Math.sin(D)*m2*(w2*w2*l2 + w1*w1*l1*Math.cos(D));
                const alpha1 = num1 / Math.max(1e-4, l1*denom);
                const num2 = 2*Math.sin(D)*(w1*w1*l1*(m1+m2)
                           + g*(m1+m2)*Math.cos(t1)
                           + w2*w2*l2*m2*Math.cos(D));
                const alpha2 = num2 / Math.max(1e-4, l2*denom);
                return [w1, w2, alpha1, alpha2];
            }

            function rk4(s, dt) {
                const k1 = derivatives(s);
                const s2 = s.map((v, i) => v + k1[i]*dt*0.5);
                const k2 = derivatives(s2);
                const s3 = s.map((v, i) => v + k2[i]*dt*0.5);
                const k3 = derivatives(s3);
                const s4 = s.map((v, i) => v + k3[i]*dt);
                const k4 = derivatives(s4);
                return s.map((v, i) => v + (k1[i]+2*k2[i]+2*k3[i]+k4[i])*(dt/6));
            }

            function totalEnergy(s) {
                const l1 = ctx.params.rodLength1*0.01, l2 = ctx.params.rodLength2*0.01;
                const m1 = ctx.params.bobMass1, m2 = ctx.params.bobMass2;
                const g  = ctx.params.gravity;
                const [t1, t2, w1, w2] = s;
                const pe = -(m1+m2)*g*l1*Math.cos(t1) - m2*g*l2*Math.cos(t2);
                const ke = 0.5*m1*(l1*w1)**2
                         + 0.5*m2*((l1*w1)**2 + (l2*w2)**2
                         + 2*l1*l2*w1*w2*Math.cos(t1-t2));
                return ke + pe;
            }

            function resetState() {
                stateA = [Math.PI/2, Math.PI/2, 0, 0];
                stateB = [Math.PI/2+0.001, Math.PI/2, 0, 0];
                trailA=[]; trailB=[]; phaseHistory=[]; energyHistory=[]; baseEnergy=null;
            }
            ctx.onReset  = resetState;
            ctx.onResize = resetState;

            const dragTracker = VisualKit.createDragTracker({ maxSpeed: 20 });

            // Arc arrow showing angular velocity
            function angularVelocityArc(cx, cy, omega, bobR, r, g, b) {
                const span = Math.min(Math.abs(omega)*0.22, Math.PI*0.6);
                if (span < 0.06) return;
                const arcR  = bobR + 15;
                const top   = -Math.PI*0.5;
                const startA = omega > 0 ? top        : top - span;
                const endA   = omega > 0 ? top + span : top;
                p.push();
                p.translate(cx, cy);
                p.noFill(); p.stroke(r, g, b, 200); p.strokeWeight(1.8);
                p.arc(0, 0, arcR*2, arcR*2, startA, endA);
                const tipA  = omega > 0 ? endA : startA;
                const perpD = omega > 0 ? 1    : -1;
                const ax = arcR * Math.cos(tipA);
                const ay = arcR * Math.sin(tipA);
                const tangA = tipA + perpD*Math.PI*0.5;
                const hl = 6;
                p.line(ax, ay, ax - hl*Math.cos(tangA-0.45), ay - hl*Math.sin(tangA-0.45));
                p.line(ax, ay, ax - hl*Math.cos(tangA+0.45), ay - hl*Math.sin(tangA+0.45));
                p.pop();
            }

            // Phase portrait inset
            function drawPhasePortrait(px, py, pw, ph) {
                p.push();
                VisualKit.drawInsetPanel(p, px, py, pw, ph, 'phase space (t1 vs t2)', { align: 'center', cornerRadius: 7 });
                const cx = px+pw*0.5, cy = py+ph*0.5;
                p.stroke(28, 38, 58); p.strokeWeight(1);
                p.line(px+5, cy, px+pw-5, cy); p.line(cx, py+5, cx, py+ph-5);
                const W = Math.PI;
                const scale = Math.min(pw, ph) / (2*W*1.25);
                const wrap = v => ((v+W)%(2*W)+2*W)%(2*W) - W;
                if (phaseHistory.length > 2) {
                    p.noFill();
                    for (let i = 1; i < phaseHistory.length; i++) {
                        const frac = i / phaseHistory.length;
                        p.stroke(232, 160, 76, Math.pow(frac, 2)*190); p.strokeWeight(1);
                        const x1 = cx + wrap(phaseHistory[i-1].t1)*scale;
                        const y1 = cy + wrap(phaseHistory[i-1].t2)*scale;
                        const x2 = cx + wrap(phaseHistory[i].t1)*scale;
                        const y2 = cy + wrap(phaseHistory[i].t2)*scale;
                        if (Math.abs(x1-x2) < pw*0.4 && Math.abs(y1-y2) < ph*0.4) {
                            p.line(
                                p.constrain(x1,px+3,px+pw-3), p.constrain(y1,py+3,py+ph-3),
                                p.constrain(x2,px+3,px+pw-3), p.constrain(y2,py+3,py+ph-3)
                            );
                        }
                    }
                }
                p.noStroke(); p.fill(232, 160, 76);
                p.circle(
                    p.constrain(cx+wrap(stateA[0])*scale, px+3, px+pw-3),
                    p.constrain(cy+wrap(stateA[1])*scale, py+3, py+ph-3),
                    5
                );
                p.pop();
            }

            // Energy sparkline inset
            function drawEnergySparkline(px, py, pw, ph) {
                VisualKit.drawSparkline(p, px, py, pw, ph, energyHistory, [45, 212, 191], {
                    label: `Energy drift (${currentIntegrator.toUpperCase()})`,
                    baseline: baseEnergy,
                    cornerRadius: 7
                });
            }

            // Vertical chaos-divergence bar
            function drawDivergenceBar(px, py, pw, ph, div) {
                const logD  = Math.log10(Math.max(div, 1e-6));
                const norm  = p.constrain((logD - (-6)) / (Math.log10(Math.PI+1e-9) - (-6)), 0, 1);
                const cr = Math.round(p.lerp(45,  232, norm));
                const cg = Math.round(p.lerp(212,  80, norm));
                const cb = Math.round(p.lerp(191,  76, norm));
                p.push();
                VisualKit.drawInsetPanel(p, px, py, pw, ph, 'Dt', { align: 'center', cornerRadius: 5, textSize: 8 });
                const barH = (ph-22)*norm;
                p.noStroke();
                p.fill(cr, cg, cb, 190); p.rect(px+4, py+ph-11-barH, pw-8, barH, 3);
                p.fill(cr, cg, cb); p.textSize(8);
                p.textAlign(p.CENTER, p.BOTTOM);
                p.text(div < 0.01 ? div.toExponential(0) : div.toFixed(3), px+pw*0.5, py+ph-2);
                p.pop();
            }

            // Main draw loop
            p.draw = function() {
                p.background(7, 9, 15);

                const originX = p.width * 0.5;
                const originY = p.height * 0.31;
                const l1 = ctx.params.rodLength1;
                const l2 = ctx.params.rodLength2;
                const TRAIL_MAX = 350;
                const dt = 0.04 * ctx.speed;

                if (ctx.isPlaying && !draggedBob) {
                    for (let s = 0; s < 4; s++) {
                        stateA = activeStep(stateA, dt * 0.25);
                        stateB = activeStep(stateB, dt * 0.25);
                    }
                }

                const x1A = originX + l1*Math.sin(stateA[0]);
                const y1A = originY + l1*Math.cos(stateA[0]);
                const x2A = x1A    + l2*Math.sin(stateA[1]);
                const y2A = y1A    + l2*Math.cos(stateA[1]);
                const x1B = originX + l1*Math.sin(stateB[0]);
                const y1B = originY + l1*Math.cos(stateB[0]);
                const x2B = x1B    + l2*Math.sin(stateB[1]);
                const y2B = y1B    + l2*Math.cos(stateB[1]);

                if (ctx.isPlaying) {
                    trailA.push({x:x2A, y:y2A}); if (trailA.length > TRAIL_MAX) trailA.shift();
                    trailB.push({x:x2B, y:y2B}); if (trailB.length > TRAIL_MAX) trailB.shift();
                    phaseHistory.push({t1:stateA[0], t2:stateA[1]});
                    if (phaseHistory.length > 700) phaseHistory.shift();
                    const E = totalEnergy(stateA);
                    if (baseEnergy === null) baseEnergy = E;
                    energyHistory.push(E); if (energyHistory.length > 200) energyHistory.shift();
                }

                // 1. Fading trails
                VisualKit.drawFadingTrail(p, trailB, [124, 106, 247], { exponent: 1.6, maxAlpha: 220, minWeight: 1.2, maxWeight: 2.4 });
                VisualKit.drawFadingTrail(p, trailA, [232, 160, 76], { exponent: 1.6, maxAlpha: 220, minWeight: 1.2, maxWeight: 2.4 });

                // 2. Ghost shadow rods
                p.stroke(124, 106, 247, 40); p.strokeWeight(1.2); p.noFill();
                p.line(originX, originY, x1B, y1B); p.line(x1B, y1B, x2B, y2B);
                p.fill(124, 106, 247, 55); p.noStroke();
                p.circle(x1B, y1B, 8); p.circle(x2B, y2B, 10);

                // 3. Main rods — metallic with shadow + specular
                p.stroke(18, 23, 38, 90); p.strokeWeight(4.5);
                p.line(originX+1.5, originY+2, x1A+1.5, y1A+2);
                p.line(x1A+1.5, y1A+2, x2A+1.5, y2A+2);
                p.stroke(155, 172, 210, 220); p.strokeWeight(3);
                p.line(originX, originY, x1A, y1A); p.line(x1A, y1A, x2A, y2A);
                p.stroke(220, 230, 255, 70); p.strokeWeight(1);
                p.line(originX-0.5, originY-0.5, x1A-0.5, y1A-0.5);
                p.line(x1A-0.5, y1A-0.5, x2A-0.5, y2A-0.5);

                // 4. Pivot mount
                p.noStroke(); p.fill(55, 70, 100); p.circle(originX, originY, 18);
                p.fill(28, 38, 62); p.circle(originX, originY, 9);
                p.fill(78, 94, 130); p.circle(originX, originY, 5);

                // 5. Upper bob (teal)
                const r1 = Math.max(10, 10 + ctx.params.bobMass1*0.28);
                VisualKit.drawGlowBody(p, x1A, y1A, r1, [45, 212, 191], { outerOffset: 12, innerOffset: 5, outerAlpha: 30, innerAlpha: 75, specularAlpha: 50 });

                // 6. Lower bob (amber)
                const r2 = Math.max(12, 12 + ctx.params.bobMass2*0.28);
                VisualKit.drawGlowBody(p, x2A, y2A, r2, [232, 160, 76], { outerOffset: 14, innerOffset: 6, outerAlpha: 30, innerAlpha: 75, specularAlpha: 50 });

                // 7. Angular velocity arcs
                if (!draggedBob) {
                    angularVelocityArc(x1A, y1A, stateA[2], r1, 45, 212, 191);
                    angularVelocityArc(x2A, y2A, stateA[3], r2, 232, 160, 76);
                }

                // 8. Inset panels
                if (p.width >= 500) {
                    drawPhasePortrait(12, 14, 130, 110);
                    drawEnergySparkline(p.width - 175, 14, 172, 68);
                    const div = Math.abs(stateA[1] - stateB[1]) % (2*Math.PI);
                    drawDivergenceBar(p.width - 34, 90, 28, 102, div);
                }

                // 8b. Draw-your-guess graph (position vs time) with gap shading
                if (guessMode || showOverlay) {
                    const r = guessGraphRect();
                    // Panel
                    p.push();
                    p.noStroke();
                    p.fill(10, 13, 22, 235);
                    p.rect(r.x, r.y, r.w, r.h, 8);
                    p.stroke(40, 52, 76);
                    p.strokeWeight(1);
                    p.noFill();
                    p.rect(r.x, r.y, r.w, r.h, 8);

                    // Axes + gridlines
                    p.stroke(32, 42, 64, 180);
                    p.strokeWeight(1);
                    for (let gi = 1; gi < 6; gi++) {
                        const gx = r.x + (r.w * gi) / 6;
                        p.line(gx, r.y, gx, r.y + r.h);
                    }
                    for (let gi = 1; gi < 4; gi++) {
                        const gy = r.y + (r.h * gi) / 4;
                        p.line(r.x, gy, r.x + r.w, gy);
                    }

                    // Axis labels
                    p.noStroke();
                    p.fill(120, 140, 175);
                    p.textSize(10);
                    p.textAlign(p.CENTER, p.TOP);
                    p.text('time (s)', r.x + r.w / 2, r.y + r.h + 6);
                    p.push();
                    p.translate(r.x - 10, r.y + r.h / 2);
                    p.rotate(-p.HALF_PI);
                    p.textAlign(p.CENTER, p.BOTTOM);
                    p.text('lower bob height (m)', 0, 0);
                    p.pop();
                    p.textAlign(p.RIGHT, p.TOP);
                    p.text(GUESS_T.toFixed(0) + ' s', r.x + r.w - 4, r.y + 4);
                    p.textAlign(p.LEFT, p.TOP);
                    p.text(guessYRange.max.toFixed(1) + ' m', r.x + 4, r.y + 4);
                    p.textAlign(p.LEFT, p.BOTTOM);
                    p.text(guessYRange.min.toFixed(1) + ' m', r.x + 4, r.y + r.h - 4);

                    const drawCurve = (curve, col, weight) => {
                        if (curve.length < 2) return;
                        p.noFill();
                        p.stroke(col[0], col[1], col[2]);
                        p.strokeWeight(weight);
                        p.beginShape();
                        for (const pt of curve) {
                            const px = r.x + pt.x * r.w;
                            const py = r.y + (1 - pt.y) * r.h;
                            p.vertex(p.constrain(px, r.x, r.x + r.w), p.constrain(py, r.y, r.y + r.h));
                        }
                        p.endShape();
                    };

                    if (showOverlay && trueCurve.length > 1) {
                        // Shaded gap region between guess and truth
                        if (guessPoints.length > 1) {
                            p.noStroke();
                            p.fill(232, 80, 76, 70);
                            p.beginShape();
                            for (const pt of guessPoints) {
                                p.vertex(r.x + pt.x * r.w, r.y + (1 - pt.y) * r.h);
                            }
                            for (let i = trueCurve.length - 1; i >= 0; i--) {
                                const pt = trueCurve[i];
                                p.vertex(r.x + pt.x * r.w, r.y + (1 - pt.y) * r.h);
                            }
                            p.endShape(p.CLOSE);
                        }
                        drawCurve(trueCurve, [232, 160, 76], 2.5);
                    }
                    drawCurve(guessPoints, [167, 139, 250], 2.5);

                    // Legend
                    p.noStroke();
                    p.textSize(10);
                    p.textAlign(p.LEFT, p.TOP);
                    p.fill(232, 160, 76);
                    p.text('True', r.x + 8, r.y + 8);
                    p.fill(167, 139, 250);
                    p.text('Your guess', r.x + 8, r.y + 22);
                    if (showOverlay && lastPercentOff !== null) {
                        p.fill(235, 240, 250);
                        p.text(`${lastPercentOff.toFixed(0)}% off`, r.x + 8, r.y + 36);
                    }
                    p.pop();
                }

                // 9. Telemetry
                const E   = totalEnergy(stateA);
                const div = Math.abs(stateA[1] - stateB[1]) % (2*Math.PI);
                ctx._telemetry = {
                    'Total Energy':   `${E.toFixed(2)} J`,
                    'Lyapunov Delta': `${div.toFixed(4)} rad`,
                    'Omega 1': `${stateA[2].toFixed(2)} rad/s`,
                    'Omega 2': `${stateA[3].toFixed(2)} rad/s`
                };
                ctx.updateTelemetry();

                // 10. Caption
                p.noStroke(); p.fill(58, 78, 112); p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text('Amber = main  |  Violet = shadow (+0.001 rad)  |  Drag bobs to set initial conditions', 14, p.height - 10);
            };

            function ptr() {
                return p.touches && p.touches.length > 0
                    ? { x: p.touches[0].x, y: p.touches[0].y }
                    : { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos = ptr();
                if (guessMode) {
                    const r = guessGraphRect();
                    if (pos.x < r.x || pos.x > r.x + r.w || pos.y < r.y || pos.y > r.y + r.h) {
                        return false; // strokes start inside the graph panel only
                    }
                    isDrawingGuess = true;
                    guessPoints = [toGraphNorm(pos.x, pos.y)];
                    showOverlay = false;
                    return false;
                }
                const oX = p.width*0.5, oY = p.height*0.31;
                const l1v = ctx.params.rodLength1, l2v = ctx.params.rodLength2;
                const r1 = Math.max(10, 10+ctx.params.bobMass1*0.28);
                const r2 = Math.max(12, 12+ctx.params.bobMass2*0.28);
                const x1 = oX + l1v*Math.sin(stateA[0]);
                const y1 = oY + l1v*Math.cos(stateA[0]);
                const x2 = x1 + l2v*Math.sin(stateA[1]);
                const y2 = y1 + l2v*Math.cos(stateA[1]);
                if (Math.hypot(pos.x-x2, pos.y-y2) < r2+16) {
                    draggedBob=2; dragTracker.startAngle(stateA[1]); return false;
                } else if (Math.hypot(pos.x-x1, pos.y-y1) < r1+14) {
                    draggedBob=1; dragTracker.startAngle(stateA[0]); return false;
                }
            };

            p.mouseDragged = function() {
                if (guessMode) {
                    if (isDrawingGuess) {
                        const pos = ptr();
                        const n = toGraphNorm(pos.x, pos.y);
                        const lastPt = guessPoints[guessPoints.length - 1];
                        // Append only when the point moves forward in time and
                        // far enough to matter, keeping the curve a function of t.
                        if (!lastPt || (n.x - lastPt.x) * guessGraphRect().w > 2) {
                            guessPoints.push(n);
                        }
                    }
                    return false;
                }
                if (!draggedBob) return;
                const pos = ptr();
                const oX = p.width*0.5, oY = p.height*0.31;
                const l1v = ctx.params.rodLength1;
                if (draggedBob === 1) {
                    const angle = Math.atan2(pos.x-oX, pos.y-oY);
                    dragTracker.dragAngle(angle);
                    stateA[0]=angle; stateA[2]=0;
                    stateB[0]=angle+0.001; stateB[2]=0;
                } else {
                    const x1 = oX + l1v*Math.sin(stateA[0]);
                    const y1 = oY + l1v*Math.cos(stateA[0]);
                    const angle = Math.atan2(pos.x-x1, pos.y-y1);
                    dragTracker.dragAngle(angle);
                    stateA[1]=angle; stateA[3]=0;
                    stateB[1]=angle; stateB[3]=0;
                }
                trailA=[]; trailB=[]; phaseHistory=[]; energyHistory=[]; baseEnergy=null;
                return false;
            };

            p.mouseReleased = function() {
                if (guessMode) {
                    isDrawingGuess = false;
                    return;
                }
                if (!draggedBob) return;
                const omega = dragTracker.releaseAngle(14, 20);
                if (draggedBob===1) { stateA[2]=omega; stateB[2]=omega; }
                else                { stateA[3]=omega; stateB[3]=omega; }
                draggedBob = null;
            };

            p.touchStarted = p.mousePressed;
            p.touchMoved   = p.mouseDragged;
            p.touchEnded   = p.mouseReleased;
        }
    });

    sim.mount();
    return sim;
};
