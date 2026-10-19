// ===== CARD THUMBNAIL CAPTURE =====
// Drives a real Chromium (Playwright) against a local static server and
// captures each simulation's default frame into assets/card-thumbs/<id>.webp.
//
// Usage: node scripts/capture-thumbs.js [baseUrl]
//   baseUrl defaults to http://localhost:8123/index.html
//   Serve the repo root first: python3 -m http.server 8123
//
// Method: open ?sim=<id> for every id in assets/simulations-data.js, wait for
// the simulation canvas to paint, take a full-page screenshot and crop to the
// canvas bounding box (compositor snapshot, so WebGL canvases without
// preserveDrawingBuffer still capture), then downscale to 480 px wide and
// write webp at the highest quality under 15360 bytes. A manifest with id,
// bytes, and size is written to evidence/card-thumbs/MANIFEST.json.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'card-thumbs');
const MANIFEST_DIR = path.join(ROOT, 'evidence', 'card-thumbs');
const MAX_BYTES = 15360;
const THUMB_W = 480;
const DWELL_MS = 2600;

function catalogIds() {
    const src = fs.readFileSync(path.join(ROOT, 'assets', 'simulations-data.js'), 'utf8');
    const ids = [...src.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);
    return [...new Set(ids)];
}

async function captureOne(browser, baseUrl, id) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const problems = [];
    page.on('console', m => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
    page.on('pageerror', e => problems.push('pageerror: ' + e.message));
    await page.goto(baseUrl + '?sim=' + encodeURIComponent(id), { waitUntil: 'networkidle' });
    let box = null;
    try {
        await page.waitForSelector('#simulation-canvas canvas', { timeout: 20000 });
        await page.waitForTimeout(DWELL_MS);
        box = await page.locator('#simulation-canvas canvas').first().boundingBox();
    } catch (e) {
        problems.push('no canvas: ' + e.message.split('\n')[0]);
    }
    let out = null;
    if (box && box.width > 4 && box.height > 4) {
        const shot = await page.screenshot();
        let quality = 82;
        let buf = null;
        for (const q of [82, 72, 62, 52, 42]) {
            buf = await sharp(shot)
                .extract({ left: Math.max(0, Math.round(box.x)), top: Math.max(0, Math.round(box.y)), width: Math.max(1, Math.round(box.width)), height: Math.max(1, Math.round(box.height)) })
                .resize({ width: THUMB_W })
                .webp({ quality: q })
                .toBuffer();
            quality = q;
            if (buf.length <= MAX_BYTES) break;
        }
        const dest = path.join(OUT_DIR, id + '.webp');
        fs.writeFileSync(dest, buf);
        const m = await sharp(dest).metadata();
        out = { id, bytes: buf.length, width: m.width, height: m.height, quality, under15kb: buf.length <= MAX_BYTES, problems };
    } else {
        out = { id, bytes: 0, width: 0, height: 0, quality: 0, under15kb: false, problems };
    }
    await page.close();
    return out;
}

async function main() {
    const baseUrl = process.argv[2] || 'http://localhost:8123/index.html';
    const ids = catalogIds();
    console.log('capturing', ids.length, 'ids from catalog at', baseUrl);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.mkdirSync(MANIFEST_DIR, { recursive: true });
    const browser = await chromium.launch();
    const rows = [];
    for (const id of ids) {
        const r = await captureOne(browser, baseUrl, id);
        rows.push(r);
        console.log(r.id, r.bytes + 'B', r.width + 'x' + r.height, 'q' + r.quality, r.under15kb ? 'OK' : 'OVER', r.problems.length ? '| ' + r.problems.join(' ; ').slice(0, 160) : '');
    }
    await browser.close();
    const manifest = { generatedBy: 'node scripts/capture-thumbs.js', baseUrl, maxBytes: MAX_BYTES, thumbWidth: THUMB_W, rows };
    fs.writeFileSync(path.join(MANIFEST_DIR, 'MANIFEST.json'), JSON.stringify(manifest, null, 2));
    const over = rows.filter(r => !r.under15kb).map(r => r.id);
    console.log('done:', rows.filter(r => r.under15kb).length + '/' + rows.length, 'under 15 KB', over.length ? ('OVER: ' + over.join(',')) : '');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
