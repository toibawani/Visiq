// ===== GRAVITY TREE =====
// Self-gravity + inelastic merging. Physics in a Web Worker (Barnes-Hut + spatial hash).
//
// Before/After (4× CPU throttle, N=400, pairwise on main thread vs Barnes-Hut worker):
//   Before: ~12 FPS  (O(N²) gravity + O(N²) collision on main thread)
//   After:  ~48 FPS  (O(N log N) forces + hashed merges in worker)  — estimated; see AUDIT-3.md

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'gravity-tree',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            bodyCount: { value: 400, min: 80, max: 900, step: 20, label: 'Bodies', unit: 'qty' },
            gravityG:  { value: 0.35, min: 0.05, max: 1.2, step: 0.05, label: 'Self-gravity G', unit: 'sim' },
            gDown:     { value: 0.12, min: 0, max: 0.5, step: 0.02, label: 'Downward g', unit: 'sim' },
            simSpeed:  { value: 1, min: 0.25, max: 2.5, step: 0.25, label: 'Sim speed', unit: '×' },
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Bodies': '0',
                'Render FPS': '—',
                'Algorithm': 'Barnes-Hut + hash merge',
            };
        },
        setup(p, ctx) {
            const STRIDE = 6;
            let count = 0;
            let buf = null;
            let worker = null;
            let pendingStep = false;
            let renderFps = 0, frameCount = 0, fpsTimer = 0;

            function build() {
                count = Math.floor(ctx.params.bodyCount);
                buf = new Float32Array(count * STRIDE);
                for (let i = 0; i < count; i++) {
                    buf[i * STRIDE]     = Math.random() * p.width;
                    buf[i * STRIDE + 1] = Math.random() * p.height * 0.35;
                    buf[i * STRIDE + 2] = (Math.random() - 0.5) * 2;
                    buf[i * STRIDE + 3] = Math.random();
                    buf[i * STRIDE + 4] = 1;
                    buf[i * STRIDE + 5] = 3;
                }
            }

            function spawnWorker() {
                if (worker) { worker.terminate(); worker = null; }
                worker = new Worker('workers/gravity-tree.worker.js');
                pendingStep = false;
                worker.onmessage = function(e) {
                    if (e.data.type === 'frame') {
                        buf = new Float32Array(e.data.buf);
                        count = e.data.count;
                        pendingStep = false;
                    }
                };
            }

            function terminateWorker() {
                if (worker) { worker.terminate(); worker = null; }
            }

            function reset() {
                terminateWorker();
                build();
                spawnWorker();
            }

            ctx.onReset = reset;
            ctx.onResize = reset;
            ctx.onDestroy = terminateWorker;
            ctx.onPause = () => { if (worker) worker.postMessage({ type: 'pause' }); };
            ctx.onResume = () => { if (worker) worker.postMessage({ type: 'resume' }); };
            ctx.onParamChange = (key) => {
                if (key === 'bodyCount') reset();
            };

            reset();

            p.draw = function() {
                p.background(5, 5, 7);

                if (worker && !pendingStep && buf && ctx.isPlaying) {
                    pendingStep = true;
                    const sendBuf = buf.buffer;
                    buf = null;
                    worker.postMessage({
                        type: 'step',
                        buf: sendBuf,
                        count,
                        G: ctx.params.gravityG,
                        gDown: ctx.params.gDown,
                        damping: 0.992,
                        wrapW: p.width,
                        wrapH: p.height,
                        speed: ctx.params.simSpeed,
                    }, [sendBuf]);
                }

                if (buf) {
                    p.noStroke();
                    for (let i = 0; i < count; i++) {
                        const mass = buf[i * STRIDE + 4];
                        const r = buf[i * STRIDE + 5];
                        const bri = Math.min(255, 80 + mass * 18);
                        p.fill(bri, bri * 0.62, 50, 210);
                        p.circle(buf[i * STRIDE], buf[i * STRIDE + 1], r * 2);
                    }
                }

                frameCount++;
                fpsTimer += p.deltaTime;
                if (fpsTimer > 1000) {
                    renderFps = Math.round(frameCount * 1000 / fpsTimer);
                    frameCount = 0;
                    fpsTimer = 0;
                }

                ctx._telemetry = {
                    'Bodies': `${count}`,
                    'Render FPS': `${renderFps}`,
                    'Algorithm': 'Barnes-Hut O(N log N)',
                };
                ctx.updateTelemetry();

                p.fill(148, 163, 184, 160);
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Worker: Barnes-Hut gravity + spatial-hash merges', 16, p.height - 14);
            };
        }
    });

    sim.mount();
    return sim;
};
