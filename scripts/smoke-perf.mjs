import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8131;
const BASE = `http://127.0.0.1:${PORT}`;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp' };
const server = createServer(async (req, res) => {
    try {
        const url = new URL(req.url, BASE);
        let p = decodeURIComponent(url.pathname);
        if (p.endsWith('/')) p += 'index.html';
        const file = resolve(ROOT, p);
        if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[extname(file)], 'Cache-Control': 'no-store' });
        res.end(await readFile(file));
    } catch (e) { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const extname = (p) => p.slice(p.lastIndexOf('.')).toLowerCase();
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
for (const [sim, params] of [['black-hole', ''], ['solar-system', ''], ['earth-seasons', '']]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: 'dark' });
    const page = await context.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(`${BASE}/index.html?sim=${sim}&perf=1`, { waitUntil: 'load', timeout: 30000 }).catch(e => errs.push('goto:' + e.message));
    await page.waitForSelector('#simulation-view.active', { timeout: 20000 }).catch(() => {});
    await page.waitForSelector('#simulation-canvas canvas', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(4000);
    const out = await page.evaluate(() => {
        const overlay = document.querySelector('.visiq-perf');
        const canvas = document.querySelector('#simulation-canvas canvas');
        const fps = overlay ? overlay.textContent.match(/[0-9.]+ fps/g) : null;
        return {
            overlay: !!overlay,
            overlayText: overlay ? overlay.textContent : null,
            canvas: canvas ? `${canvas.width}x${canvas.height}` : null,
            canvasRect: canvas ? { w: canvas.clientWidth, h: canvas.clientHeight } : null
        };
    });
    results.push({ sim, ...out });
    console.log(JSON.stringify(results[results.length - 1], null, 1));
    await context.close();
}
await browser.close();
server.close();
