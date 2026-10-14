// Fetch the public-domain planet maps used by the 3D solar system sim, verify
// each licence through the Wikimedia Commons API, convert to webp, and write a
// provenance record. No asset is used without a licence string and an author.
//
//   node scripts/fetch-planet-maps.mjs            # fetch missing files only
//   node scripts/fetch-planet-maps.mjs --force    # re-fetch everything
//
// Output: assets/textures/planets/*.webp and assets/textures/planets/PROVENANCE.json
//
// Run once; the webp files are committed so the site never fetches from the
// network at runtime.

import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets/textures/planets');
const TMP_DIR = path.join(ROOT, '.tmp-planet-maps');
const FORCE = process.argv.includes('--force');

// Equirectangular maps. `width` is the stored width: 2K for the bodies a
// visitor looks at closely, 1K for the rest (see SOURCES.md for the budget).
const WANTED = [
  { slug: 'earth-day',    title: 'Solarsystemscope texture 2k earth daymap.jpg',     width: 2048, kind: 'albedo' },
  { slug: 'earth-night',  title: 'Solarsystemscope texture 2k earth nightmap.jpg',   width: 2048, kind: 'emissive' },
  { slug: 'mars',         title: 'Solarsystemscope texture 2k mars.jpg',            width: 2048, kind: 'albedo' },
  { slug: 'jupiter',      title: 'Solarsystemscope texture 2k jupiter.jpg',         width: 2048, kind: 'albedo' },
  { slug: 'saturn',       title: 'Solarsystemscope texture 2k saturn.jpg',          width: 1024, kind: 'albedo' },
  { slug: 'saturn-ring',  title: 'Solarsystemscope texture 2k saturn ring alpha.png', width: 1024, kind: 'ring' },
  { slug: 'mercury',      title: 'Solarsystemscope texture 2k mercury.jpg',          width: 1024, kind: 'albedo' },
  { slug: 'venus',        title: 'Solarsystemscope texture 2k venus surface.jpg',    width: 1024, kind: 'albedo' },
  { slug: 'uranus',       title: 'Solarsystemscope texture 2k uranus.jpg',           width: 1024, kind: 'albedo' },
  { slug: 'neptune',      title: 'Solarsystemscope texture 2k neptune.jpg',          width: 1024, kind: 'albedo' },
  { slug: 'moon',         title: 'Solarsystemscope texture 2k moon.jpg',             width: 1024, kind: 'albedo' },
  { slug: 'sun',          title: 'Solarsystemscope texture 2k sun.jpg',              width: 1024, kind: 'albedo' }
];

const UA = 'visiq-asset-fetch/1.0 (https://github.com/toibawani/Visiq; local build script)';

function stripTags(html) {
  return String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function commonsInfo(titles) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json'
    + '&prop=imageinfo&iiprop=url|size|extmetadata|sha1&titles='
    + encodeURIComponent(titles.map((t) => 'File:' + t).join('|'));
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`commons API HTTP ${res.status}`);
  const json = await res.json();
  const out = new Map();
  for (const page of Object.values(json.query.pages)) {
    if (page.missing !== undefined) continue;
    const info = (page.imageinfo || [])[0] || {};
    const meta = info.extmetadata || {};
    out.set(page.title.replace(/^File:/, ''), {
      url: info.url,
      width: info.width,
      height: info.height,
      bytes: info.size,
      sha1: info.sha1,
      license: stripTags(meta.LicenseShortName && meta.LicenseShortName.value),
      licenseUrl: stripTags(meta.LicenseUrl && meta.LicenseUrl.value),
      author: stripTags(meta.Artist && meta.Artist.value),
      credit: stripTags(meta.Credit && meta.Credit.value),
      descriptionUrl: info.descriptionurl
    });
  }
  return out;
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(TMP_DIR, { recursive: true });

  const info = await commonsInfo(WANTED.map((w) => w.title));
  const provenance = [];

  for (const want of WANTED) {
    const meta = info.get(want.title);
    if (!meta) throw new Error(`no Commons record for ${want.title}`);
    if (!/CC0|Public domain|CC BY 4\.0/i.test(meta.license)) {
      throw new Error(`licence not accepted for ${want.title}: "${meta.license}"`);
    }
    if (!meta.author) throw new Error(`no author recorded for ${want.title}`);

    const outPath = path.join(OUT_DIR, `${want.slug}.webp`);
    if (existsSync(outPath) && !FORCE) {
      const existing = JSON.parse(await readFile(path.join(OUT_DIR, 'PROVENANCE.json'), 'utf8')).textures
        .find((t) => t.slug === want.slug);
      if (existing) { provenance.push(existing); console.log(`skip ${want.slug} (already present)`); continue; }
    }

    const rawPath = path.join(TMP_DIR, `${want.slug}${path.extname(new URL(meta.url).pathname)}`);
    const res = await fetch(meta.url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`download ${want.title} HTTP ${res.status}`);
    const raw = Buffer.from(await res.arrayBuffer());
    await writeFile(rawPath, raw);

    const isRing = want.kind === 'ring';
    const pipeline = sharp(rawPath).resize({ width: want.width, withoutEnlargement: false });
    // The ring strip keeps its alpha channel; the body maps are opaque.
    const webp = isRing
      ? await pipeline.webp({ quality: 88, alphaQuality: 90 }).toBuffer()
      : await pipeline.flatten({ background: '#000000' }).webp({ quality: 82 }).toBuffer();
    await writeFile(outPath, webp);

    const outMeta = await sharp(outPath).metadata();
    provenance.push({
      slug: want.slug,
      usedFor: want.kind,
      file: `assets/textures/planets/${want.slug}.webp`,
      storedPx: `${outMeta.width}x${outMeta.height}`,
      storedBytes: webp.length,
      sourceTitle: want.title,
      sourceUrl: meta.descriptionUrl,
      fileUrl: meta.url,
      sourcePx: `${meta.width}x${meta.height}`,
      sourceBytes: meta.bytes,
      sourceSha1: meta.sha1,
      license: meta.license,
      licenseUrl: meta.licenseUrl,
      author: meta.author,
      credit: meta.credit,
      sha256: sha256(webp),
      fetched: new Date().toISOString().slice(0, 10)
    });
    console.log(`${want.slug}: ${meta.width}x${meta.height} ${(meta.bytes / 1024).toFixed(0)}KB -> `
      + `${outMeta.width}x${outMeta.height} ${(webp.length / 1024).toFixed(0)}KB (${meta.license})`);
  }

  const totalBytes = provenance.reduce((a, t) => a + t.storedBytes, 0);
  const doc = {
    note: 'Generated by scripts/fetch-planet-maps.mjs. Do not hand-edit.',
    license: 'CC BY 4.0 - attribution required, see SOURCES.md',
    author: 'Solar System Scope',
    authorUrl: 'https://www.solarsystemscope.com/textures/',
    totalStoredBytes: totalBytes,
    textures: provenance
  };
  await writeFile(path.join(OUT_DIR, 'PROVENANCE.json'), JSON.stringify(doc, null, 2) + '\n');
  await rm(TMP_DIR, { recursive: true, force: true });
  console.log(`\n${provenance.length} textures, ${(totalBytes / 1024).toFixed(0)} KB webp total`);
}

await main();
