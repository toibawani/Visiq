// === real-pixel shot capture (Stage 3) ======================================
// Drives a real Chromium (Playwright, software GL) against the local static
// server and writes evidence/<sim>/shots/<sim>-<theme>-<t>.png for t in
// 0, 5, 20 seconds, plus evidence/contact.png. Pixels come with numbers:
// image statistics are printed to stdout, not adjectives.
//
// Usage:
//   node scripts/shots.mjs                 # every 3D hero sim, both themes
//   node scripts/shots.mjs solar-system    # a single sim
//
// Screenshots are 390px wide (phone viewport), device scale 1, on both the
// light key and dark key. The app sits behind a sign-in gate, so a session is
// seeded in localStorage before measuring. Output is numbers, not adjectives.

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = parseInt(process.env.VISIQ_PORT || '8129', 10);
const BASE = `http://127.0.0.1:${PORT}`;
const W = 390;
const FRAME_MS = 20;
const WAIT_AFTER_LOAD = 3500; // give the sim a moment to paint the first frames

const SIMS = ['black-hole', 'solar-system', 'earth-seasons'];
const THEMES = ['dark', 'light'];
const FRAMES = [0, 5, 20];
const argv = process.argv.slice(2);
const perfMode = argv.includes('--perf');
const targets = perfMode ? [argv[argv.indexOf('--perf') + 1] || 'black-hole'] : SIMS;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.webp': 'image/webp',
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
            res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            res.end(body);
        } catch (e) { res.writeHead(404).end('not found'); }
    });
    return new Promise((res) => server.listen(PORT, '127.0.0.1', () => res(server)));
}

function extname(p) {
    return p.slice(p.lastIndexOf('.')).toLowerCase();
}

async function imageStats(buffer, frame) {
    const sharp = (await import('sharp')).default;
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
        size: `${info.width}x${info.height}`,
        channels: info.channels,
        meanChannel: stats.channels.slice(0, 3).map((c) => Math.round(c.mean * 10) / 10),
        stdevChannel: stats.channels.slice(0, 3).map((c) => Math.round(c.stdev * 10) / 10),
        nonBlackPct: Math.round(nonBlack / px * 1000) / 10,
        brightPct: Math.round(bright / px * 1000) / 10,
        blueDominantPct: Math.round(blueish / px * 1000) / 10,
        redDominantPct: Math.round(reddish / px * 1000) / 10,
        frame: frame,
    };
}

async function main() {
    const simFilter = process.argv[2];
    const perfMode = argv.includes('--perf');
    const targets = perfMode ? [argv[argv.indexOf('--perf') + 1] || 'black-hole'] : (simFilter ? [simFilter] : SIMS);

    const problems = [];
    let ok = true;
    let captured = 0;

    const server = await startServer();
    const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

    try {
        for (const simId of targets) {
            const outDir = join(ROOT, 'evidence', simId, 'shots');
            await rm(outDir, { recursive: true, force: true }).catch(() => {});
            await mkdir(outDir, { recursive: true });

            for (const theme of THEMES) {
                const context = await browser.newContext({
                    viewport: { width: W, height: 844 }, // phone-ish
                    deviceScaleFactor: 1,
                    colorScheme: theme,
                });
                const page = await context.newPage();
                // Seed the real sign-in session (the site gates the sims behind it)
                // so the canvas actually paints, and set the theme key so the
                // requested key controls the page, not prefers-color-scheme.
                await page.addInitScript((t) => {
                    localStorage.setItem('visiq_session', JSON.stringify({ email: 'verify@visiq.test', loginTime: Date.now() }));
                    localStorage.setItem('visiq_user_email', 'verify@visiq.test');
                    if (t) localStorage.setItem('visiq-theme', t);
                }, theme ? theme : null);
                page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${simId}/${theme} ${m.type()}: ${m.text()}`); });
                page.on('pageerror', (e) => problems.push(`${simId}/${theme} pageerror: ${e.message}`));
                page.on('requestfailed', (r) => problems.push(`${simId}/${theme} requestfailed: ${r.url()} ${r.failure()?.errorText || ''}`));

                try {
                    await page.goto(`${BASE}/index.html?sim=${simId}${perfMode ? '&perf=1' : ''}`, { waitUntil: 'load', timeout: 30000 }).catch((e) => { problems.push(`${simId}/${theme} goto failed: ${e.message}`); });
                    await page.waitForSelector('#simulation-view.active', { timeout: 20000 }).catch(() => {});
                    await page.waitForSelector('#simulation-canvas canvas', { timeout: 20000 }).catch(() => {});

                    const canvas = await page.evaluate(() => {
                        const c = document.querySelector('#simulation-canvas canvas');
                        return c ? { w: c.width, h: c.height } : null;
                    });
                    if (!canvas) { problems.push(`${simId}/${theme} no canvas element`); }

                                        // Re-render below with the sim argument
                    const renderAt = async (t) => {
                        await page.waitForTimeout(t * 1000);
                        const buf = await page.screenshot();
                        const out = join(outDir, `${simId}-${theme}-${String(t).padStart(3, '0')}.png`);
                        await writeFile(out, buf);
                        return out;
                    };

                    for (const t of FRAMES) {
                        const path = await renderAt(t);
                        const st = await imageStats(await readFile(path), t);
                        st.sim = simId;
                        st.theme = theme;
                        st.frame = t;
                        console.log(JSON.stringify(st));
                        captured++;
                    }

                    await context.close();
                } finally {
                    try { await context.close(); } catch (e) {}
                }
            }
        }

        // Contact sheet for the whole run (all frames stacked, equal cell size).
        // sharp 0.35.5 has no .concat/.join, so composite each cell onto a tall
        // canvas in one pass.
        const contactPath = join(ROOT, 'evidence', 'contact.png');
        const { default: sharp } = await import('sharp');
        const cellW = 390, cellH = 600;
        const cells = [];
        for (const sim of targets) {
            for (const theme of THEMES) {
                for (const t of FRAMES) {
                    const f = join(ROOT, 'evidence', sim, 'shots', `${sim}-${theme}-${String(t).padStart(3, '0')}.png`);
                    if (!existsSync(f)) { console.warn(`[shots] missing ${f}`); continue; }
                    cells.push(await sharp(f).resize({ width: cellW, height: cellH }).toBuffer());
                }
            }
        }
        if (cells.length) {
            const canvas = await sharp({
                create: { width: cellW, height: cellH * cells.length, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 255 } },
            }).png().toBuffer();
            const composites = cells.map((buf, i) => ({ input: buf, top: i * cellH, left: 0 }));
            await sharp(canvas).composite(composites).png().toFile(contactPath);
            console.log(JSON.stringify({ contact: contactPath, cells: cells.length }));
        } else {
            console.warn('[shots] no frames to composite into contact sheet');
        }
        console.log(JSON.stringify({ cmd: 'shots', sims: targets, themes: THEMES, frames: FRAMES, captured }));
    } finally {
        await browser.close();
        server.close();
    }

    if (problems.length) {
        console.error(JSON.stringify({ problems, status: 'errors' }));
        process.exitCode = 1;
    } else {
        console.log(JSON.stringify({ status: 'ok', captured }));
    }
}

main();
