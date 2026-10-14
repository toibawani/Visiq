// ===== 3D SIMULATION VERIFICATION HARNESS =====
// Drives a real Chromium (Playwright) against a local static server so claims
// about pixels, frame times and GPU resource counts come with raw output.
//
// Usage:
//   node scripts/verify-3d.mjs shot <simId> <out.png> [width] [height] [theme] [waitMs]
//   node scripts/verify-3d.mjs fps <simId> [seconds] [cpuThrottle]
//   node scripts/verify-3d.mjs leak <simId> [cycles]
//   node scripts/verify-3d.mjs console <simId>
//   node scripts/verify-3d.mjs sheets <simId> [outDir]
//   node scripts/verify-3d.mjs stats <png>          analyse a screenshot
//
// `sheets` is the hero gate: for both themes (dark, light) and both viewports
// (1440x900 desktop, 375x812 phone) it captures the first frame and the frame
// 10 seconds later, then prints pixel statistics for every capture plus any
// console errors/warnings. Output is numbers, not adjectives.
//
// The app sits behind a local sign-in gate, so a session is seeded in
// localStorage before measuring. Screenshots are analysed with sharp so the
// output is numbers, not adjectives.

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = parseInt(process.env.VISIQ_PORT || '8129', 10);
const BASE = `http://127.0.0.1:${PORT}`;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.woff2': 'font/woff2',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.wasm': 'application/wasm'
};

function startServer() {
    const server = createServer(async (req, res) => {
        try {
            const url = new URL(req.url, BASE);
            let path = decodeURIComponent(url.pathname);
            if (path.endsWith('/')) path += 'index.html';
            const file = join(ROOT, path);
            if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
            const body = await readFile(file);
            res.writeHead(200, {
                'Content-Type': MIME[extname(file)] || 'application/octet-stream',
                'Cache-Control': 'no-store'
            });
            res.end(body);
        } catch (e) {
            res.writeHead(404).end('not found');
        }
    });
    return new Promise((res) => server.listen(PORT, '127.0.0.1', () => res(server)));
}

