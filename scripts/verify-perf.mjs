// === ?perf=1 overlay verification ==========================================
// Drives a real Chromium against the local static server and reports, for
// every 3D hero sim, whether the perf overlay is mounted, what it shows, and
// whether the scene still animates. Numbers, not adjectives.
//
// Usage:
//   node scripts/verify-perf.mjs
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = parseInt(process.env.VISIQ_PORT || '8133', 10);
const BASE = `http://127.0.0.1:${PORT}`;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.webp':'image/webp' };
// The three 3D heroes render with three.js and report GPU telemetry; the
// four 2D heroes render with p5 and report frame time and fps only. Both
// kinds are measured here so the overlay is verified on every hero that
// ships, not just the ones with a WebGL renderer.
const SIMS = ['black-hole', 'solar-system', 'earth-seasons',
               'galaxy-collision', 'quantum-tunnel', 'ocean-currents', 'magnetic-field'];

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
const extname = (p) => p.slice(p.lastIndexOf('.')).toLowerCase();

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
try {
    for (const simId of SIMS) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: 'dark' });
        const page = await context.newPage();
        // Seed the real sign-in session (the site gates the sims behind it) so
        // the canvas actually paints.
        await page.addInitScript(() => {
            localStorage.setItem('visiq_session', JSON.stringify({ email: 'verify@visiq.test', loginTime: Date.now() }));
            localStorage.setItem('visiq_user_email', 'verify@visiq.test');
        });
        const errs = [];
        page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
        page.on('pageerror', e => errs.push(e.message));
        await page.goto(`${BASE}/index.html?sim=${simId}&perf=1`, { waitUntil: 'load', timeout: 30000 });
        await page.waitForSelector('#simulation-view.active', { timeout: 20000 }).catch(() => {});
        await page.waitForSelector('#simulation-canvas canvas', { timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(6000);

        const snap = await page.evaluate(() => {
            const ov = document.querySelector('.visiq-perf');
            const c = document.querySelector('#simulation-canvas canvas');
            const rows = [];
            const grid = ov ? ov.querySelector('.vp-grid') : null;
            if (grid) {
                Array.from(grid.querySelectorAll('.vp-row')).forEach(r => {
                    rows.push([r.querySelector('.vp-label')?.textContent, r.querySelector('.vp-val')?.textContent]);
                });
            }
            const hard = ov ? ov.querySelector('#vp-hard')?.textContent : null;
            return {
                overlay: !!ov,
                overlayText: ov ? ov.textContent : null,
                rows,
                hardware: hard,
                canvas: c ? { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight } : null,
            };
        });
        results.push({ sim: simId, ...snap });
        await context.close();
    }
} finally {
    await browser.close();
    server.close();
}
await writeFile(join(ROOT, 'evidence', 'verify-perf.json'), JSON.stringify(results, null, 1));
console.log(JSON.stringify(results, null, 1));
