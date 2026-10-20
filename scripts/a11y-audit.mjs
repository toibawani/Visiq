// ===== ACCESSIBILITY AUDIT HARNESS =====
// Runs axe-core against the live site in a real Chromium and writes a JSON
// report. The output is numbers and rule ids, not adjectives.
//
// Usage:
//   node scripts/a11y-audit.mjs                 audit the gallery + every sim
//   node scripts/a11y-audit.mjs gallery         audit the gallery only
//   node scripts/a11y-audit.mjs sim <simId>     audit one simulation
//   node scripts/a11y-audit.mjs sims <id...>    audit a list of simulations
//
// Options (env):
//   VISIQ_PORT   port for the local static server (default 8131)
//   A11Y_OUT     path for the JSON report (default evidence/a11y.json)
//
// The sim list is read from assets/simulations-data.js so a new simulation is
// audited the day it is added, not the day someone remembers to add it.

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const AXE_SOURCE = require.resolve('axe-core/axe.min.js');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = parseInt(process.env.VISIQ_PORT || '8131', 10);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = process.env.A11Y_OUT || join(ROOT, 'evidence', 'a11y.json');

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
    '.wasm': 'application/wasm',
    '.webmanifest': 'application/manifest+json'
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
    return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

// The simulation list lives in the data file, so read it from there rather
// than keeping a second copy that can drift.
async function listSimIds() {
    const src = await readFile(join(ROOT, 'assets', 'simulations-data.js'), 'utf8');
    const ids = [...src.matchAll(/\bid:\s*'([^']+)'/g)].map(m => m[1]);
    return [...new Set(ids)];
}

async function seedSession(page, theme) {
    await page.addInitScript((t) => {
        localStorage.setItem('visiq_session', JSON.stringify({ email: 'a11y@visiq.test', loginTime: Date.now() }));
        localStorage.setItem('visiq_user_email', 'a11y@visiq.test');
        if (t) localStorage.setItem('visiq-theme', t);
    }, theme || null);
}

async function runAxe(page) {
    await page.addScriptTag({ content: await readFile(AXE_SOURCE, 'utf8') });
    return page.evaluate(async () => {
        const result = await window.axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
            resultTypes: ['violations']
        });
        return result.violations.map(v => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            tags: v.tags,
            nodes: v.nodes.map(n => ({
                target: n.target,
                failureSummary: n.failureSummary,
                html: (n.html || '').slice(0, 240)
            }))
        }));
    });
}

async function auditPage(page, url, label) {
    const consoleErrors = [];
    const onConsole = (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); };
    const onPageError = (e) => consoleErrors.push('pageerror: ' + e.message);
    page.on('console', onConsole);
    page.on('pageerror', onPageError);

    await page.goto(url, { waitUntil: 'load' });
    // Let the sketch mount and the sim UI settle before auditing.
    await page.waitForTimeout(4000);

    let violations = [];
    let axeError = null;
    try {
        violations = await runAxe(page);
    } catch (e) {
        axeError = e.message;
    }

    page.off('console', onConsole);
    page.off('pageerror', onPageError);

    return {
        label,
        url,
        violations,
        violationCount: violations.length,
        impactCount: violations.reduce((acc, v) => {
            acc[v.impact || 'unknown'] = (acc[v.impact || 'unknown'] || 0) + 1;
            return acc;
        }, {}),
        consoleErrors,
        axeError
    };
}

async function main() {
    const [, , cmd, ...args] = process.argv;
    if (!cmd) { console.log('see header for usage'); process.exit(1); }

    const server = await startServer();
    const browser = await chromium.launch();
    const results = [];

    try {
        if (cmd === 'gallery') {
            const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
            const page = await context.newPage();
            await seedSession(page, 'dark');
            results.push(await auditPage(page, `${BASE}/index.html`, 'gallery'));
            await context.close();
        } else if (cmd === 'sim' || cmd === 'sims') {
            const ids = cmd === 'sim' ? [args[0]] : args;
            if (!ids.length || !ids[0]) { console.log('no sim id given'); process.exit(1); }
            for (const id of ids) {
                const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
                const page = await context.newPage();
                await seedSession(page, 'dark');
                results.push(await auditPage(page, `${BASE}/index.html?sim=${id}`, id));
                await context.close();
            }
        } else if (cmd === 'all') {
            const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
            const page = await context.newPage();
            await seedSession(page, 'dark');
            results.push(await auditPage(page, `${BASE}/index.html`, 'gallery'));
            await context.close();

            for (const id of await listSimIds()) {
                const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
                const p = await ctx.newPage();
                await seedSession(p, 'dark');
                results.push(await auditPage(p, `${BASE}/index.html?sim=${id}`, id));
                await ctx.close();
            }
        } else {
            console.log('unknown command:', cmd);
            process.exit(1);
        }
    } finally {
        await browser.close();
        server.close();
    }

    const report = {
        tool: 'axe-core',
        generated_at: new Date().toISOString(),
        pages: results
    };

    await mkdir(dirname(OUT), { recursive: true });
    await writeFile(OUT, JSON.stringify(report, null, 2));

    // Human-readable summary on stdout.
    let total = 0;
    for (const r of results) {
        const counts = Object.entries(r.impactCount || {}).map(([k, v]) => `${k}:${v}`).join(' ') || 'none';
        console.log(`${r.label.padEnd(24)} violations=${String(r.violationCount).padStart(3)}  ${counts}`);
        if (r.axeError) console.log(`  axe failed: ${r.axeError}`);
        for (const v of r.violations) {
            console.log(`  - [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
            for (const n of v.nodes.slice(0, 2)) {
                console.log(`      ${JSON.stringify(n.target)}`);
            }
        }
        total += r.violationCount;
    }
    console.log(`\nTOTAL violations: ${total}`);
    console.log(`report: ${OUT}`);

    // Non-zero exit when anything is wrong, so CI can gate on it.
    process.exit(total > 0 || results.some(r => r.axeError) ? 1 : 0);
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
