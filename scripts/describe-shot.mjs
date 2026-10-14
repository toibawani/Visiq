// Print a coarse luminance map and the brightest regions of a screenshot, so a
// capture can be described from its pixels rather than from memory.
//
//   node scripts/describe-shot.mjs <png> [cols] [rows]

import sharp from 'sharp';

const file = process.argv[2];
const cols = parseInt(process.argv[3] || '72', 10);
const rows = parseInt(process.argv[4] || '30', 10);

// Optional crop: node scripts/describe-shot.mjs <png> <cols> <rows> [x y w h]
const crop = process.argv.slice(5, 9).map(Number);
const img = sharp(file);
const meta = await img.metadata();
let pipe = img.clone();
if (crop.length === 4 && crop.every((n) => Number.isFinite(n))) {
    pipe = pipe.extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] });
}
const { data, info } = await pipe
    .resize(cols, rows, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

const lum = [];
const cells = [];
for (let y = 0; y < info.height; y++) {
    const line = [];
    for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * 3;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        line.push(l);
        cells.push({ x, y, r, g, b, l });
    }
    lum.push(line);
}

const ramp = ' .:-=+*#%@';
console.log(`${file}  ${meta.width}x${meta.height}  (each cell is ${Math.round(meta.width / cols)}x${Math.round(meta.height / rows)} px)`);
console.log('luminance map, dark to bright:');
for (const line of lum) {
    console.log('|' + line.map((l) => ramp[Math.min(ramp.length - 1, Math.floor(l / 25.6))]).join('') + '|');
}

const all = cells.map((c) => c.l).sort((a, b) => a - b);
const pick = (q) => Math.round(all[Math.floor(q * (all.length - 1))]);
console.log(`luminance: min ${Math.round(all[0])}, p10 ${pick(0.1)}, median ${pick(0.5)}, p90 ${pick(0.9)}, max ${Math.round(all[all.length - 1])}`);
const mean = all.reduce((a, b) => a + b, 0) / all.length;
console.log(`mean ${mean.toFixed(1)}`);

const bright = cells.slice().sort((a, b) => b.l - a.l).slice(0, 6);
console.log('brightest cells (col,row of the map, rgb, luminance):');
for (const c of bright) {
    console.log(`  map(${c.x},${c.y}) rgb(${c.r},${c.g},${c.b}) l=${c.l.toFixed(0)}`);
}

// Column and row profiles of the *canvas* half of the image only, so page
// chrome does not dominate. The canvas is the lower two thirds in these shots.
console.log('mean luminance by map row:');
console.log('  ' + lum.map((line) => Math.round(line.reduce((a, b) => a + b, 0) / line.length)).join(' '));
