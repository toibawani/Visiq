import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8140;
const BASE = `http://127.0.0.1:${PORT}`;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.webp':'image/webp' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, BASE);
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(ROOT, p);
    if (!file.startsWith(ROOT)) { console.error('403', p); res.writeHead(403).end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(await readFile(file));
  } catch (e) { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const extname = (p) => p.slice(p.lastIndexOf('.')).toLowerCase();
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: 'dark' });
const page = await context.newPage();
const logs = [];
page.on('console', m => logs.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
page.on('requestfailed', r => logs.push('requestfailed: ' + r.url() + ' ' + (r.failure()?.errorText || '')));
await page.addInitScript(() => {
  localStorage.setItem('visiq_session', JSON.stringify({ email: 'verify@visiq.test', loginTime: Date.now() }));
  localStorage.setItem('visiq_user_email', 'verify@visiq.test');
});
await page.goto(`${BASE}/index.html?sim=black-hole&perf=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('#simulation-view.active', { timeout: 20000 }).catch(()=>{});
await page.waitForSelector('#simulation-canvas canvas', { timeout: 20000 }).catch(()=>{});
await page.waitForTimeout(8000);
const out = await page.evaluate(() => {
  const ov = document.querySelector('.visiq-perf');
  const c = document.querySelector('#simulation-canvas canvas');
  const simBase = window.gallery && window.gallery._currentSimController;
  return {
    overlay: !!ov,
    overlayHTML: ov ? ov.outerHTML.slice(0, 300) : null,
    canvas: c ? { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight } : null,
    simBase: simBase ? {
                id: simBase.id,
                perfMode: simBase.perfMode,
                perf: simBase.perf,
                containerId: simBase.containerId,
                hasMount: typeof simBase.mount,
                hasAttach: typeof simBase._attachPerfOverlay,
                proto: Object.getPrototypeOf(simBase)?.constructor?.name
            } : null,
    containerHTML: document.getElementById('simulation-canvas') ? document.getElementById('simulation-canvas').outerHTML.slice(0, 200) : null
  };
});
console.log(JSON.stringify(out, null, 1));
console.log('=== logs ===');
console.log(logs.join('\n'));
await browser.close(); await server.close();
