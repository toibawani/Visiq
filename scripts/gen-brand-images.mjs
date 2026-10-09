#!/usr/bin/env node
/**
 * Generate real PNG brand assets with sharp (no external image tools needed):
 *   - og-image.png         1200x630  (Open Graph / Twitter card)
 *   - assets/icon-192.png  192x192   (PWA any)
 *   - assets/icon-512.png  512x512   (PWA any)
 *   - assets/icon-maskable-512.png 512x512 (PWA maskable, safe-zone padding)
 *   - assets/favicon-32.png 32x32
 *   - assets/apple-touch-icon.png 180x180
 * The SVG uses the app's real palette from style.css.
 *
 * Run: node scripts/gen-brand-images.mjs
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Palette (from style.css :root)
const BG = '#07090e';
const SURFACE = '#0c0f17';
const PRIMARY = '#e8a04c';
const PHYSICS = '#00e5ff';
const BIOLOGY = '#10b981';
const GEO = '#f59e0b';
const ASTRO = '#fbbf24';
const TEXT = '#f1f5f9';

// A subtle orbit / ring motif drawn with strokes, echoing the physics theme.
function ogSVG(w, h) {
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BG}"/>
      <stop offset="1" stop-color="#101625"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${PHYSICS}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${PHYSICS}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <circle cx="${w * 0.82}" cy="${h * 0.5}" r="${h * 0.55}" fill="url(#glow)"/>
  <!-- concentric orbit rings -->
  <g fill="none" stroke="${PHYSICS}" stroke-opacity="0.25">
    <ellipse cx="${w * 0.82}" cy="${h * 0.5}" rx="${h * 0.30}" ry="${h * 0.16}"/>
    <ellipse cx="${w * 0.82}" cy="${h * 0.5}" rx="${h * 0.42}" ry="${h * 0.24}" stroke-opacity="0.15"/>
  </g>
  <!-- orbiting bodies -->
  <circle cx="${w * 0.82}" cy="${h * 0.5}" r="26" fill="${PRIMARY}"/>
  <circle cx="${w * 0.82 + h * 0.30}" cy="${h * 0.5}" r="9" fill="${BIOLOGY}"/>
  <circle cx="${w * 0.82 - h * 0.42}" cy="${h * 0.42}" r="7" fill="${ASTRO}"/>
  <!-- wordmark -->
  <text x="72" y="${h * 0.5 - 8}" font-family="Georgia, serif" font-weight="700"
        font-size="132" fill="${TEXT}" letter-spacing="2">VISIQ</text>
  <text x="76" y="${h * 0.5 + 54}" font-family="Helvetica, Arial, sans-serif"
        font-size="34" fill="#94a3b8" letter-spacing="6">INTERACTIVE SCIENCE VISUALIZATIONS</text>
  <!-- category accent bar -->
  <g>
    <rect x="76" y="${h - 96}" width="54" height="10" rx="5" fill="${PHYSICS}"/>
    <rect x="140" y="${h - 96}" width="54" height="10" rx="5" fill="${BIOLOGY}"/>
    <rect x="204" y="${h - 96}" width="54" height="10" rx="5" fill="${GEO}"/>
    <rect x="268" y="${h - 96}" width="54" height="10" rx="5" fill="${ASTRO}"/>
  </g>
  <text x="76" y="${h - 52}" font-family="Helvetica, Arial, sans-serif"
        font-size="26" fill="#64748b">Physics · Biology · Geography · Astronomy</text>
</svg>`;
}

// Square icon: monogram "V" inside a rounded-square with orbit motif.
function iconSVG(size, maskable = false) {
    const pad = maskable ? size * 0.2 : 0; // keep art in the safe zone
    const inner = size - pad * 2;
    const cx = size / 2;
    const cy = size / 2;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${SURFACE}"/>
      <stop offset="1" stop-color="#101625"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${maskable ? 0 : size * 0.22}" fill="url(#g)"/>
  <g transform="translate(${pad},${pad})">
    <ellipse cx="${inner / 2}" cy="${inner / 2}" rx="${inner * 0.40}" ry="${inner * 0.22}"
             fill="none" stroke="${PHYSICS}" stroke-opacity="0.5" stroke-width="${inner * 0.03}"/>
    <circle cx="${inner * 0.86}" cy="${inner * 0.42}" r="${inner * 0.05}" fill="${PRIMARY}"/>
    <text x="${inner / 2}" y="${inner * 0.72}" text-anchor="middle"
          font-family="Georgia, serif" font-weight="700" font-size="${inner * 0.62}"
          fill="${TEXT}">V</text>
  </g>
</svg>`;
}

async function main() {
    await mkdir(join(ROOT, 'assets'), { recursive: true });
    const jobs = [
        ['og-image.png', Buffer.from(ogSVG(1200, 630)), 1200, 630],
        ['assets/icon-192.png', Buffer.from(iconSVG(192)), 192, 192],
        ['assets/icon-512.png', Buffer.from(iconSVG(512)), 512, 512],
        ['assets/icon-maskable-512.png', Buffer.from(iconSVG(512, true)), 512, 512],
        ['assets/favicon-32.png', Buffer.from(iconSVG(32)), 32, 32],
        ['assets/apple-touch-icon.png', Buffer.from(iconSVG(180)), 180, 180],
    ];
    for (const [rel, svg, w, h] of jobs) {
        await sharp(svg).png().toFile(join(ROOT, rel));
        console.log('wrote', rel, `${w}x${h}`);
    }
    // Also emit a favicon.svg (vector, scales crisply in modern browsers)
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(ROOT, 'assets/favicon.svg'), iconSVG(64));
    console.log('wrote assets/favicon.svg');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
