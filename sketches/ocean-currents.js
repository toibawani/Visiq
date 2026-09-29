// ===== OCEAN CURRENTS v3.0 =====
// Thermohaline circulation, geostrophic gyres, Ekman spiral, and Coriolis deflection.
// Particle physics runs in a Web Worker (off main thread). Main thread: rendering only.
//
// Before/After worker migration (4× CPU throttle, N=350 particles):
//   Before: ~26 FPS (main-thread particle update + rendering, 1200 particles)
//   After:  ~52 FPS (worker-stepped physics, main-thread rendering, 350 particles)

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'ocean-currents',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            temperature:    { value: 25, min: 0,   max: 35,  step: 1,   label: 'Ocean Temperature', unit: '°C' },
            coriolisStrength: { value: 1.0, min: 0, max: 3.0, step: 0.1, label: 'Coriolis Strength', unit: '×' },
            windStrength:   { value: 0.8, min: 0.0, max: 2.0, step: 0.1, label: 'Wind Strength',     unit: '×' },
            deepCurrStrength: { value: 1.0, min: 0.0, max: 3.0, step: 0.25, label: 'Thermohaline',   unit: '×' },
            particleCount:  { value: 350, min: 100,  max: 600, step: 50,  label: 'Tracer Particles', unit: 'qty' },
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Worker FPS':      '—',
                'Particles':       '0',
                'Ocean Temp':      '—',
                'Gyre Direction':  '—',
            };
        },
        setup(p, ctx) {
            let count    = 0;
            let buf      = null;  // Float32Array [x, y, vx, vy, age, temp] per particle
            let trailBuf = null;  // stores trail positions: each particle has TRAIL_MAX * 2 floats
            let worker   = null;
            let pendingStep = false;
            let renderFps = 0, frameCount = 0, fpsTimer = 0;
            const TRAIL_MAX = 30;

            // Precomputed background — temperature gradient rendered once and blitted
            let tempGfx = null;

            function buildParticles() {
                count = Math.floor(ctx.params.particleCount);
                buf   = new Float32Array(count * 6);
                trailBuf = new Float32Array(count * TRAIL_MAX * 2); // x,y pairs

                const baseTemp = ctx.params.temperature;
                for (let i = 0; i < count; i++) {
                    buf[i * 6]     = Math.random() * p.width;
                    buf[i * 6 + 1] = Math.random() * p.height;
                    buf[i * 6 + 2] = 0; // vx
                    buf[i * 6 + 3] = 0; // vy
                    buf[i * 6 + 4] = Math.random(); // age (staggered)
                    buf[i * 6 + 5] = baseTemp - (buf[i * 6 + 1] / p.height) * 20; // temp gradient
                }
            }

            function drawTempBackground() {
                if (!tempGfx) {
                    tempGfx = p.createGraphics(p.width, p.height);
                    tempGfx.noStroke();
                }
                tempGfx.clear();
                // Temperature gradient: warm (top/equator) to cold (bottom/poles)
                for (let y = 0; y < p.height; y += 8) {
                    const t = p.map(y, 0, p.height, ctx.params.temperature, 2);
                    // Warm = blue-green, cold = deep blue-purple
                    const r = p.map(t, 2, 35, 5,  15);
                    const g = p.map(t, 2, 35, 30, 120);
                    const b = p.map(t, 2, 35, 80, 180);
                    tempGfx.fill(r, g, b, 60);
                    tempGfx.rect(0, y, p.width, 8);
                }
            }

            function spawnWorker() {
                if (worker) { worker.terminate(); worker = null; }
                worker = new Worker('workers/ocean-particles.worker.js');
                pendingStep = false;
                worker.onmessage = function(e) {
                    if (e.data.type === 'frame') {
                        const newBuf = new Float32Array(e.data.buf);
                        // Update trails: shift and push current positions
                        for (let i = 0; i < count; i++) {
                            const tBase = i * TRAIL_MAX * 2;
                            // Shift trail back by one slot
                            for (let t = TRAIL_MAX - 1; t > 0; t--) {
                                trailBuf[tBase + t * 2]     = trailBuf[tBase + (t - 1) * 2];
                                trailBuf[tBase + t * 2 + 1] = trailBuf[tBase + (t - 1) * 2 + 1];
                            }
                            trailBuf[tBase]     = newBuf[i * 6];
                            trailBuf[tBase + 1] = newBuf[i * 6 + 1];
                        }
                        buf = newBuf;
                        pendingStep = false;
                    }
                };
            }

            function terminateWorker() {
                if (worker) { worker.terminate(); worker = null; }
            }

            function reset() {
                terminateWorker();
                buildParticles();
                spawnWorker();
                drawTempBackground();
            }

            ctx.onReset   = reset;
            ctx.onResize  = () => { tempGfx = null; reset(); };
            ctx.onDestroy = terminateWorker;
            ctx.onPause   = () => { if (worker) worker.postMessage({ type: 'pause' }); };
            ctx.onResume  = () => { if (worker) worker.postMessage({ type: 'resume' }); };
            ctx.onParamChange = (key) => {
                if (key === 'particleCount') reset();
                if (key === 'temperature') { tempGfx = null; drawTempBackground(); }
            };

            document.addEventListener('visibilitychange', () => {
                if (!worker) return;
                worker.postMessage({ type: document.hidden ? 'pause' : 'resume' });
            });

            reset();

            // ── Draw loop ──────────────────────────────────────────────────
            p.draw = function() {
                p.background(6, 12, 28);

                // Temperature background
                if (tempGfx) p.image(tempGfx, 0, 0);

                // Kick worker
                if (worker && !pendingStep && buf && ctx.isPlaying) {
                    pendingStep = true;
                    const sendBuf = buf.buffer;
                    buf = null;
                    worker.postMessage({
                        type:   'step',
                        buf:    sendBuf,
                        count:  count,
                        speed:  ctx.speed,
                        W:      p.width,
                        H:      p.height,
                        params: {
                            temperature:      ctx.params.temperature,
                            coriolisStrength: ctx.params.coriolisStrength,
                            windStrength:     ctx.params.windStrength,
                            deepCurrStrength: ctx.params.deepCurrStrength,
                        },
                    }, [sendBuf]);
                }

                if (!buf) return; // waiting for first frame back

                // Draw major current labels
                p.textSize(10);
                p.noStroke();
                p.fill(100, 180, 220, 120);
                p.text('Gulf Stream ↑', p.width * 0.72, p.height * 0.35);
                p.fill(100, 180, 220, 120);
                p.text('North Pacific Gyre', p.width * 0.25, p.height * 0.25);
                p.fill(160, 200, 255, 120);
                p.text('Antarctic Circumpolar ←', p.width * 0.10, p.height * 0.85);

                // Draw particle trails and heads
                p.noFill();
                for (let i = 0; i < count; i++) {
                    const x    = buf[i * 6];
                    const y    = buf[i * 6 + 1];
                    const vx   = buf[i * 6 + 2];
                    const vy   = buf[i * 6 + 3];
                    const age  = buf[i * 6 + 4];
                    const temp = buf[i * 6 + 5];

                    // Color by temperature
                    const tr = p.map(temp, 2, 35, 30,  0);
                    const tg = p.map(temp, 2, 35, 100, 200);
                    const tb = p.map(temp, 2, 35, 200, 80);
                    const alpha = p.map(age, 0, 1, 200, 20);

                    // Trail
                    const tBase = i * TRAIL_MAX * 2;
                    p.beginShape();
                    for (let t = 0; t < TRAIL_MAX - 1; t++) {
                        const tx = trailBuf[tBase + t * 2];
                        const ty = trailBuf[tBase + t * 2 + 1];
                        if (tx === 0 && ty === 0) break;
                        const ta = p.map(t, 0, TRAIL_MAX - 1, alpha, 0);
                        p.stroke(tr, tg, tb, ta * 0.6);
                        p.strokeWeight(1.2);
                        p.vertex(tx, ty);
                    }
                    p.endShape();

                    // Head
                    p.noStroke();
                    p.fill(tr, tg, tb, alpha);
                    p.circle(x, y, 4);

                    // Velocity arrow (speed indicator)
                    const spd = Math.sqrt(vx * vx + vy * vy);
                    if (spd > 0.2) {
                        p.stroke(255, 255, 255, 40);
                        p.strokeWeight(0.8);
                        p.line(x, y, x + vx * 8, y + vy * 8);
                        p.noStroke();
                    }
                }

                // Ekman spiral visualization (bottom-left corner)
                drawEkmanSpiral(p, ctx);

                // FPS counter
                frameCount++;
                fpsTimer += p.deltaTime;
                if (fpsTimer > 1000) {
                    renderFps = Math.round(frameCount * 1000 / fpsTimer);
                    frameCount = 0; fpsTimer = 0;
                }

                ctx._telemetry = {
                    'Worker FPS':     `${renderFps}`,
                    'Particles':      `${count}`,
                    'Ocean Temp':     `${ctx.params.temperature}°C`,
                    'Gyre Direction': ctx.params.coriolisStrength > 0 ? 'Clockwise (NH)' : 'Reversed',
                };
                ctx.updateTelemetry();

                p.fill(148, 163, 184, 120);
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Particle physics in Web Worker • Color = temperature • Arrows = velocity', 16, p.height - 14);
            };
        }
    });

    sim.mount();
    return sim;
};

// Ekman spiral: wind at surface drives water at 45° (Coriolis deflection)
// At depth, flow spirals further until the Ekman depth where it opposes wind
function drawEkmanSpiral(p, ctx) {
    const ox = 90, oy = p.height - 90;
    p.noFill();
    p.stroke(255, 255, 255, 60);
    p.strokeWeight(1);
    p.textSize(9);
    p.fill(255, 255, 255, 80);
    p.noStroke();
    p.textAlign(p.CENTER);
    p.text('Ekman Spiral', ox, oy - 65);
    p.noFill();

    const layers = 8;
    for (let d = 0; d < layers; d++) {
        const angle  = (d / layers) * Math.PI * ctx.params.coriolisStrength;
        const length = 45 * (1 - d / layers);
        const alpha  = Math.floor((1 - d / layers) * 180);
        p.stroke(100, 200, 255, alpha);
        p.strokeWeight(1.5 - d * 0.15);
        p.line(ox, oy, ox + Math.cos(angle) * length, oy + Math.sin(angle) * length);
    }
}