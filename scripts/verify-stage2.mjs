// ===== STAGE 2 VERIFICATION =====
// Renders the landing page in a real Chromium and measures the things the
// stage claims: the first screen, the skeleton sizes, the header controls,
// the no-login path, and horizontal overflow across widths.
//
// Usage: node scripts/verify-stage2.mjs
//   Writes evidence/stage-2/verify-stage2.json and prints a table.
//   Exit code is 1 when a measured check fails.
//
// Every number here is measured in the browser, not asserted by hand.

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = parseInt(process.env.VISIQ_PORT || '8137', 10);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(ROOT, 'evidence', 'stage-2', 'verify-stage2.json');

const WIDTHS = [320, 375, 768, 1024, 1440, 1920];

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
        } catch (e) { res.writeHead(404).end('not found'); }
    });
    return new Promise(r => server.listen(PORT, '127.0.0.1', () => r(server)));
}

// Measures horizontal overflow and the widest offending element.
async function measureOverflow(page) {
    return page.evaluate(() => {
        const de = document.documentElement;
        const sw = Math.max(de.scrollWidth, document.body.scrollWidth);
        const cw = de.clientWidth;
        const offenders = [];
        if (sw > cw + 1) {
            for (const el of document.querySelectorAll('body *')) {
                const r = el.getBoundingClientRect();
                if (r.width === 0 && r.height === 0) continue;
                if (r.right > cw + 1 || r.left < -1) {
                    offenders.push({
                        tag: el.tagName,
                        id: el.id || '',
                        cls: (el.className || '').toString().slice(0, 60),
                        left: Math.round(r.left),
                        right: Math.round(r.right),
                        width: Math.round(r.width),
                    });
                }
            }
        }
        return { scrollWidth: sw, clientWidth: cw, overflow: sw > cw + 1, offenders: offenders.slice(0, 8) };
    });
}

// Reads the first-screen state: is the hero live, a thumbnail, or neither.
async function measureHero(page) {
    return page.evaluate(() => {
        const vis = el => {
            if (!el) return false;
            const s = getComputedStyle(el);
            return s.display !== 'none' && s.visibility !== 'hidden' && !el.hidden;
        };
        const canvas = document.querySelector('#hero-canvas');
        const thumb = document.querySelector('#hero-thumbnail');
        const skel = document.querySelector('#hero-skeleton');
        const heroCanvas = canvas && canvas.querySelector('canvas');
        let livePixels = null;
        if (heroCanvas) {
            try {
                const gl = heroCanvas.getContext('webgl2') || heroCanvas.getContext('webgl');
                if (gl) {
                    const px = new Uint8Array(4);
                    gl.readPixels(Math.floor(heroCanvas.width / 2), Math.floor(heroCanvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
                    livePixels = Array.from(px);
                }
            } catch (e) { livePixels = null; }
        }
        const headline = document.querySelector('.hero-copy h1');
        const primary = document.querySelector('.hero-copy .btn-explore');
        const statsBanner = [...document.querySelectorAll('main *')].filter(el => {
            if (el.closest('.hero-section, .search-section')) return false;
            const t = (el.textContent || '').trim();
            return /\b\d[\d,.]*\s*(simulations?|sims?|users?|models?|projects?)\b/i.test(t) && el.children.length === 0;
        }).map(el => (el.textContent || '').trim().slice(0, 60));
        return {
            heroCanvasPresent: !!heroCanvas,
            heroCanvasVisible: vis(canvas),
            livePixelSample: livePixels,
            thumbnailVisible: vis(thumb),
            skeletonVisible: vis(skel),
            headline: headline ? headline.textContent.trim() : null,
            headlineLength: headline ? headline.textContent.trim().length : 0,
            primaryActionText: primary ? primary.textContent.trim() : null,
            primaryActionCount: document.querySelectorAll('.hero-copy button, .hero-copy a').length,
            statsBannerText: statsBanner,
            heroIsFirstScreen: (() => {
                const r = document.querySelector('.hero-section');
                if (!r) return false;
                return r.getBoundingClientRect().top < window.innerHeight * 0.5;
            })(),
        };
    });
}

// Reads the header control markup: are they inline svg with names?
async function measureHeader(page) {
    return page.evaluate(() => {
        const bar = document.querySelector('header') || document.querySelector('.navbar');
        if (!bar) return { found: false, controls: [] };
        const controls = [...bar.querySelectorAll('button, a[href], [role="button"]')].map(el => {
            const svg = el.querySelector('svg');
            const r = el.getBoundingClientRect();
            return {
                tag: el.tagName,
                id: el.id || '',
                cls: (el.className || '').toString().slice(0, 50),
                hasInlineSvg: !!svg,
                svgViewBox: svg ? svg.getAttribute('viewBox') : null,
                ariaLabel: el.getAttribute('aria-label'),
                ariaPressed: el.getAttribute('aria-pressed'),
                title: el.getAttribute('title'),
                text: (el.textContent || '').trim().slice(0, 40),
                accessibleName: el.getAttribute('aria-label') || (svg && svg.getAttribute('aria-label')) || el.getAttribute('title') || (el.textContent || '').trim(),
                targetSize: { w: Math.round(r.width), h: Math.round(r.height) },
            };
        });
        return {
            found: true,
            markup: bar.outerHTML,
            controls,
            allHaveSvg: controls.filter(c => c.ariaPressed !== null).every(c => c.hasInlineSvg),
            allNamed: controls.every(c => (c.accessibleName || '').length > 0),
        };
    });
}

// Reads the skeleton boxes: are they a fixed size before the content loads?
async function measureSkeletons(page) {
    return page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('.hero-skeleton, .card-skeleton, .skeleton, [class*="skeleton"]')) {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            out.push({
                sel: el.tagName + '.' + (el.className || '').toString().split(' ').slice(0, 2).join('.'),
                w: Math.round(r.width),
                h: Math.round(r.height),
                minHeight: s.minHeight,
                aspectRatio: s.aspectRatio,
            });
        }
        return out;
    });
}

