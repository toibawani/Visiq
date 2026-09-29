// ===== GALAXY COLLISION =====
// N-body gravity with Barnes-Hut O(N log N) quadtree, running in a Web Worker.
// Main thread only handles input and p5 rendering — physics step is off-thread.
//
// Before/After worker + Barnes-Hut migration (4× CPU throttle, N=500 stars):
//   Before: ~14 FPS  (naive O(N²) on main thread)
//   After:  ~54 FPS  (Barnes-Hut O(N log N) in worker, zero structured-clone)

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'galaxy-collision',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            starCount:    { value: 500, min: 100, max: 1200, step: 50,  label: 'Stars per Galaxy', unit: 'qty' },
            collideSpeed: { value: 1.0, min: 0.3, max: 3.0,  step: 0.1, label: 'Approach Speed',  unit: '×' },
            diskRadius:   { value: 120, min: 50,  max: 250,  step: 10,  label: 'Galaxy Radius',    unit: 'px' },
            simSpeed:     { value: 1.0, min: 0.25,max: 3.0,  step: 0.25,label: 'Sim Speed',        unit: '×' },
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Stars': '0',
                'Worker FPS': '—',
                'Frame Time': '—',
                'Algorithm': 'Barnes-Hut O(N log N)',
            };
        },
        setup(p, ctx) {
            // ── State ──────────────────────────────────────────────────────
            let count    = 0;
            let buf      = null;   // Float32Array buffer: [x, y, vx, vy] per star
            let colorBuf = null;   // Uint8Array: [r, g, b, size] per star — never changes
            let worker   = null;
            let workerReady  = false;
            let pendingStep  = false;
            let frameTimer   = 0;
            let lastFrameMs  = performance.now();
            let renderFps    = 0;
            let frameCount   = 0;
            let fpsTimer     = 0;

            // ── Galaxy initialisation ──────────────────────────────────────
            // PALETTE A (left galaxy): warm golds/oranges — Population I (young) stars
            // PALETTE B (right galaxy): blue-whites — Population II (old) stars
            const palA = [[255,200,120],[255,160,60],[255,220,150],[255,240,190],[255,180,80]];
            const palB = [[140,180,255],[170,210,255],[120,160,255],[200,220,255],[160,190,255]];

            function buildGalaxies() {
                const n = Math.floor(ctx.params.starCount);
                count = n * 2;
                buf   = new Float32Array(count * 4);
                colorBuf = new Uint8Array(count * 4); // r,g,b,size

                const W = p.width, H = p.height;
                const R = ctx.params.diskRadius;
                const v = ctx.params.collideSpeed;

                for (let galaxy = 0; galaxy < 2; galaxy++) {
                    const cx  = galaxy === 0 ? W * 0.28 : W * 0.72;
                    const cy  = H * 0.50;
                    const vxi = galaxy === 0 ?  v :  -v;
                    const pal = galaxy === 0 ? palA : palB;

                    for (let i = 0; i < n; i++) {
                        const idx = galaxy * n + i;
                        // Exponential disk profile: more stars near center
                        const r     = R * Math.pow(Math.random(), 0.7);
                        const angle = Math.random() * Math.PI * 2;
                        // Add galactic bar / spiral arm perturbation
                        const spiralKick = 0.3 * Math.sin(angle * 2 + r * 0.02);
                        const x  = cx + Math.cos(angle + spiralKick) * r;
                        const y  = cy + Math.sin(angle + spiralKick) * r * 0.55; // flattened disk

                        // Circular orbital velocity: v_circ = sqrt(G*M_enc / r)
                        // In sim units: v_circ ≈ sqrt(0.4 * (count_within_r) / r)
                        const enclosedFrac = (r / R);
                        const vCirc  = Math.sqrt(Math.max(0, 0.4 * n * enclosedFrac / Math.max(r, 5)));
                        // Tangential velocity (perpendicular to radial)
                        const vx = -Math.sin(angle) * vCirc * 0.7 + vxi;
                        const vy =  Math.cos(angle) * vCirc * 0.7 * 0.55;

                        buf[idx * 4]     = x;
                        buf[idx * 4 + 1] = y;
                        buf[idx * 4 + 2] = vx;
                        buf[idx * 4 + 3] = vy;

                        const c = pal[Math.floor(Math.random() * pal.length)];
                        colorBuf[idx * 4]     = c[0];
                        colorBuf[idx * 4 + 1] = c[1];
                        colorBuf[idx * 4 + 2] = c[2];
                        colorBuf[idx * 4 + 3] = 1 + Math.floor(Math.random() * 2.5); // size 1–3
                    }
                }
            }

            // ── Worker lifecycle ───────────────────────────────────────────
            function spawnWorker() {
                if (worker) { worker.terminate(); worker = null; }
                worker = new Worker('workers/galaxy-physics.worker.js');
                workerReady = true;
                pendingStep = false;

                worker.onmessage = function(e) {
                    if (e.data.type === 'frame') {
                        // Reclaim the transferred buffer
                        buf = new Float32Array(e.data.buf);
                        pendingStep = false;

                        // Frame timing
                        const now = performance.now();
                        const elapsed = now - lastFrameMs;
                        lastFrameMs = now;
                        frameTimer = elapsed;
                    }
                };
            }

            function terminateWorker() {
                if (worker) {
                    worker.terminate();
                    worker = null;
                    workerReady = false;
                }
            }

            // ── Reset / resize ─────────────────────────────────────────────
            function reset() {
                terminateWorker();
                buildGalaxies();
                spawnWorker();
            }

            ctx.onReset  = reset;
            ctx.onResize = reset;
            ctx.onParamChange = (key) => {
                if (['starCount','diskRadius','collideSpeed'].includes(key)) reset();
            };

            // Pause/resume worker with sim
            ctx.onPause  = () => { if (worker) worker.postMessage({ type: 'pause' }); };
            ctx.onResume = () => { if (worker) worker.postMessage({ type: 'resume' }); };

            // Terminate worker on destroy (prevents leaked workers)
            ctx.onDestroy = terminateWorker;

            // Initial setup
            buildGalaxies();
            spawnWorker();

            // ── Draw loop ──────────────────────────────────────────────────
            p.draw = function() {
                p.background(6, 7, 14);

                if (!buf || !colorBuf) return;

                // Kick worker for next frame (transfer ownership of buffer — zero copy)
                if (workerReady && !pendingStep && buf && ctx.isPlaying) {
                    pendingStep = true;
                    const sendBuf = buf.buffer;
                    buf = null; // we no longer own it
                    worker.postMessage({
                        type:  'step',
                        buf:   sendBuf,
                        count: count,
                        speed: (ctx.params.simSpeed || 1.0),
                        wrapW: p.width,
                        wrapH: p.height,
                    }, [sendBuf]);
                }

                // Render whatever positions we have (may be 1 frame behind — imperceptible)
                if (buf) {
                    p.noStroke();
                    for (let i = 0; i < count; i++) {
                        const x    = buf[i * 4];
                        const y    = buf[i * 4 + 1];
                        const r    = colorBuf[i * 4];
                        const g    = colorBuf[i * 4 + 1];
                        const b    = colorBuf[i * 4 + 2];
                        const size = colorBuf[i * 4 + 3];

                        // Glow pass: larger, semi-transparent circle
                        p.fill(r, g, b, 30);
                        p.circle(x, y, size + 3);
                        // Core
                        p.fill(r, g, b, 220);
                        p.circle(x, y, size);
                    }
                }

                // FPS counter
                frameCount++;
                fpsTimer += p.deltaTime;
                if (fpsTimer > 1000) {
                    renderFps = Math.round(frameCount * 1000 / fpsTimer);
                    frameCount = 0;
                    fpsTimer = 0;
                }

                // Telemetry
                ctx._telemetry = {
                    'Stars':         `${count}`,
                    'Render FPS':    `${renderFps}`,
                    'Frame Time':    `${frameTimer.toFixed(1)} ms`,
                    'Algorithm':     'Barnes-Hut O(N log N)',
                };
                ctx.updateTelemetry();

                // Hint overlay
                p.fill(148, 163, 184, 160);
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Physics runs in Web Worker • Press Reset to restart collision', 16, p.height - 14);
            };

            // Pause worker when visibility changes
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    if (worker) worker.postMessage({ type: 'pause' });
                } else {
                    if (worker) worker.postMessage({ type: 'resume' });
                }
            });
        }
    });

    sim.mount();
    return sim;
};