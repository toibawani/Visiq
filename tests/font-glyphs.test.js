import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'style.css'), 'utf8');

// Every @font-face that points at a self-hosted woff2, parsed to
// { family, file, ranges:[{lo,hi}] }.
function parseFaces() {
    const faces = [];
    for (const block of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
        const body = block[1];
        const fam = /font-family:\s*'([^']+)'/.exec(body);
        const src = /url\(['"]?([^'")]+\.woff2)['"]?\)/.exec(body);
        const ur = /unicode-range:\s*([^;]+);/.exec(body);
        if (!fam || !src || !ur) continue;
        const ranges = [];
        for (const tok of ur[1].split(',')) {
            const t = tok.trim();
            const [lo, hi] = t.split('-');
            ranges.push({
                lo: parseInt(lo.replace(/^U\+/, ''), 16),
                hi: hi ? parseInt(hi.replace(/^U\+/, ''), 16) : parseInt(lo.replace(/^U\+/, ''), 16),
            });
        }
        faces.push({ family: fam[1], file: src[1], ranges });
    }
    return faces;
}

// Does codepoint cp fall in any range this @font-face claims?
function claimsCp(face, cp) {
    return face.ranges.some((r) => cp >= r.lo && cp <= r.hi);
}

// Read the real cmap of a shipped woff2 using Python fontTools (already a dev
// dependency of the build tooling). Returns a Set of codepoints. We avoid a new
// npm font-parsing dependency by shelling out to fonttools, which is present.
function cmapFor(relPath) {
    const py = [
        'import sys',
        'from fontTools.ttLib import TTFont',
        'f = TTFont(sys.argv[1])',
        'cm = f.getBestCmap()',
        'print(",".join(str(c) for c in sorted(cm)))',
    ].join('\n');
    const out = execFileSync('python3', ['-c', py, join(ROOT, relPath)], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
    });
    return new Set(out.trim().split(',').filter(Boolean).map((s) => parseInt(s, 10)));
}

function glyphAvailable(cmap, cp) {
    return cmap.has(cp);
}

describe('self-hosted font glyph coverage (style.css @font-face vs shipped woff2)', () => {
    it('never claims a codepoint the file cannot render (no tofu from unicode-range)', () => {
        const faces = parseFaces();
        expect(faces.length).toBeGreaterThanOrEqual(6);
        for (const face of faces) {
            const cmap = cmapFor(face.file);
            // Check a representative sample of each claimed range (full sweep is
            // large; endpoints + a few interior points catch subset mistakes).
            const samples = new Set();
            for (const r of face.ranges) {
                samples.add(r.lo);
                samples.add(r.hi);
                if (r.hi - r.lo <= 8) {
                    for (let c = r.lo; c <= r.hi; c++) samples.add(c);
                } else {
                    for (let k = 1; k < 8; k++) samples.add(r.lo + Math.floor((k * (r.hi - r.lo)) / 8));
                }
            }
            // U+0000 (NUL) is a control char, not a rendered glyph; subset fonts
            // legitimately omit it even though the CSS range starts at U+0000.
            samples.delete(0);
            for (const cp of samples) {
                // Skip C0 (U+0000-001F) and C1 (U+007F-009F) control chars —
                // they are never rendered glyphs, so a subset font omits them
                // even when the CSS range spans U+0000-00FF.
                if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) continue;
                expect(
                    glyphAvailable(cmap, cp),
                    `${face.family} (${face.file}) claims U+${cp.toString(16).toUpperCase()} but has no glyph`,
                ).toBe(true);
            }
        }
    });

    it('routes the required symbols to a file that contains them', () => {
        const required = {
            '°': 0x00b0, '²': 0x00b2, '³': 0x00b3, '×': 0x00d7, '÷': 0x00f7,
            '±': 0x00b1, 'π': 0x03c0, '√': 0x221a, '⇄': 0x21c4, 'µ': 0x00b5,
            '‰': 0x2030, '≈': 0x2248, '→': 0x2192, '…': 0x2026, '–': 0x2013,
            '—': 0x2014, '’': 0x2019, '“': 0x201c, '”': 0x201d,
        };
        const faces = parseFaces();
        const fonts = new Map();
        for (const face of faces) {
            if (!fonts.has(face.file)) fonts.set(face.file, cmapFor(face.file));
        }
        for (const [ch, cp] of Object.entries(required)) {
            const routing = faces.filter((f) => claimsCp(f, cp));
            expect(routing.length, `no @font-face claims ${ch} U+${cp.toString(16)}`).toBeGreaterThan(0);
            for (const face of routing) {
                expect(
                    glyphAvailable(fonts.get(face.file), cp),
                    `${face.family} claims ${ch} but file lacks the glyph`,
                ).toBe(true);
            }
        }
    });
});