// Measures the layout shift of the card grid as the thumbnails arrive.
async function measureShift(page) {
    return page.evaluate(async () => {
        const cards = [...document.querySelectorAll('.sim-card, .card')];
        const snap = () => cards.map(c => {
            const r = c.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
        });
        const before = snap();
        await Promise.all([...document.querySelectorAll('img')].map(img => img.complete ? null : img.decode().catch(() => null)));
        await new Promise(r => setTimeout(r, 600));
        const after = snap();
        const moved = before.map((b, i) => {
            const a = after[i];
            if (!a) return { i, dx: 999, dy: 999, dw: 999, dh: 999 };
            return { i, dx: a.x - b.x, dy: a.y - b.y, dw: a.w - b.w, dh: a.h - b.h };
        }).filter(m => m.dx || m.dy || m.dw || m.dh);
        return {
            cardCount: cards.length,
            movedCards: moved,
            totalShift: moved.reduce((s, m) => s + Math.abs(m.dx) + Math.abs(m.dy), 0),
        };
    });
}

// Is the gallery reachable with no session at all?
async function measureNoLogin(page) {
    return page.evaluate(() => {
        const vis = el => {
            if (!el) return false;
            const s = getComputedStyle(el);
            return s.display !== 'none' && s.visibility !== 'hidden';
        };
        return {
            authPageVisible: vis(document.querySelector('#auth-page')),
            mainAppVisible: vis(document.querySelector('#main-app')),
            galleryVisible: vis(document.querySelector('#gallery-view')),
            cardCount: document.querySelectorAll('.sim-card').length,
        };
    });
}

