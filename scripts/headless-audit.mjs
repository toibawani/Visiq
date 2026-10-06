// ===== HEADLESS AUDIT HARNESS =====
// Minimal CDP client over Node's built-in WebSocket + a static file server.
// Used by INSTRUMENT-AUDIT.md for smoke checks, screenshots, and fps numbers.
//
// Usage:
//   node scripts/headless-audit.mjs smoke <simId>            open ?sim=<id>, report console errors + canvas state
//   node scripts/headless-audit.mjs fps <simId> [throttle]   measure rAF fps (optional CPU throttle rate)
//   node scripts/headless-audit.mjs compare <idA> <idB> [throttle]
//   node scripts/headless-audit.mjs shot <urlPath> <out.png>
//   node scripts/headless-audit.mjs eval <urlPath> <js file | 'js-expr'>

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8123 + Math.floor(Math.random() * 400);
const DEBUG_PORT = 9333 + Math.floor(Math.random() * 400);
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.woff2': 'font/woff2',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
};

function startServer() {
    const server = createServer(async (req, res) => {
        try {
            const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
            let path = decodeURIComponent(url.pathname);
            if (path.endsWith('/')) path += 'index.html';
            const file = join(ROOT, path);
            if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
            const body = await readFile(file);
            res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
            res.end(body);
        } catch (e) {
            res.writeHead(404).end('not found');
        }
    });
    return new Promise((res) => server.listen(PORT, '127.0.0.1', () => res(server)));
}

