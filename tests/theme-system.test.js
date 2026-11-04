import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

function makeLocalStorage() {
    const store = new Map();
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
        _map: store,
    };
}

function loadThemeSystem(ls) {
    const src = readFileSync(join(ROOT, 'assets/theme-system.js'), 'utf8');
    const body = src.replace(
        /if \(document\.readyState === 'loading'\)[\s\S]*\}\s*\}\s*$/,
        ''
    );
    global.document = {
        documentElement: { style: { setProperty: () => {} } },
        querySelector: () => null,
        body: { appendChild: () => {} },
        addEventListener: () => {},
    };
    global.window = {
        localStorage: ls,
        userPrefs: undefined,
        haptic: undefined,
        UIPolish: undefined,
        addEventListener: () => {},
    };
    global.localStorage = ls;
    const factory = new Function('document', 'window', body + '\nreturn ThemeSystem;');
    return factory(global.document, global.window);
}

describe('theme system', () => {
    let ThemeSystem;
    let ls;

    beforeEach(() => {
        ls = makeLocalStorage();
        ThemeSystem = loadThemeSystem(ls);
    });

    it('defines four themes: dark, midnight, cyberpunk, ocean', () => {
        const inst = new ThemeSystem();
        expect(Object.keys(inst.themes)).toEqual([
            'dark', 'midnight', 'cyberpunk', 'ocean',
        ]);
        for (const theme of Object.values(inst.themes)) {
            expect(typeof theme.name).toBe('string');
            expect(typeof theme.primary).toBe('string');
            expect(typeof theme.accent).toBe('string');
        }
    });

    it('defaults to dark theme when nothing stored', () => {
        const inst = new ThemeSystem();
        expect(inst.currentTheme).toBe('dark');
    });

    it('loads a stored theme from localStorage', () => {
        ls.setItem('theme_guest', 'ocean');
        const inst = new ThemeSystem();
        expect(inst.currentTheme).toBe('ocean');
    });

    it('switchTheme persists the new theme to localStorage', () => {
        const inst = new ThemeSystem();
        inst.switchTheme('cyberpunk');
        expect(inst.currentTheme).toBe('cyberpunk');
        expect(ls.getItem('theme_guest')).toBe('cyberpunk');
    });

    it('applyTheme does not throw for unknown theme', () => {
        const inst = new ThemeSystem();
        expect(() => inst.applyTheme('nonexistent')).not.toThrow();
        expect(inst.currentTheme).toBe('dark'); // unchanged
    });
});
