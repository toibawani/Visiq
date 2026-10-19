// === perf overlay budget check (Stage 4) ===================================
// Measures fps with ?perf=1 ON and OFF on the same sim and viewport, then
// reports the delta. The overlay is allowed to cost a little; it is not
// allowed to silently halve the frame rate.
//
// Usage:
//   node scripts/perf-compare.mjs [simId]
//   node scripts/perf-compare.mjs            # all three 3D heroes
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = parseInt(process.env.VISIQ_PORT || '8134', 10);
const BASE = `http://127.0.0.1:${PORT}`;
const extname = (p) => p.slice(p.lastIndexOf('.')).toLowerCase();
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.webp':'image/webp' };
const SIMS = ['black-hole', 'solar-system', 'earth-seasons'];

const server = createServer(async (req, res) => {
    try {
        const url = new URL(req.url, BASE);
        let p = decodeURIComponent(url.pathname);
        if (p.endsWith('/')) p += 'index.html';
        const file = join(ROOT, p);
        if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(await readFile(file));
    } catch (e) { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function measureFps(simId, perfFlag) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: 'dark' });
    const page = await context.newPage();
    await page.addInitScript(() => {
        localStorage.setItem('visiq_session', JSON.stringify({ email: 'verify@visiq.test', loginTime: Date.now() }));
        localStorage.setItem('visiq_user_email', 'verify@visiq.test');
    });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(`${BASE}/index.html?sim=${simId}${perfFlag ? '&perf=1' : ''}`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('#simulation-view.active', { timeout: 20000 }).catch(() => {});
    await page.waitForSelector('#simulation-canvas canvas', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(6000);
    const fps = await page.evaluate(() => new Promise((resolve) => {
        const deltas = [];
        let last = performance.now();
        const t0 = last;
        function step(t) {
            deltas.push(t - last);
            last = t;
            if (t - t0 < 4000) requestAnimationFrame(step);
            else {
                const s = deltas.slice(5).sort((a, b) => a - b);
                const avg = s.reduce((a, b) => a + b, 0) / s.length;
                resolve({ frames: deltas.length, avgMs: Math.round(avg * 100) / 100, fps: Math.round(1000 / avg * 10) / 10, medianMs: Math.round(s[Math.floor(s.length / 2)] * 100) / 100, over25ms: s.filter((d) => d > 25).length });
            }
        }
        requestAnimationFrame(step);
    }));
    await context.close();
    return { ...fps, errors: errs };
}

try {
    const filter = process.argv[2];
    const targets = filter ? [filter] : SIMS;
    const out = [];
    for (const simId of targets) {
        const off = await measureFps(simId, false);
        const on = await measureFps(simId, true);
        const deltaPct = Math.round((on.fps - off.fps) / off.fps * 1000) / 10;
        out.push({
            sim: simId,
            off: { fps: off.fps, avgMs: off.avgMs, medianMs: off.medianMs, over25ms: off.over25ms, errors: off.errors },
            on: { fps: on.fps, avgMs: on.avgMs, medianMs: on.medianMs, over25ms: on.over25ms, errors: on.errors },
            deltaFps: on.fps - off.fps,
            deltaPct,
            verdict: deltaPct <= -15 ? 'FAIL' : deltaPct <= -5 ? 'WARN' : 'ok'
        });
    }
    await writeFile(join(ROOT, 'evidence', 'perf-compare.json'), JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out, null, 1));
} finally {
    await browser.close();
    server.close();
}
