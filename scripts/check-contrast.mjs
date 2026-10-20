// ===== STAGE 2 CONTRAST CHECKER =====
// Reads resolved colors from style.css custom properties for both themes and
// verifies the text/background pairs Stage 2 adds. Pairs are chosen as
// (foreground token, background token, minRatio, tier-used-in).
//
// Usage: node scripts/check-contrast.mjs [--break] > evidence/stage-2/CONTRAST.json
//   --break injects a bogus dark value for --text-primary to prove the checker
//   goes red when a token breaks (exit code 1, failing rows listed).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Every pair below is a combination this build renders. Ratios use WCAG 2.1
// relative luminance. AA text (>= 18.66px bold or >= 24px) needs 3:1, normal
// text needs 4.5:1; the checker enforces the listed min.
const PAIRS = [
    { name: 'body text / canvas (dark)', fg: '--text-primary', bg: '--bg-canvas', min: 4.5 },
    { name: 'body text / canvas (light)', fg: '--text-primary', bg: '--bg-canvas', min: 4.5, theme: 'light' },
    { name: 'secondary text / surface (dark)', fg: '--text-secondary', bg: '--bg-surface', min: 4.5 },
    { name: 'secondary text / surface (light)', fg: '--text-secondary', bg: '--bg-surface', min: 4.5, theme: 'light' },
    { name: 'card title / card (dark)', fg: '--text-primary', bg: '--bg-card', min: 4.5 },
    { name: 'card title / card (light)', fg: '--text-primary', bg: '--bg-card', min: 4.5, theme: 'light' },
    { name: 'category label / card (dark)', fg: '--text-secondary', bg: '--bg-card', min: 4.5 },
    { name: 'category label / card (light)', fg: '--text-secondary', bg: '--bg-card', min: 4.5, theme: 'light' },
    { name: 'hero description / surface (dark)', fg: '--text-secondary', bg: '--bg-surface', min: 4.5 },
    { name: 'hero description / surface (light)', fg: '--text-secondary', bg: '--bg-surface', min: 4.5, theme: 'light' },
    { name: 'accent button text / accent bg (dark)', fg: '#07090e', bg: '--accent-primary', min: 4.5 },
    { name: 'accent text / surface (dark)', fg: '--accent-primary', bg: '--bg-surface', min: 4.5 },
    { name: 'auth note text / elevated (dark)', fg: '--text-secondary', bg: '--bg-elevated', min: 4.5 },
    { name: 'auth note text / elevated (light)', fg: '--text-secondary', bg: '--bg-elevated', min: 4.5, theme: 'light' },
    { name: 'footer copy / surface (dark)', fg: '--text-secondary', bg: '--bg-surface', min: 4.5 },
    { name: 'footer copy / surface (light)', fg: '--text-secondary', bg: '--bg-surface', min: 4.5, theme: 'light' },
    { name: 'muted text / canvas (dark)', fg: '--text-muted', bg: '--bg-canvas', min: 4.5 },
    { name: 'muted text / canvas (light)', fg: '--text-muted', bg: '--bg-canvas', min: 4.5, theme: 'light' },
    { name: 'muted text / active row (dark)', fg: '--text-muted', bg: '--bg-active', min: 4.5 },
    { name: 'muted text / active row (light)', fg: '--text-muted', bg: '--bg-active', min: 4.5, theme: 'light' },
    { name: 'muted text / card (dark)', fg: '--text-muted', bg: '--bg-card', min: 4.5 },
    { name: 'muted text / card (light)', fg: '--text-muted', bg: '--bg-card', min: 4.5, theme: 'light' },
    { name: 'on-accent / accent fill (dark)', fg: '--on-accent-primary', bg: '--accent-primary', min: 4.5 },
    { name: 'on-accent / accent fill (light)', fg: '--on-accent-primary', bg: '--accent-primary', min: 4.5, theme: 'light' },
    { name: 'on-accent / secondary fill (dark)', fg: '--on-accent-secondary', bg: '--accent-secondary', min: 4.5 },
    { name: 'on-accent / secondary fill (light)', fg: '--on-accent-secondary', bg: '--accent-secondary', min: 4.5, theme: 'light' }]

// NOTE: --text-muted is now covered above in both themes. Before this stage
// fixed the token it read #64748b and failed on --bg-active (2.87:1 dark)
// and on --bg-canvas in light (4.47:1).

function parseThemeVars(css, theme) {
    const vars = {};
    const grab = (re) => {
        const m = re.exec(css);
        if (!m) return;
        for (const mm of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
            vars[mm[1].trim()] = mm[2].trim();
        }
    };
    if (theme === 'dark') grab(/:root\s*\{([\s\S]*?)\}/);
    else grab(/\[data-theme="light"\]\s*\{([\s\S]*?)\}|:root\s*\[data-theme="light"\]\s*\{([\s\S]*?)\}|\[data-theme=light\]\s*\{([\s\S]*?)\}/);
    return vars;
}

function hexToRgb(hex) {
    let h = hex.replace('#', '').trim();
    if (h.length === 3) h = [...h].map(c => c + c).join('');
    if (!/^[\da-fA-F]{6}$/.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function lum(rgb) {
    const f = v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}

function ratio(a, b) {
    const l1 = lum(a), l2 = lum(b);
    const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
    return (hi + 0.05) / (lo + 0.05);
}

function resolve(spec, vars) {
    if (spec.startsWith('#')) return spec;
    let v = vars[spec];
    if (!v) return null;
    // one level of var() indirection is enough for this token set
    const m = /^var\((--[\w-]+)\)/.exec(v);
    if (m) v = vars[m[1]];
    return v || null;
}

const css = readFileSync(join(ROOT, 'style.css'), 'utf8');
const darkVars = parseThemeVars(css, 'dark');
const lightVars = parseThemeVars(css, 'light');
if (process.argv.includes('--break')) {
    darkVars['--text-primary'] = '#1a1d24'; // near-background gray: must fail
}
const rows = [];
for (const p of PAIRS) {
    const theme = p.theme || 'dark';
    const vars = theme === 'dark' ? darkVars : lightVars;
    const fgHex = resolve(p.fg, vars);
    const bgHex = resolve(p.bg, vars);
    const fg = fgHex ? hexToRgb(fgHex) : null;
    const bg = bgHex ? hexToRgb(bgHex) : null;
    if (!fg || !bg) {
        rows.push({ ...p, status: 'UNRESOLVED', fgHex, bgHex, ratio: null, pass: false });
        continue;
    }
    const r = ratio(fg, bg);
    rows.push({ ...p, fgHex, bgHex, ratio: Math.round(r * 100) / 100, status: r >= p.min ? 'PASS' : 'FAIL', pass: r >= p.min });
}
const fails = rows.filter(r => !r.pass);
const report = { tool: 'node scripts/check-contrast.mjs', pairs: rows.length, passed: rows.length - fails.length, failed: fails.length, rows };
mkdirSync(join(ROOT, 'evidence', 'stage-2'), { recursive: true });
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
if (fails.length) process.exitCode = 1;
