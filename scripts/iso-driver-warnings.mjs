// ===== DRIVER-WARNING ISOLATION =====
// The headless runs of verify-3d.mjs report four warnings of the form
//   GL Driver Message (OpenGL, Performance, ...): GPU stall due to ReadPixels
// This script decides whether those come from the black hole sim or from the
// measurement environment, by rendering two control pages in the same
// Chromium and counting console warnings over the same window:
//
//   1. a plain WebGL2 clear loop (no three.js, no sim code)
//   2. a stock three.js scene (one box, one light, the vendored build)
//
// Usage: node scripts/iso-driver-warnings.mjs [seconds]

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = parseInt(process.env.VISIQ_ISO_PORT || '8137', 10);
const BASE = `http://127.0.0.1:${PORT}`;
const SECONDS = parseFloat(process.argv[2] || '6');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8'
};

const PLAIN = `<!doctype html><html><body style="margin:0"><canvas id="c" width="480" height="320"></canvas>
<script>
const gl = document.getElementById('c').getContext('webgl2');
function frame() { gl.clearColor(0.1, 0.2, 0.3, 1); gl.clear(gl.COLOR_BUFFER_BIT); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
</script></body></html>`;

const THREE_PAGE = `<!doctype html><html><body style="margin:0"><canvas id="c" width="480" height="320"></canvas>
<script type="module">
import * as three from '/assets/vendor/three/build/three.module.js';
const renderer = new three.WebGLRenderer({ canvas: document.getElementById('c') });
renderer.setSize(480, 320, false);
const scene = new three.Scene();
scene.add(new three.Mesh(new three.BoxGeometry(), new three.MeshStandardMaterial({ color: 0x4488ff })));
scene.add(new three.DirectionalLight(0xffffff, 2));
const camera = new three.PerspectiveCamera(50, 480 / 320, 0.1, 100);
camera.position.z = 3;
function frame() { renderer.render(scene, camera); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
</script></body></html>`;

function startServer() {
    const server = createServer(async (req, res) => {
        try {
            let path = decodeURIComponent(new URL(req.url, BASE).pathname);
            if (path === '/plain.html' || path === '/three.html') {
                res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
                res.end(path === '/plain.html' ? PLAIN : THREE_PAGE);
                return;
            }
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

async function measure(path) {
    // A fresh browser per measurement: Chromium dedupes these driver messages
    // per GPU process ("this message will no longer repeat"), so sharing one
    // browser across control pages attributes them to whichever page rendered
    // first and inverts the conclusion depending on order.
    const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
    const warnings = [];
    const errors = [];
    page.on('console', (m) => {
        if (m.type() === 'warning') warnings.push(m.text());
        if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
    await page.waitForTimeout(SECONDS * 1000);
    await page.close();
    await browser.close();
    return { warningCount: warnings.length, warnings, errorCount: errors.length, errors };
}

async function main() {
    const server = await startServer();
    try {
        // Two rounds, alternating order, so a leftover dedup cannot flatter
        // whichever page happens to run second.
        const rounds = [];
        for (const order of [['plain', 'three'], ['three', 'plain']]) {
            const round = {};
            for (const which of order) {
                round[which] = await measure(which === 'plain' ? '/plain.html' : '/three.html');
            }
            rounds.push(round);
        }
        const plainTotal = rounds.reduce((n, r) => n + r.plain.warningCount, 0);
        const threeTotal = rounds.reduce((n, r) => n + r.three.warningCount, 0);
        console.log(JSON.stringify({
            seconds: SECONDS,
            note: 'each measurement gets its own browser process; Chromium dedupes GL driver messages per GPU process',
            rounds,
            plainWebGL2TotalWarnings: plainTotal,
            stockThreeTotalWarnings: threeTotal,
            verdict: plainTotal > 0 && threeTotal > 0
                ? 'both control pages warn in fresh processes: the four GL driver warnings are environmental (headless compositor readback), not sim code'
                : plainTotal === 0 && threeTotal > 0
                    ? 'only stock three.js warns: the warnings follow three.js, not the environment'
                    : plainTotal > 0 && threeTotal === 0
                        ? 'only the plain WebGL2 page warns: unexpected, inspect raw output'
                        : 'neither control page warned in this environment'
        }, null, 1));
    } finally {
        server.close();
    }
    process.exit(0);
}

main();
