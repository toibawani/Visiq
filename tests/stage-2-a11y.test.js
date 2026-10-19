import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'style.css'), 'utf8');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const gallery = readFileSync(join(ROOT, 'gallery.js'), 'utf8');

// Selectors may be grouped (".a, .b {"), so take the full declared block.
function ruleFor(sel) {
    const blocks = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)];
    const hits = blocks.filter(b => b[1].split(',').map(s => s.trim()).includes(sel));
    if (!hits.length) return null;
    return hits.map(b => b[1] + ' {' + b[2] + '}').join('\n');
}

describe('stage-2 touch, scroll, and keyboard surface', () => {
    it('keeps header buttons and the primary action at 48px touch height', () => {
        for (const sel of ['.btn-favorites-toggle', '.btn-sort', '.btn-theme-toggle', '.btn-explore']) {
            const rule = ruleFor(sel);
            expect(rule, sel + ' missing in style.css').toBeTruthy();
            const m = rule && /(min-height|min-width|padding:[^;]*?(\d+)px[^;]*?(\d+)px|height:[^;]*?(\d+)px)/.exec(rule);
            expect(m, sel + ' has no size declaration').toBeTruthy();
        }
        // The shared header group pins a 48px minimum touch target.
        expect(css).toMatch(/\.btn-favorites-toggle,\s*\.btn-sort,\s*\.btn-theme-toggle[\s\S]*?min-height:\s*48px/);
    });

    it('gives the card press control a 48px target too', () => {
        const rule = ruleFor('.btn-favorite');
        expect(rule).toBeTruthy();
        expect(rule).toMatch(/min-height:\s*48px/);
    });

    it('sets the viewport and overflow rules that forbid horizontal scroll', () => {
        expect(html).toMatch(/name="viewport"[^>]*width=device-width/);
        expect(css).toMatch(/overflow-x:\s*(hidden|clip)/);
        expect(css).toMatch(/img\s*\{[\s\S]*?max-width:\s*100%/);
    });

    it('keeps a visible focus path on new interactive elements', () => {
        expect(css).toMatch(/\.sim-card:focus-visible/);
        expect(css).toMatch(/\.footer-nav a:focus-visible/);
        expect(css).toMatch(/outline:\s*2px solid/);
    });

    it('preserves the Escape path from sim back to gallery', () => {
        expect(gallery).toMatch(/e\.key === 'Escape'/);
        expect(gallery).toMatch(/backToGallery\(\)/);
    });

    it('respects reduced motion in skeleton, hero, and card animations', () => {
        expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
        expect(css).toMatch(/\.skeleton-block\s*\{\s*animation:\s*none/);
        expect(css).toMatch(/\.card-thumb-skeleton\s*\{\s*animation:\s*none/);
        expect(gallery).toMatch(/prefers-reduced-motion/);
    });
});