async function makePage(browser, { width = 1440, height = 900, theme = 'dark' } = {}) {
    const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 1,
        colorScheme: theme
    });
    const page = await context.newPage();
    const problems = [];
    page.on('console', (m) => {
        if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
    });
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText || ''}`));
    return { context, page, problems };
}

async function signIn(page, theme) {
    // The site ignores prefers-color-scheme and only reads its own key
    // (theme-toggle.js: 'visiq-theme' || 'dark'), so emulating colorScheme
    // alone silently captures dark twice. Seed the real key when a theme is
    // requested.
    await page.addInitScript((t) => {
        localStorage.setItem('visiq_session', JSON.stringify({ email: 'verify@visiq.test', loginTime: Date.now() }));
        localStorage.setItem('visiq_user_email', 'verify@visiq.test');
        if (t) localStorage.setItem('visiq-theme', t);
    }, theme || null);
}

async function openSim(page, simId, { waitMs = 6000 } = {}) {
    await page.goto(`${BASE}/index.html?sim=${simId}`, { waitUntil: 'load' });
    await page.waitForSelector('#simulation-view.active', { timeout: 20000 }).catch(() => {});
    await page.waitForSelector('#simulation-canvas canvas', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(waitMs);
}

const SAMPLE_FPS = (seconds) => `new Promise((resolve) => {
    const deltas = [];
    let last = performance.now();
    const t0 = last;
    function step(t) {
        deltas.push(t - last);
        last = t;
        if (t - t0 < ${seconds * 1000}) requestAnimationFrame(step);
        else {
            const s = deltas.slice(5).sort((a, b) => a - b);
            const avg = s.reduce((a, b) => a + b, 0) / s.length;
            resolve({
                frames: deltas.length,
                avgMs: Math.round(avg * 100) / 100,
                fps: Math.round(1000 / avg * 10) / 10,
                medianMs: Math.round(s[Math.floor(s.length / 2)] * 100) / 100,
                worstMs: Math.round(s[s.length - 1] * 100) / 100,
                over25ms: s.filter((d) => d > 25).length
            });
        }
    }
    requestAnimationFrame(step);
})`;

async function main() {
    const [, , cmd, ...args] = process.argv;
    if (!cmd) { console.log('see header for usage'); process.exit(1); }

    if (cmd === 'stats') {
        const sharp = (await import('sharp')).default;
        await reportImage(sharp, args[0]);
        return;
    }

    const server = await startServer();
    const browser = await chromium.launch({
        args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    });
    let exitCode = 0;

    try {
        if (cmd === 'shot') {
            const [simId, out, w = '1440', h = '900', theme = 'dark', waitMs = '6000'] = args;
            const { context, page, problems } = await makePage(browser, {
                width: parseInt(w, 10), height: parseInt(h, 10), theme
            });
            await signIn(page, theme);
            await openSim(page, simId, { waitMs: parseInt(waitMs, 10) });
            const canvasInfo = await page.evaluate(() => {
                const c = document.querySelector('#simulation-canvas canvas');
                return c ? { w: c.width, h: c.height, rw: c.clientWidth, rh: c.clientHeight } : null;
            });
            const quality = await page.evaluate(() => {
                const ctrl = window.gallery && window.gallery._currentSimController;
                return ctrl && ctrl.quality ? ctrl.quality() : null;
            });
            await mkdir(dirname(resolve(ROOT, out)), { recursive: true });
            await page.screenshot({ path: resolve(ROOT, out) });
            console.log(JSON.stringify({
                cmd, simId, out, viewport: `${w}x${h}`, theme,
                canvas: canvasInfo, quality, problems
            }, null, 1));
            await context.close();
        } else if (cmd === 'fps') {
            const [simId, seconds = '6', throttle = '0'] = args;
            const { context, page, problems } = await makePage(browser);
            await signIn(page);
            await openSim(page, simId, { waitMs: 5000 });
            const client = await context.newCDPSession(page);
            if (parseFloat(throttle) > 0) {
                await client.send('Emulation.setCPUThrottlingRate', { rate: parseFloat(throttle) });
                await page.waitForTimeout(800);
            }
            const fps = await page.evaluate(SAMPLE_FPS(parseFloat(seconds)));
            const quality = await page.evaluate(() => {
                const ctrl = window.gallery && window.gallery._currentSimController;
                return ctrl && ctrl.quality ? ctrl.quality() : null;
            });
            console.log(JSON.stringify({ cmd, simId, seconds, throttle, fps, quality, problems }, null, 1));
            await context.close();
        } else if (cmd === 'console') {
            const [simId] = args;
            const { context, page, problems } = await makePage(browser);
            await signIn(page);
            await openSim(page, simId, { waitMs: 7000 });
            // Exercise the controls a little: one slider drag, one key press.
            await page.evaluate(() => {
                const sliders = document.querySelectorAll('#controls-section input[type=range]');
                if (sliders[0]) {
                    sliders[0].value = sliders[0].max;
                    sliders[0].dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
            await page.waitForTimeout(1200);
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowUp');
            await page.waitForTimeout(1500);
            const state = await page.evaluate(() => {
                const ctrl = window.gallery && window.gallery._currentSimController;
                return {
                    mode: ctrl ? ctrl.mode : null,
                    quality: ctrl && ctrl.quality ? ctrl.quality() : null,
                    readouts: [...document.querySelectorAll('#controls-section .telemetry-item')]
                        .map((el) => el.textContent.trim()).slice(0, 12)
                };
            });
            console.log(JSON.stringify({ cmd, simId, state, problemCount: problems.length, problems }, null, 1));
            await context.close();
        } else if (cmd === 'leak') {
            const [simId, cycles = '20'] = args;
            const { context, page, problems } = await makePage(browser);
            await signIn(page);
            await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
            await page.waitForTimeout(2500);

            const measures = [];
            const n = parseInt(cycles, 10);
            for (let i = 0; i < n; i++) {
                await page.evaluate((id) => window.gallery.openSimulation(id), simId);
                // Wait for a 3D controller with a live renderer.
                await page.waitForFunction(() => {
                    const c = window.gallery && window.gallery._currentSimController;
                    return !!(c && c.rendererInfo && c.rendererInfo());
                }, { timeout: 30000 }).catch(() => {});
                await page.waitForTimeout(700);
                const info = await page.evaluate(() => {
                    const c = window.gallery._currentSimController;
                    const heap = performance.memory ? performance.memory.usedJSHeapSize : null;
                    return {
                        info: c && c.rendererInfo ? c.rendererInfo() : null,
                        heap,
                        canvases: document.querySelectorAll('canvas').length,
                        simCanvases: document.querySelectorAll('#simulation-canvas canvas').length,
                        liveThreeModules: 1
                    };
                });
                measures.push({ cycle: i + 1, ...info });
                await page.evaluate(() => window.gallery.backToGallery());
                await page.waitForTimeout(400);
            }
            // Force a collection where possible, then re-read the heap.
            const gc = await page.evaluate(async () => {
                if (!performance.memory) return { supported: false };
                if (window.gc) { window.gc(); await new Promise((r) => setTimeout(r, 300)); }
                return { supported: true, heap: performance.memory.usedJSHeapSize };
            });
            console.log(JSON.stringify({
                cmd, simId, cycles: n,
                first: measures[0], last: measures[measures.length - 1],
                all: measures.map((m) => ({ cycle: m.cycle, geo: m.info && m.info.geometries, tex: m.info && m.info.textures, prog: m.info && m.info.programs, heap: m.heap, canvases: m.canvases, simCanvases: m.simCanvases })),
                afterGc: gc, problems
            }, null, 1));
            await context.close();
        } else if (cmd === 'probe') {
            // Crop to the simulation canvas and measure the image structure.
            // For the black hole the interesting numbers are: the apparent
            // radius of the black shadow in pixels (compare against the
            // predicted b_c = 3*sqrt(3)/2 rs), and whether the disk is brighter
            // on the side rotating toward the camera.
            const [simId, query = '', out = '/tmp/vq/probe.png'] = args;
            const url = `${BASE}/index.html?sim=${simId}${query ? '&' + query : ''}`;
            const { context, page, problems } = await makePage(browser);
            await signIn(page);
            await page.goto(url, { waitUntil: 'load' });
            await page.waitForSelector('#simulation-canvas canvas', { timeout: 20000 }).catch(() => {});
            await page.waitForTimeout(7000);
            const box = await page.evaluate(() => {
                const c = document.querySelector('#simulation-canvas canvas');
                const r = c.getBoundingClientRect();
                const ctrl = window.gallery && window.gallery._currentSimController;
                return {
                    x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
                    camera: ctrl && ctrl.camera ? ctrl.camera() : null,
                    quality: ctrl && ctrl.quality ? ctrl.quality() : null,
                    params: new URLSearchParams(location.search).toString()
                };
            });
            await mkdir(dirname(resolve(ROOT, out)), { recursive: true });
            const buffer = await page.screenshot();
            await writeFile(resolve(ROOT, out), buffer);

            const sharp = (await import('sharp')).default;
            const cropW = Math.max(8, box.w), cropH = Math.max(8, box.h);
            const { data, info } = await sharp(buffer)
                .extract({ left: box.x, top: box.y, width: cropW, height: cropH })
                .removeAlpha().raw().toBuffer({ resolveWithObject: true });
            const lum = (x, y) => {
                const i = (y * info.width + x) * info.channels;
                return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            };
            const cx = Math.floor(info.width / 2);
            const cy = Math.floor(info.height / 2);
            // Walk outward along 16 directions; the shadow radius is the median
            // distance at which the pixel stops being essentially black.
            const radii = [];
            const maxR = Math.min(cx, cy) - 2;
            for (let a = 0; a < 16; a++) {
                const ang = (a / 16) * Math.PI * 2;
                let found = -1;
                for (let r = 3; r < maxR; r++) {
                    const x = Math.round(cx + Math.cos(ang) * r);
                    const y = Math.round(cy + Math.sin(ang) * r);
                    if (lum(x, y) > 12) { found = r; break; }
                }
                radii.push(found === -1 ? maxR : found);
            }
            radii.sort((a, b) => a - b);
            const medianRadius = radii[Math.floor(radii.length / 2)];

            // Predicted apparent radius, from the camera distance and a 30
            // degree vertical field of view (the value the shader is built with).
            const dist = box.camera ? box.camera.distance : NaN;
            const fovRad = 30 * Math.PI / 180;
            const radPerPx = fovRad / info.height;
            const sinTheta = (3 * Math.sqrt(3) / 2) * Math.sqrt(1 - 1 / dist) / dist;
            const predictedRadius = Math.asin(Math.min(1, sinTheta)) / radPerPx;

            // Brightness asymmetry across the vertical centre line, measured on
            // pixels bright enough to be disk rather than sky.
            let leftSum = 0, leftN = 0, rightSum = 0, rightN = 0;
            let brightest = { v: -1, x: 0, y: 0 };
            const profile = [];
            for (let y = 0; y < info.height; y++) {
                for (let x = 0; x < info.width; x++) {
                    const v = lum(x, y);
                    if (v > brightest.v) brightest = { v, x, y };
                    if (v > 20) {
                        if (x < cx) { leftSum += v; leftN++; } else { rightSum += v; rightN++; }
                    }
                }
            }
            for (let x = 0; x < info.width; x += Math.max(1, Math.floor(info.width / 96))) {
                profile.push(Math.round(lum(x, cy)));
            }
            const meanLum = leftN ? leftSum / leftN : 0;
            const meanRum = rightN ? rightSum / rightN : 0;

            console.log(JSON.stringify({
                cmd, simId, out, params: box.params,
                canvas: `${info.width}x${info.height}`, camera: box.camera, quality: box.quality,
                shadowRadiusPx: { median: medianRadius, all16: radii },
                predictedShadowRadiusPx: Math.round(predictedRadius * 10) / 10,
                ratioMeasuredOverPredicted: Math.round(medianRadius / predictedRadius * 100) / 100,
                brightestPixel: brightest,
                diskSideMeans: { left: Math.round(meanLum * 10) / 10, right: Math.round(meanRum * 10) / 10,
                    leftOverRight: meanRum ? Math.round(meanLum / meanRum * 100) / 100 : null },
                centreScanline: profile,
                problems
            }, null, 1));
            await context.close();
        } else if (cmd === 'sheets') {
            // The hero screenshot gate: first frame and +10s, at 1440x900 and
            // 375x812, in dark and light. Every capture carries pixel stats and
            // the sim's own quality-governor state at that moment.
            const [simId, outDir = `evidence/${simId}`] = args;
            const sharp = (await import('sharp')).default;
            const viewports = [
                { w: 1440, h: 900, label: '1440x900' },
                { w: 375, h: 812, label: '375x812' }
            ];
            const themes = ['dark', 'light'];
            const captures = [];
            const cells = [];
            for (const vp of viewports) {
                for (const theme of themes) {
                    const { context, page, problems } = await makePage(browser, {
                        width: vp.w, height: vp.h, theme
                    });
                    await signIn(page, theme);
                    await page.goto(`${BASE}/index.html?sim=${simId}`, { waitUntil: 'load' });
                    await page.waitForSelector('#simulation-canvas canvas', { timeout: 20000 }).catch(() => {});
                    await page.waitForTimeout(600);
                    const t0 = Date.now();
                    for (const mark of ['t0', 't10']) {
                        if (mark === 't10') {
                            const wait = 10000 - (Date.now() - t0);
                            if (wait > 0) await page.waitForTimeout(wait);
                        }
                        const file = `${outDir}/${simId}-${vp.label}-${theme}-${mark}.png`;
                        await mkdir(dirname(resolve(ROOT, file)), { recursive: true });
                        const buf = await page.screenshot();
                        await writeFile(resolve(ROOT, file), buf);
                        const state = await page.evaluate(() => {
                            const ctrl = window.gallery && window.gallery._currentSimController;
                            const c = document.querySelector('#simulation-canvas canvas');
                            return {
                                quality: ctrl && ctrl.quality ? ctrl.quality() : null,
                                canvas: c ? { w: c.width, h: c.height } : null
                            };
                        });
                        captures.push({
                            viewport: vp.label, theme, mark, file,
                            elapsedMs: Date.now() - t0,
                            ...state,
                            stats: await imageStats(sharp, buf)
                        });
                    }
                    cells.push({ viewport: vp.label, theme, problems });
                    await context.close();
                }
            }
            const problemCount = cells.reduce((n, c) => n + c.problems.length, 0);
            console.log(JSON.stringify({ cmd, simId, captures, cells, problemCount }, null, 1));
        } else {
            console.log('unknown command:', cmd);
            exitCode = 1;
        }
    } catch (e) {
        console.error('FAILED:', e.message);
        exitCode = 1;
    } finally {
        await browser.close();
        server.close();
    }
    process.exit(exitCode);
}

// Pixel statistics for a PNG buffer. Kept as a pure function so the same
// numbers can be attached to every capture the harness makes.
async function imageStats(sharp, buffer) {
    const meta = await sharp(buffer).metadata();
    const stats = await sharp(buffer).stats();
    const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const px = info.width * info.height;
    let nonBlack = 0;
    let bright = 0;
    let blueish = 0;
    let reddish = 0;
    for (let i = 0; i < data.length; i += info.channels) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum > 6) nonBlack++;
        if (lum > 128) bright++;
        if (b > r * 1.25 && lum > 12) blueish++;
        if (r > b * 1.25 && lum > 12) reddish++;
    }
    return {
        size: `${meta.width}x${meta.height}`,
        channels: info.channels,
        meanChannel: stats.channels.slice(0, 3).map((c) => Math.round(c.mean * 10) / 10),
        stdevChannel: stats.channels.slice(0, 3).map((c) => Math.round(c.stdev * 10) / 10),
        nonBlackPct: Math.round(nonBlack / px * 1000) / 10,
        brightPct: Math.round(bright / px * 1000) / 10,
        blueDominantPct: Math.round(blueish / px * 1000) / 10,
        redDominantPct: Math.round(reddish / px * 1000) / 10
    };
}

async function reportImage(sharp, path) {
    const abs = resolve(ROOT, path);
    if (!existsSync(abs)) { console.log('missing', abs); return; }
    const stats = await imageStats(sharp, abs);
    console.log(JSON.stringify({ path, ...stats }, null, 1));
}

main();