async function launchChrome(profileDir) {
    const proc = spawn(CHROME, [
        '--headless=new',
        `--remote-debugging-port=${DEBUG_PORT}`,
        `--user-data-dir=${profileDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--hide-scrollbars',
        '--window-size=1440,960',
        '--force-device-scale-factor=1',
        '--disable-dev-shm-usage',
        'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    for (let i = 0; i < 120; i++) {
        try {
            const r = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
            const list = await r.json();
            const page = list.find((t) => t.type === 'page');
            if (page) return { proc, page };
        } catch (e) { /* retry */ }
        await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error('Chrome did not expose a debug target. stderr:\n' + stderr);
}

class CDP {
    constructor(wsUrl) {
        this.ws = new WebSocket(wsUrl);
        this.id = 0;
        this.pending = new Map();
        this.listeners = new Map();
    }
    async open() {
        await new Promise((res, rej) => {
            this.ws.onopen = res;
            this.ws.onerror = rej;
        });
        this.ws.onmessage = (ev) => {
            const msg = JSON.parse(ev.data);
            if (msg.id && this.pending.has(msg.id)) {
                const { res, rej } = this.pending.get(msg.id);
                this.pending.delete(msg.id);
                msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
            } else if (msg.method && this.listeners.has(msg.method)) {
                for (const fn of this.listeners.get(msg.method)) fn(msg.params);
            }
        };
    }
    send(method, params = {}) {
        const id = ++this.id;
        return new Promise((res, rej) => {
            this.pending.set(id, { res, rej });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }
    on(method, fn) {
        if (!this.listeners.has(method)) this.listeners.set(method, []);
        this.listeners.get(method).push(fn);
    }
    close() { try { this.ws.close(); } catch (e) {} }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function evaluate(cdp, expr, awaitPromise = false) {
    const r = await cdp.send('Runtime.evaluate', {
        expression: expr,
        awaitPromise,
        returnByValue: true,
    });
    if (r.exceptionDetails) {
        throw new Error('eval failed: ' + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    }
    return r.result.value;
}

async function waitFor(cdp, expr, timeout = 15000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
        try { if (await evaluate(cdp, expr)) return true; } catch (e) { /* keep polling */ }
        await sleep(250);
    }
    throw new Error('waitFor timed out: ' + expr);
}

const FPS_SNIPPET = (ms) => `new Promise(res => {
    const d = []; let last = performance.now(); const t0 = last;
    function step(t) { d.push(t - last); last = t;
        if (t - t0 < ${ms}) requestAnimationFrame(step);
        else {
            const s = d.slice(6);
            const avg = s.reduce((a,b)=>a+b,0) / s.length;
            res({ frames: d.length, avgMs: Math.round(avg*100)/100, fps: Math.round(10000/avg)/100,
                  worstMs: Math.round(Math.max(...s)*100)/100 });
        }
    }
    requestAnimationFrame(step);
})`;

async function main() {
    const [, , cmd, ...args] = process.argv;
    if (!cmd) { console.log('see header for usage'); return; }

    const server = await startServer();
    const profileDir = await mkdtemp(join(tmpdir(), 'visiq-cdp-'));
    const { proc, page } = await launchChrome(profileDir);
    const cdp = new CDP(page.webSocketDebuggerUrl);
    await cdp.open();

    const errors = [];
    cdp.on('Runtime.exceptionThrown', (p) => {
        errors.push('EXCEPTION: ' + (p.exceptionDetails.exception?.description || p.exceptionDetails.text));
    });
    cdp.on('Runtime.consoleAPICalled', (p) => {
        if (p.type === 'error' || p.type === 'warning') {
            errors.push(p.type.toUpperCase() + ': ' + p.args.map((a) => a.value ?? a.description ?? '').join(' '));
        }
    });
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');

    const base = `http://127.0.0.1:${PORT}`;
    let exitCode = 0;

    try {
        if (cmd === 'shot') {
            const [urlPath, out] = args;
            await cdp.send('Page.navigate', { url: base + urlPath });
            await sleep(parseInt(process.env.WAIT_MS || '4000', 10));
            const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
            await writeFile(out, Buffer.from(data, 'base64'));
            console.log('wrote', out);
        } else if (cmd === 'smoke') {
            const [simId] = args;
            await cdp.send('Page.navigate', { url: `${base}/index.html?sim=${simId}` });
            await sleep(400);
            await waitFor(cdp, `document.querySelector('#simulation-view.active') === true`, 20000).catch(() => {});
            await sleep(parseInt(process.env.WAIT_MS || '5000', 10));
            const state = await evaluate(cdp, `JSON.stringify((() => {
                const canvases = [...document.querySelectorAll('#simulation-canvas canvas')];
                return {
                    title: document.querySelector('#sim-title')?.textContent,
                    canvasCount: canvases.length,
                    canvasSize: canvases[0] ? canvases[0].width + 'x' + canvases[0].height : null,
                    detached: canvases.filter(c => !c.isConnected).length,
                    sliders: document.querySelectorAll('#controls-section .sim-control-field').length,
                    telemetryItems: document.querySelectorAll('#controls-section .telemetry-item').length,
                    controllerId: window.gallery?._currentSimController?.id || null
                };
            })())`);
            console.log('STATE ' + state);
            console.log('ERRORS(' + errors.length + ')');
            errors.slice(0, 20).forEach((e) => console.log('  ' + e.slice(0, 300)));
        } else if (cmd === 'fps' || cmd === 'compare') {
            const throttle = parseFloat(args[cmd === 'fps' ? 1 : 2] || '0');
            const urlPath = cmd === 'fps'
                ? `/index.html?sim=${args[0]}`
                : `/index.html?compare=${args[0]},${args[1]}`;
            await cdp.send('Page.navigate', { url: base + urlPath });
            await sleep(500);
            await waitFor(cdp, `document.querySelectorAll('#simulation-canvas canvas, .compare-canvas canvas').length > 0`, 25000);
            if (cmd === 'compare') {
                await waitFor(cdp, `document.querySelectorAll('.compare-canvas canvas').length === 2`, 25000);
            }
            await sleep(parseInt(process.env.WAIT_MS || '4000', 10));
            if (throttle > 0) {
                await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
                await sleep(800);
            }
            const fps = await evaluate(cdp, FPS_SNIPPET(parseInt(process.env.MEASURE_MS || '4000', 10)), true);
            const extra = await evaluate(cdp, `JSON.stringify([...document.querySelectorAll('canvas')].map(c => c.width + 'x' + c.height))`);
            console.log(JSON.stringify({ cmd, args, throttle, fps, canvases: extra, errors: errors.slice(0, 8) }, null, 2));
        } else if (cmd === 'eval') {
            const [urlPath, jsArg] = args;
            await cdp.send('Page.navigate', { url: base + urlPath });
            await sleep(parseInt(process.env.WAIT_MS || '4000', 10));
            let js = jsArg;
            if (existsSync(jsArg)) js = await readFile(jsArg, 'utf8');
            const val = await evaluate(cdp, js, true);
            console.log(typeof val === 'string' ? val : JSON.stringify(val, null, 2));
        } else {
            console.log('unknown command:', cmd);
            exitCode = 1;
        }
    } catch (e) {
        console.error('FAILED:', e.message);
        if (errors.length) errors.slice(0, 20).forEach((x) => console.error('  ' + x.slice(0, 300)));
        exitCode = 1;
    } finally {
        cdp.close();
        try { proc.kill('SIGKILL'); } catch (e) {}
        server.close();
        await rm(profileDir, { recursive: true, force: true }).catch(() => {});
    }
    process.exit(exitCode);
}

main();