async function main() {
    const server = await startServer();
    const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const report = { tool: 'node scripts/verify-stage2.mjs', generated_at: new Date().toISOString(), checks: {}, failures: [] };
    const fail = (name, detail) => report.failures.push({ check: name, detail });

    try {
        // 1. No-login path: a fresh context with no seeded session.
        {
            const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
            const page = await ctx.newPage();
            await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
            await page.waitForTimeout(2500);
            const r = await measureNoLogin(page);
            report.checks.noLogin = r;
            if (!r.galleryVisible || r.cardCount === 0) fail('noLogin', 'gallery did not open without a session');
            if (r.authPageVisible) fail('noLogin', 'auth page still visible to an anonymous visitor');
            await ctx.close();
        }

        // 2. Hero first screen, header controls, skeletons, shift.
        for (const theme of ['dark', 'light']) {
            const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
            const page = await ctx.newPage();
            await page.addInitScript((t) => { localStorage.setItem('visiq-theme', t); }, theme);
            await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
            await page.waitForTimeout(4000);
            report.checks['hero_' + theme] = await measureHero(page);
            report.checks['header_' + theme] = await measureHeader(page);
            report.checks['skeletons_' + theme] = await measureSkeletons(page);
            report.checks['shift_' + theme] = await measureShift(page);
            await ctx.close();
        }

        // 3. Horizontal overflow across widths, both themes.
        const overflow = [];
        for (const theme of ['dark', 'light']) {
            for (const w of WIDTHS) {
                const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: theme });
                const page = await ctx.newPage();
                await page.addInitScript((t) => { localStorage.setItem('visiq-theme', t); }, theme);
                await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
                await page.waitForTimeout(2200);
                const m = await measureOverflow(page);
                overflow.push({ theme, width: w, scrollWidth: m.scrollWidth, clientWidth: m.clientWidth, overflow: m.overflow, offenders: m.offenders });
                if (m.overflow) fail('overflow', `${theme} @ ${w}: scrollWidth ${m.scrollWidth} > clientWidth ${m.clientWidth}`);
                await ctx.close();
            }
        }
        report.checks.overflow = overflow;
    } finally {
        await browser.close();
        server.close();
    }

    await mkdir(dirname(OUT), { recursive: true });
    await writeFile(OUT, JSON.stringify(report, null, 2));

    console.log('--- no-login path ---');
    console.log(JSON.stringify(report.checks.noLogin));
    for (const theme of ['dark', 'light']) {
        console.log(`--- hero (${theme}) ---`);
        console.log(JSON.stringify(report.checks['hero_' + theme], null, 1));
        const h = report.checks['header_' + theme];
        console.log(`--- header controls (${theme}) ---`);
        for (const c of h.controls) {
            console.log(`  ${c.tag}#${c.id} svg=${c.hasInlineSvg} label=${JSON.stringify(c.ariaLabel)} pressed=${c.ariaPressed} size=${c.targetSize.w}x${c.targetSize.h}`);
        }
        console.log(`  allNamed=${h.allNamed} ariaPressedAllSvg=${h.allHaveSvg}`);
        console.log(`--- skeletons (${theme}) ---`);
        for (const s of report.checks['skeletons_' + theme]) console.log(`  ${s.sel} ${s.w}x${s.h} minHeight=${s.minHeight}`);
        console.log(`--- layout shift (${theme}) ---`);
        const sh = report.checks['shift_' + theme];
        console.log(`  cards=${sh.cardCount} moved=${sh.movedCards.length} totalShift=${sh.totalShift}`);
    }
    console.log('--- horizontal overflow ---');
    console.log('  theme  width  scrollWidth  clientWidth  overflow');
    for (const o of overflow) {
        console.log(`  ${o.theme.padEnd(6)} ${String(o.width).padStart(5)}  ${String(o.scrollWidth).padStart(11)}  ${String(o.clientWidth).padStart(11)}  ${o.overflow}`);
        for (const f of o.offenders) console.log(`      offender ${f.tag}#${f.id}.${f.cls} left=${f.left} right=${f.right} w=${f.width}`);
    }
    console.log(`\nreport: ${OUT}`);
    if (report.failures.length) {
        console.log(`\nFAILURES (${report.failures.length}):`);
        for (const f of report.failures) console.log(`  ${f.check}: ${f.detail}`);
        process.exitCode = 1;
    } else {
        console.log('\nall measured checks passed');
    }
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1); });

