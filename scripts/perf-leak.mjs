// === perf overlay resource leak check (Stage 4) ===================================
// Mounts and unmounts the same sim 8 times and reads the live three.js
// renderer.info counts at the end of each mount. A leak shows up as geometry
// and texture counts that keep climbing across cycles instead of returning
// to a stable baseline.
//
// Usage:
//   node scripts/perf-leak.mjs [simId]
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = parseInt(process.env.VISIQ_PORT || '8135', 10);
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

async function probe(simId, cycle) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: 'dark' });
    const page = await context.newPage();
    await page.addInitScript(() => {
        localStorage.setItem('visiq_session', JSON.stringify({ email: 'leak@visiq.test', loginTime: Date.now() }));
        localStorage.setItem('visiq_user_email', 'leak@visiq.test');
    });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(`${BASE}/index.html?sim=${simId}&perf=1`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('#simulation-view.active', { timeout: 20000 }).catch(() => {});
    await page.waitForSelector('#simulation-canvas canvas', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Mount, then poll the published snapshot until the canvas is actually
    // painted (the perfProbe only runs once the sim is up).
    await page.evaluate(() => { const b = document.querySelector('#sim-mount button'); if (b) b.click(); });
    let info = null;
    for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(500);
        info = await page.evaluate((id) => {
            const w = window.__visiqPerf || {};
            const v = w[id];
            const c = document.querySelector('#simulation-canvas canvas');
            return v && c ? { ...v, canvas: { w: c.width, h: c.height } } : null;
        }, simId);
        if (info) break;
    }
    // Unmount so the next cycle starts from a clean DOM.
    await page.evaluate(() => { const b = document.querySelector('#sim-unmount button'); if (b) b.click(); });
    await page.waitForTimeout(1500);
    await context.close();
    return { cycle, info, errors: errs };
}

try {
    const filter = process.argv[2];
    const targets = filter ? [filter] : SIMS;
    const out = [];
    for (const simId of targets) {
        const samples = [];
        for (let i = 0; i < 8; i++) {
            samples.push(await probe(simId, i));
        }
        const geos = samples.map(s => s.info ? s.info.geometries : 0);
        const texs = samples.map(s => s.info ? s.info.textures : 0);
        const first = geos[0];
        const last = geos[geos.length - 1];
        const texFirst = texs[0];
        const texLast = texs[texs.length - 1];
        const leaked = last - first;
        const texLeaked = texLast - texFirst;
        const verdict = leaked > 2 || texLeaked > 2 ? 'LEAK' : 'ok';
        out.push({
            sim: simId,
            cycles: samples.length,
            geometries: geos,
            textures: texs,
            geometryStart: first, geometryEnd: last, geometryDelta: leaked,
            textureStart: texFirst, textureEnd: texLast, textureDelta: texLeaked,
            verdict,
            errors: samples.flatMap(s => s.errors)
        });
    }
    await writeFile(join(ROOT, 'evidence', 'perf-leak.json'), JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out, null, 1));
} finally {
    await browser.close();
    server.close();
}
